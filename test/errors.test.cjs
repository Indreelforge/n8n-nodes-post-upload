'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('./helpers.cjs');

const apiError = (statusCode, body) => () => ({ statusCode, body });

test('API errors surface the API message, not a generic one', async () => {
	await assert.rejects(
		run('upload', 'text', { reply: apiError(400, { error: 'Platform(s) not connected: bluesky.', error_code: 'PLATFORM_NOT_CONNECTED' }) }),
		(err) => {
			assert.match(err.message, /Platform\(s\) not connected: bluesky/);
			assert.equal(err.httpCode, '400');
			return true;
		},
	);
});

test('continue on fail: the item carries error details and is routed to the error output', async () => {
	const { output } = await run('upload', 'text', {
		continueOnFail: true,
		reply: apiError(403, { error: 'Plan limit reached', error_code: 'UPLOAD_LIMIT_REACHED' }),
	});
	assert.equal(output.length, 1);
	assert.equal(output[0].json.error, 'Plan limit reached');
	assert.equal(output[0].json.error_code, 'UPLOAD_LIMIT_REACHED');
	assert.equal(output[0].json.http_code, 403);
	// n8n sends an item to the error output only when it carries an error object.
	assert.ok(output[0].error, 'item.error is set');
	assert.deepEqual(output[0].pairedItem, { item: 0 });
});

test('a non-JSON error body still gives a readable message', async () => {
	await assert.rejects(run('profile', 'list', { reply: apiError(502, '<html>Bad gateway</html>') }), /Bad gateway|HTTP 502/);
});

test('list endpoints that return arrays become one item per entry', async () => {
	const { output } = await run('profile', 'list', { reply: () => ({ statusCode: 200, body: [{ name: 'a' }, { name: 'b' }] }) });
	assert.deepEqual(output.map((o) => o.json.name), ['a', 'b']);
});
