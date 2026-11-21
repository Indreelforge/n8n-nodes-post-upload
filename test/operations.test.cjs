'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { allOperations, run, bodyKeys } = require('./helpers.cjs');

// The API contract of every operation: method, path, and the query/body
// fields it must send (with the sample values from helpers.cjs).
// Adding an operation without a row here fails "every operation has a contract".
const CONTRACT = {
	'account:get': ['GET', '/api/me'],
	'account:platformLimits': ['GET', '/api/platform-limits'],
	'account:systemStatus': ['GET', '/api/status'],
	'account:xAllowance': ['GET', '/api/x-allowance'],
	'account:youtubeAllowance': ['GET', '/api/youtube-allowance'],
	'analytics:activity': ['GET', '/api/analytics/activity'],
	'analytics:live': ['GET', '/api/analytics/live/brand', { qs: { platforms: 'youtube' } }],
	'analytics:overview': ['GET', '/api/analytics/overview'],
	'analytics:platformPerformance': ['GET', '/api/analytics/platform-performance'],
	'analytics:post': ['GET', '/api/analytics/post/upl_p'],
	'analytics:profile': ['GET', '/api/analytics/profile/brand'],
	'analytics:topPosts': ['GET', '/api/analytics/top-posts'],
	'analytics:uploadCounts': ['GET', '/api/analytics/total-impressions/brand'],
	'analytics:views': ['GET', '/api/analytics/views'],
	'analytics:youtubeStats': ['GET', '/api/analytics/youtube-stats'],
	'platform:createPinterestBoard': ['POST', '/api/platforms/pinterest/boards', { body: ['profile', 'name'] }],
	'platform:facebookPages': ['GET', '/api/platforms/facebook/pages', { qs: { profile: 'brand' } }],
	'platform:googleBusinessLocations': ['GET', '/api/platforms/google-business/locations', { qs: { profile: 'brand' } }],
	'platform:linkedinPages': ['GET', '/api/platforms/linkedin/pages', { qs: { profile: 'brand' } }],
	'platform:metrics': ['GET', '/api/platforms/metrics'],
	'platform:pinterestBoards': ['GET', '/api/platforms/pinterest/boards', { qs: { profile: 'brand' } }],
	'platform:recentMedia': ['GET', '/api/platforms/media', { qs: { profile: 'brand' } }],
	'platform:redditPosts': ['GET', '/api/platforms/reddit/detailed-posts', { qs: { profile_username: 'brand' } }],
	'post:delete': ['DELETE', '/api/uploads/upl_1'],
	'post:get': ['GET', '/api/uploads/upl_1'],
	'post:history': ['GET', '/api/uploadposts/history', { qs: { limit: 50 } }],
	'post:retry': ['POST', '/api/uploads/upl_1/retry'],
	'post:status': ['GET', '/api/uploadposts/status', { qs: { request_id: 'upl_req' } }],
	'profile:connectBluesky': ['POST', '/api/profiles/brand/connect/bluesky/app-password', { body: ['identifier', 'app_password'] }],
	'profile:connectCredentials': ['POST', '/api/profiles/brand/connect/discord/credentials', { body: ['webhook_url'] }],
	'profile:connectLink': ['POST', '/api/profiles/brand/connect/instagram'],
	'profile:connectedAccounts': ['GET', '/api/profiles/brand/connected-accounts'],
	'profile:create': ['POST', '/api/profiles', { body: ['name'] }],
	'profile:createWhitelabelLink': ['POST', '/api/profiles/brand/whitelabel'],
	'profile:delete': ['DELETE', '/api/profiles/brand'],
	'profile:disconnect': ['DELETE', '/api/profiles/brand/disconnect/instagram'],
	'profile:get': ['GET', '/api/profiles/brand'],
	'profile:list': ['GET', '/api/profiles'],
	'profile:revokeWhitelabelLink': ['DELETE', '/api/profiles/brand/whitelabel'],
	'profile:syncConnections': ['POST', '/api/profiles/brand/sync-connections'],
	'profile:tiktokCreatorInfo': ['GET', '/api/profiles/brand/tiktok/creator-info'],
	'queue:getSettings': ['GET', '/api/queue/settings', { qs: { profile: 'brand' } }],
	'queue:markSlotFull': ['POST', '/api/queue/slot-full', { body: ['profile', 'slot_time'] }],
	'queue:nextSlot': ['GET', '/api/queue/next-slot', { qs: { profile: 'brand' } }],
	'queue:preview': ['GET', '/api/queue/preview', { qs: { profile: 'brand', count: 10 } }],
	'queue:unmarkSlotFull': ['DELETE', '/api/queue/slot-full', { body: ['profile', 'slot_time'] }],
	'queue:updateSettings': ['POST', '/api/queue/settings', { body: ['profile_username', 'timezone', 'slots', 'days_of_week', 'max_posts_per_slot'] }],
	'schedule:calendar': ['GET', '/api/calendar', { qs: { month: '2026-12' } }],
	'schedule:calendarStats': ['GET', '/api/calendar/stats'],
	'schedule:cancel': ['DELETE', '/api/schedule/job_1'],
	'schedule:edit': ['PATCH', '/api/schedule/job_1'],
	'schedule:list': ['GET', '/api/schedule'],
	'upload:photos': ['POST', '/api/upload_photos', { body: ['user', 'title', 'platform[]', 'async_upload', 'photo_urls[]'] }],
	'upload:text': ['POST', '/api/upload_text', { body: ['user', 'title', 'platform[]', 'async_upload'] }],
	'upload:video': ['POST', '/api/upload', { body: ['user', 'title', 'platform[]', 'async_upload', 'video_url'] }],
	'videoTool:convert': ['POST', '/api/ffmpeg/convert', { body: ['video', 'format'] }],
	'videoTool:download': ['GET', '/api/ffmpeg/download/ff_1'],
	'videoTool:getJob': ['GET', '/api/ffmpeg/jobs/ff_1'],
	'videoTool:listJobs': ['GET', '/api/ffmpeg/jobs'],
	'videoTool:resize': ['POST', '/api/ffmpeg/resize', { body: ['video', 'width', 'height'] }],
	'videoTool:runCommand': ['POST', '/api/ffmpeg/jobs/upload', { body: ['full_command', 'output_extension', 'files'] }],
	'videoTool:trim': ['POST', '/api/ffmpeg/trim', { body: ['video', 'start', 'duration'] }],
	'videoTool:usage': ['GET', '/api/ffmpeg/usage'],
	'videoTool:watermark': ['POST', '/api/ffmpeg/watermark', { body: ['video', 'text', 'position', 'fontSize'] }],
	'webhook:createSubscription': ['POST', '/api/webhooks/subscriptions', { body: ['url', 'events', 'source'] }],
	'webhook:deleteSubscription': ['DELETE', '/api/webhooks/subscriptions/whs_1'],
	'webhook:getConfig': ['GET', '/api/webhooks/config'],
	'webhook:getSubscription': ['GET', '/api/webhooks/subscriptions/whs_1'],
	'webhook:listDeliveries': ['GET', '/api/webhooks/deliveries'],
	'webhook:listSubscriptions': ['GET', '/api/webhooks/subscriptions'],
	'webhook:rotateSecret': ['POST', '/api/webhooks/rotate-secret'],
	'webhook:sendTest': ['POST', '/api/webhooks/test'],
	'webhook:testSubscription': ['POST', '/api/webhooks/subscriptions/whs_1/test'],
	'webhook:updateConfig': ['POST', '/api/webhooks/config', { body: ['channels', 'webhook_url'] }],
	'whitelabel:generateLink': ['POST', '/api/whitelabel/generate-jwt', { body: ['username'] }],
	'whitelabel:validateLink': ['POST', '/api/whitelabel/validate-jwt', { body: ['token'] }],
};

