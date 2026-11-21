'use strict';
// Test helpers: run the built node (dist/) with a fake n8n context and a fake
// HTTP client, so every operation can be checked without network access.
const path = require('path');

const dist = path.join(__dirname, '..', 'dist', 'nodes');
const { PostUpload } = require(path.join(dist, 'PostUpload', 'PostUpload.node.js'));
const { PostUploadTrigger, signatureMatches } = require(path.join(dist, 'PostUploadTrigger', 'PostUploadTrigger.node.js'));

const node = new PostUpload();
const props = node.description.properties;

// Sample values for required parameters; everything else uses its default.
const SAMPLES = {
	profile: 'brand', analyticsProfile: 'brand', queueProfile: 'brand', platformProfile: 'brand', whitelabelProfile: 'brand',
	requestId: 'upl_req', uploadId: 'upl_1', jobId: 'job_1', ffmpegJobId: 'ff_1', subscriptionId: 'whs_1', postRequestId: 'upl_p',
	title: 'Hello', videoUrl: 'https://x.test/v.mp4', photoUrls: 'https://x.test/a.jpg\nhttps://x.test/b.jpg', platforms: ['discord'],
	livePlatforms: ['youtube'], slotTime: '2026-12-01T09:00:00Z', subscriptionUrl: 'https://n8n.test/hook', boardName: 'Board',
	watermarkText: 'Hi', commandUrls: 'https://x.test/v.mp4', linkToken: 'jwt', blueskyHandle: 'a.bsky.social', blueskyAppPassword: 'pw',
	webhookUrl: 'https://discord.test/x', accountWebhookUrl: 'https://hooks.test/x', month: '2026-12',
};

function visible(p, params) {
	const show = p.displayOptions && p.displayOptions.show;
	if (!show) return true;
	const resolve = (k) => {
		const q = props.find((x) => x.name === k && x.displayOptions && x.displayOptions.show && (x.displayOptions.show.resource || []).includes(params.resource));
		return q ? q.default : undefined;
	};
	return Object.entries(show).every(([k, vals]) => vals.includes(k in params ? params[k] : resolve(k)));
}

/** Every (resource, operation) pair the node offers. */
function allOperations() {
	const resources = props.find((p) => p.name === 'resource').options.map((o) => o.value);
	const out = [];
	for (const resource of resources) {
		const opProp = props.find((p) => p.name === 'operation' && p.displayOptions.show.resource.includes(resource));
		for (const op of opProp.options) out.push({ resource, operation: op.value, option: op });
	}
	return out;
}

/**
 * Runs one operation. `overrides` replaces parameter values; `reply` decides
 * the fake API response. Returns { requests, output }.
 */
async function run(resource, operation, { overrides = {}, reply, continueOnFail = false } = {}) {
	const params = { resource, operation, ...overrides };
	const requests = [];
	const get = (name, i, fallback) => {
		if (name in params) return params[name];
		const p = props.find((x) => x.name === name && visible(x, params));
		if (!p) {
			if (fallback !== undefined) return fallback;
			throw new Error(`parameter "${name}" is not visible for ${resource}:${operation}`);
		}
		return name in SAMPLES ? SAMPLES[name] : p.default;
	};
	const ctx = {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name, i, fallback) => get(name, i, fallback),
		getCredentials: async () => ({ apiKey: 'k', baseUrl: 'https://api.test/' }),
		getNode: () => ({ name: 'Post-Upload', type: 'n8n-nodes-post-upload.postUpload', typeVersion: 1, parameters: {} }),
		continueOnFail: () => continueOnFail,
		helpers: {
			httpRequestWithAuthentication: async (credential, opts) => {
				requests.push({ credential, ...opts });
				if (reply) return reply(opts);
				return opts.encoding === 'arraybuffer'
					? { statusCode: 200, body: Buffer.from('bytes'), headers: { 'content-type': 'video/mp4', 'content-disposition': 'attachment; filename="out.mp4"' } }
					: { statusCode: 200, body: { ok: true } };
			},
			assertBinaryData: () => ({ mimeType: 'video/mp4', fileName: 'in.mp4' }),
			getBinaryDataBuffer: async () => Buffer.from('x'),
			prepareBinaryData: async (b, fileName, mimeType) => ({ data: b.toString('base64'), fileName, mimeType }),
			returnJsonArray: (d) => (Array.isArray(d) ? d : [d]).map((json) => ({ json })),
			constructExecutionMetaData: (d) => d,
		},
	};
	const output = await node.execute.call(ctx);
	return { requests, output: output[0] };
}

/** Field names of a JSON or multipart body. */
function bodyKeys(body) {
	if (!body) return [];
	if (typeof FormData !== 'undefined' && body instanceof FormData) return [...new Set(body.keys())];
	return Object.keys(body);
}

module.exports = { node, props, allOperations, run, bodyKeys, PostUploadTrigger, signatureMatches };
