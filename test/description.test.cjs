'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { node, props, PostUploadTrigger } = require('./helpers.cjs');

test('node metadata stays valid for n8n and its verification', () => {
	const d = node.description;
	assert.equal(d.name, 'postUpload');
	assert.equal(d.usableAsTool, true);
	assert.deepEqual(d.credentials, [{ name: 'postUploadApi', required: true }]);
	assert.ok(d.icon.light && d.icon.dark, 'light and dark icons');
	const t = new PostUploadTrigger().description;
	assert.equal(t.name, 'postUploadTrigger');
	assert.deepEqual(t.group, ['trigger']);
	assert.equal(t.webhooks[0].httpMethod, 'POST');
});

test('options are sorted alphabetically (n8n UX guideline)', () => {
	for (const p of props.filter((x) => x.name === 'resource' || x.name === 'operation')) {
		const names = p.options.map((o) => o.name);
		assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), `${p.name} for ${JSON.stringify(p.displayOptions?.show)}`);
	}
});

test('earlier parameter names are kept, so existing workflows keep working', () => {
	const names = new Set(props.map((p) => p.name));
	for (const n of ['resource', 'operation', 'profile', 'platforms', 'title', 'description', 'videoSource', 'videoUrl', 'binaryPropertyName', 'photoSource', 'photoUrls', 'binaryPhotoProperties', 'additionalOptions', 'platformOptions', 'requestId', 'uploadId', 'limit', 'jobId', 'scheduledDate', 'newTitle', 'newDescription', 'editTimezone', 'analyticsProfile']) {
		assert.ok(names.has(n), `parameter ${n} still exists`);
	}
	const ops = (resource) => props.find((p) => p.name === 'operation' && p.displayOptions.show.resource.includes(resource)).options.map((o) => o.value);
	for (const [resource, list] of Object.entries({ upload: ['video', 'photos', 'text'], post: ['status', 'history', 'delete'], schedule: ['list', 'cancel', 'edit'], analytics: ['overview', 'profile'], profile: ['list', 'get', 'create', 'delete'] })) {
		for (const op of list) assert.ok(ops(resource).includes(op), `${resource}:${op} still exists`);
	}
});

test('secrets typed into the node are masked', () => {
	for (const n of ['webhookUrl', 'botToken', 'accessToken', 'wpAppPassword', 'blueskyAppPassword', 'linkToken']) {
		const p = props.find((x) => x.name === n);
		assert.equal(p.typeOptions && p.typeOptions.password, true, n);
	}
});