const operations = allOperations();

test('every operation has a contract, and every contract has an operation', () => {
	const offered = operations.map((o) => `${o.resource}:${o.operation}`).sort();
	assert.deepEqual(offered, Object.keys(CONTRACT).sort());
});

test('the node offers at least 76 actions', () => {
	assert.ok(operations.length >= 76, `only ${operations.length} operations`);
});

for (const { resource, operation, option } of operations) {
	const key = `${resource}:${operation}`;
	test(`${key} calls ${CONTRACT[key] ? CONTRACT[key].slice(0, 2).join(' ') : '(no contract)'}`, async () => {
		const [method, path, expect = {}] = CONTRACT[key];
		const { requests } = await run(resource, operation);
		assert.equal(requests.length, 1, 'one API call per item');
		const req = requests[0];
		assert.equal(req.credential, 'postUploadApi');
		assert.equal(req.method, method);
		assert.equal(req.url, `https://api.test${path}`, 'trailing slash of the base URL is trimmed and the path is exact');
		for (const [k, v] of Object.entries(expect.qs || {})) assert.deepEqual(req.qs && req.qs[k], v, `query ${k}`);
		const keys = bodyKeys(req.body);
		for (const k of expect.body || []) assert.ok(keys.includes(k), `body field ${k} (sent: ${keys.join(', ')})`);
		assert.ok(option.action && option.description, 'each operation has an action label and a description');
	});
}

