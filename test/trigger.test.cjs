'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { PostUploadTrigger, signatureMatches } = require('./helpers.cjs');

const URL = 'https://n8n.test/webhook/abc';

function fakeApi() {
	const subs = { whs_old: { id: 'whs_old', url: URL } };
	const calls = [];
	return {
		subs,
		calls,
		async httpRequestWithAuthentication(credential, o) {
			calls.push(`${o.method} ${o.url.replace('https://api.test', '')}`);
			const id = o.url.split('/').pop();
			if (o.method === 'GET' && o.url.endsWith('/subscriptions')) return { statusCode: 200, body: { subscriptions: Object.values(subs) } };
			if (o.method === 'POST') {
				subs.whs_new = { id: 'whs_new', url: o.body.url, events: o.body.events, profile: o.body.profile || null };
				return { statusCode: 201, body: { subscription: { id: 'whs_new' }, secret: 's3cret' } };
			}
			if (!subs[id]) return { statusCode: 404, body: { error: 'Subscription not found' } };
			if (o.method === 'DELETE') { delete subs[id]; return { statusCode: 200, body: { success: true } }; }
			return { statusCode: 200, body: subs[id] };
		},
	};
}

function hookContext(api, params, staticData = {}) {
	return {
		staticData,
		getWorkflowStaticData: () => staticData,
		getNodeParameter: (n, d) => (n in params ? params[n] : d),
		getNodeWebhookUrl: () => URL,
		getWorkflow: () => ({ name: 'Failure alerts' }),
		getCredentials: async () => ({ baseUrl: 'https://api.test' }),
		getNode: () => ({ name: 'Post-Upload Trigger' }),
		logger: { warn() {} },
		helpers: { httpRequestWithAuthentication: api.httpRequestWithAuthentication },
	};
}

const trigger = new PostUploadTrigger();
const hooks = trigger.webhookMethods.default;

test('activation creates a subscription, stores its secret and removes stale ones on the same URL', async () => {
	const api = fakeApi();
	const ctx = hookContext(api, { events: ['upload.failed'], profile: 'brand' });
	assert.equal(await hooks.checkExists.call(ctx), false);
	assert.equal(await hooks.create.call(ctx), true);
	assert.equal(ctx.staticData.subscriptionId, 'whs_new');
	assert.equal(ctx.staticData.webhookSecret, 's3cret');
	assert.equal(api.subs.whs_old, undefined);
	assert.deepEqual(api.subs.whs_new, { id: 'whs_new', url: URL, events: ['upload.failed'], profile: 'brand' });
});

test('checkExists notices changed events or profile', async () => {
	const api = fakeApi();
	const params = { events: ['upload.failed'], profile: 'brand' };
	const ctx = hookContext(api, params);
	await hooks.create.call(ctx);
	assert.equal(await hooks.checkExists.call(ctx), true);
	params.events = ['upload.completed'];
	assert.equal(await hooks.checkExists.call(ctx), false);
	params.events = ['upload.failed'];
	params.profile = 'other';
	assert.equal(await hooks.checkExists.call(ctx), false);
});

test('deactivation deletes the subscription; an already deleted one is fine', async () => {
	const api = fakeApi();
	const ctx = hookContext(api, { events: ['upload.failed'] });
	await hooks.create.call(ctx);
	assert.equal(await hooks.delete.call(ctx), true);
	assert.equal(api.subs.whs_new, undefined);
	assert.equal(ctx.staticData.subscriptionId, undefined);
	ctx.staticData.subscriptionId = 'whs_gone';
	assert.equal(await hooks.delete.call(ctx), true);
});

test('signature check accepts the real signature only', () => {
	const raw = Buffer.from('{"event":"upload.failed"}');
	const sig = 'sha256=' + crypto.createHmac('sha256', 's3cret').update(raw).digest('hex');
	assert.equal(signatureMatches('s3cret', raw, sig), true);
	assert.equal(signatureMatches('s3cret', raw, sig.slice(0, -1) + '0'), false);
	assert.equal(signatureMatches('other', raw, sig), false);
	assert.equal(signatureMatches('', raw, sig), false);
	assert.equal(signatureMatches('s3cret', raw, ''), false);
});

function webhookContext(body, { header, events = ['upload.failed'], verify = true, secret = 's3cret' } = {}) {
	const state = {};
	return {
		state,
		getWorkflowStaticData: () => ({ webhookSecret: secret }),
		getNodeParameter: (n, d) => ({ events, verifySignature: verify }[n] ?? d),
		getBodyData: () => body,
		getRequestObject: () => ({ headers: header ? { 'x-post-upload-signature': header } : {}, rawBody: Buffer.from(JSON.stringify(body)) }),
		getResponseObject: () => ({ status: (s) => { state.status = s; return { json: (j) => { state.json = j; } }; } }),
		helpers: { returnJsonArray: (d) => [{ json: d }] },
	};
}
const sign = (body) => 'sha256=' + crypto.createHmac('sha256', 's3cret').update(JSON.stringify(body)).digest('hex');

test('a signed event of a selected type starts the workflow', async () => {
	const body = { event: 'upload.failed', upload_id: 'upl_1' };
	const res = await trigger.webhook.call(webhookContext(body, { header: sign(body) }));
	assert.equal(res.workflowData[0][0].json.upload_id, 'upl_1');
});

test('an unsigned or forged request gets 401 and does not start the workflow', async () => {
	const body = { event: 'upload.failed' };
	for (const header of [undefined, 'sha256=forged']) {
		const ctx = webhookContext(body, { header });
		const res = await trigger.webhook.call(ctx);
		assert.equal(res.noWebhookResponse, true);
		assert.equal(ctx.state.status, 401);
		assert.equal(res.workflowData, undefined);
	}
});

test('events that are not selected are acknowledged and ignored; test events pass', async () => {
	const other = { event: 'upload.completed' };
	let res = await trigger.webhook.call(webhookContext(other, { header: sign(other) }));
	assert.equal(res.workflowData, undefined);
	assert.equal(res.webhookResponse.ignored, true);
	const t = { event: 'test' };
	res = await trigger.webhook.call(webhookContext(t, { header: sign(t) }));
	assert.equal(res.workflowData[0][0].json.event, 'test');
});

test('verification can be turned off', async () => {
	const body = { event: 'upload.failed' };
	const res = await trigger.webhook.call(webhookContext(body, { verify: false }));
	assert.ok(res.workflowData);
});