test('path parameters are URL-encoded', async () => {
	const { requests } = await run('profile', 'get', { overrides: { profile: 'my brand/1' } });
	assert.equal(requests[0].url, 'https://api.test/api/profiles/my%20brand%2F1');
});

test('Telegram, Mastodon and WordPress send their own credential fields', async () => {
	const cases = {
		telegram: [{ botToken: 't', chatId: '-100' }, ['bot_token', 'chat_id']],
		mastodon: [{ instanceUrl: 'https://m.test', accessToken: 'a' }, ['instance_url', 'access_token']],
		wordpress: [{ siteUrl: 'https://w.test', wpUsername: 'u', wpAppPassword: 'p' }, ['site_url', 'username', 'app_password']],
	};
	for (const [platform, [values, fields]] of Object.entries(cases)) {
		const { requests } = await run('profile', 'connectCredentials', { overrides: { credentialPlatform: platform, ...values } });
		assert.equal(requests[0].url, `https://api.test/api/profiles/brand/connect/${platform}/credentials`);
		assert.deepEqual(Object.keys(requests[0].body).sort(), fields.sort());
	}
});

test('uploads: binary sources are sent as files, options as form fields', async () => {
	const { requests } = await run('upload', 'video', {
		overrides: {
			videoSource: 'binary',
			binaryPropertyName: 'data',
			additionalOptions: { asyncUpload: false, schedule: '2026-12-01T09:00:00Z', firstComment: 'hi' },
			platformOptions: { option: [{ name: 'privacy_level', value: 'SELF_ONLY' }] },
		},
	});
	const form = requests[0].body;
	assert.ok(form.get('video') instanceof Blob);
	assert.equal(form.get('async_upload'), 'false');
	assert.equal(form.get('schedule'), '2026-12-01T09:00:00Z');
	assert.equal(form.get('first_comment'), 'hi');
	assert.equal(form.get('privacy_level'), 'SELF_ONLY');
});

test('uploads: an empty platform list is rejected before calling the API', async () => {
	await assert.rejects(run('upload', 'text', { overrides: { platforms: [] } }), /Select at least one platform/);
});

test('history: filters are sent only when set', async () => {
	const { requests } = await run('post', 'history', { overrides: { historyFilters: { status: 'failed', page: 2 } } });
	assert.deepEqual(requests[0].qs, { limit: 50, status: 'failed', page: 2 });
});

test('video tools wait long enough for server-side processing', async () => {
	const { requests } = await run('videoTool', 'resize');
	assert.ok(requests[0].timeout >= 10 * 60 * 1000);
});

test('download returns the file as binary data', async () => {
	const { output } = await run('videoTool', 'download');
	assert.equal(output[0].json.fileName, 'out.mp4');
	assert.equal(output[0].binary.data.mimeType, 'video/mp4');
});
