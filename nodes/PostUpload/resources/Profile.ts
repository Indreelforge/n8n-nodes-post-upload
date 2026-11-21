import type { IDataObject, INodeProperties } from 'n8n-workflow';
import type { ResourceModule } from '../GenericFunctions';
import { apiRequest, compact, enc, OAUTH_PLATFORMS, PLATFORMS, platformOptions, showFor } from '../GenericFunctions';

const NAMED_OPS = ['get', 'create', 'delete', 'connectedAccounts', 'disconnect', 'connectLink', 'connectCredentials', 'connectBluesky', 'syncConnections', 'tiktokCreatorInfo', 'createWhitelabelLink', 'revokeWhitelabelLink'];
const CREDENTIAL_PLATFORMS = ['discord', 'mastodon', 'slack', 'telegram', 'wordpress'];
const credShow = (platform: string[]) => ({ show: { resource: ['profile'], operation: ['connectCredentials'], credentialPlatform: platform } });

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['profile'] } },
		options: [
			{ name: 'Connect Bluesky', value: 'connectBluesky', description: 'Connect a Bluesky account with an app password', action: 'Connect bluesky' },
			{ name: 'Connect Webhook or Bot Platform', value: 'connectCredentials', description: 'Connect Discord, Slack, Telegram, Mastodon or WordPress with their webhook, token or app password', action: 'Connect a webhook or bot platform' },
			{ name: 'Create', value: 'create', description: 'Create a new profile', action: 'Create a profile' },
			{ name: 'Create Whitelabel Link', value: 'createWhitelabelLink', description: 'Create a branded link your client opens to connect their own accounts', action: 'Create a whitelabel link' },
			{ name: 'Delete', value: 'delete', description: 'Delete a profile by name', action: 'Delete a profile' },
			{ name: 'Disconnect Platform', value: 'disconnect', description: 'Disconnect a platform from a profile', action: 'Disconnect a platform' },
			{ name: 'Get', value: 'get', description: 'Get details for a specific profile', action: 'Get a profile' },
			{ name: 'Get Connect Link', value: 'connectLink', description: 'Get a one-time OAuth link that connects a platform to the profile', action: 'Get a connect link' },
			{ name: 'Get Connected Accounts', value: 'connectedAccounts', description: 'See which platforms are connected and which need re-authentication', action: 'Get connected accounts' },
			{ name: 'Get TikTok Creator Info', value: 'tiktokCreatorInfo', description: 'Get the privacy levels and limits TikTok allows for this account', action: 'Get tik tok creator info' },
			{ name: 'List', value: 'list', description: 'List all profiles on your account', action: 'List profiles' },
			{ name: 'Revoke Whitelabel Link', value: 'revokeWhitelabelLink', description: 'Disable the profile’s whitelabel connect link', action: 'Revoke a whitelabel link' },
			{ name: 'Sync Connections', value: 'syncConnections', description: 'Re-check every connected account and refresh names and avatars', action: 'Sync connections' },
		],
		default: 'list',
	},
];

const fields: INodeProperties[] = [
	{
		displayName: 'Profile Name',
		name: 'profile',
		type: 'string',
		default: '',
		required: true,
		description: 'The Post-Upload profile name',
		displayOptions: showFor('profile', NAMED_OPS),
	},
	{
		displayName: 'Platform',
		name: 'disconnectPlatform',
		type: 'options',
		options: PLATFORMS,
		default: 'instagram',
		required: true,
		displayOptions: showFor('profile', ['disconnect']),
	},
	{
		displayName: 'Platform',
		name: 'oauthPlatform',
		type: 'options',
		options: platformOptions(OAUTH_PLATFORMS),
		default: 'instagram',
		required: true,
		displayOptions: showFor('profile', ['connectLink']),
	},
	{
		displayName: 'Options',
		name: 'connectLinkOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('profile', ['connectLink']),
		options: [
			{
				displayName: 'Redirect URL',
				name: 'redirect_url',
				type: 'string',
				default: '',
				description: 'Https URL to return to after connecting. Its host must be on your connect-redirect allowlist (dashboard → API Keys).',
			},
			{
				displayName: 'Replace Existing',
				name: 'replace_existing',
				type: 'boolean',
				default: false,
				description: 'Whether to replace an account that is already connected for this platform',
			},
		],
	},
	{
		displayName: 'Platform',
		name: 'credentialPlatform',
		type: 'options',
		options: platformOptions(CREDENTIAL_PLATFORMS),
		default: 'discord',
		required: true,
		displayOptions: showFor('profile', ['connectCredentials']),
	},
	{
		displayName: 'Webhook URL',
		name: 'webhookUrl',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'The incoming webhook URL of the channel',
		displayOptions: credShow(['discord', 'slack']),
	},
	{
		displayName: 'Bot Token',
		name: 'botToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'Token from @BotFather',
		displayOptions: credShow(['telegram']),
	},
	{
		displayName: 'Chat ID',
		name: 'chatId',
		type: 'string',
		default: '',
		required: true,
		description: 'Channel or group ID (e.g. -1001234567890 or @mychannel)',
		displayOptions: credShow(['telegram']),
	},
	{
		displayName: 'Instance URL',
		name: 'instanceUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://mastodon.social',
		displayOptions: credShow(['mastodon']),
	},
	{
		displayName: 'Access Token',
		name: 'accessToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		displayOptions: credShow(['mastodon']),
	},
	{
		displayName: 'Site URL',
		name: 'siteUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://example.com',
		displayOptions: credShow(['wordpress']),
	},
	{
		displayName: 'Username',
		name: 'wpUsername',
		type: 'string',
		default: '',
		required: true,
		displayOptions: credShow(['wordpress']),
	},
	{
		displayName: 'Application Password',
		name: 'wpAppPassword',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'WordPress → Users → Profile → Application Passwords',
		displayOptions: credShow(['wordpress']),
	},
	{
		displayName: 'Handle',
		name: 'blueskyHandle',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'name.bsky.social',
		displayOptions: showFor('profile', ['connectBluesky']),
	},
	{
		displayName: 'App Password',
		name: 'blueskyAppPassword',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'Bluesky → Settings → Privacy and security → App passwords',
		displayOptions: showFor('profile', ['connectBluesky']),
	},
	{
		displayName: 'Options',
		name: 'blueskyOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('profile', ['connectBluesky']),
		options: [
			{
				displayName: 'PDS URL',
				name: 'service',
				type: 'string',
				default: '',
				placeholder: 'https://bsky.social',
				description: 'Only for accounts on a self-hosted PDS',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'whitelabelLinkOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('profile', ['createWhitelabelLink']),
		options: [
			{
				displayName: 'Expires In (Hours)',
				name: 'expiresInHours',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 720 },
				default: 168,
			},
			{
				displayName: 'Logo URL',
				name: 'logoUrl',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Page Description',
				name: 'pageDescription',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Page Title',
				name: 'pageTitle',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: platformOptions(OAUTH_PLATFORMS),
				default: [],
				description: 'Platforms offered on the page (default: all)',
			},
			{
				displayName: 'Redirect URL',
				name: 'redirectUrl',
				type: 'string',
				default: '',
				description: 'Where the button on the page returns to',
			},
		],
	},
];

const profilePath = (base: string, name: unknown) => `${base}/api/profiles/${enc(name)}`;

export const profile: ResourceModule = {
	operations,
	fields,
	handlers: {
		async list(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/profiles` });
		},
		async get(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: profilePath(base, this.getNodeParameter('profile', i)) });
		},
		async create(i, base) {
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/profiles`, body: { name: this.getNodeParameter('profile', i) } });
		},
		async delete(i, base) {
			return apiRequest.call(this, i, { method: 'DELETE', url: profilePath(base, this.getNodeParameter('profile', i)) });
		},
		async connectedAccounts(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${profilePath(base, this.getNodeParameter('profile', i))}/connected-accounts` });
		},
		async disconnect(i, base) {
			return apiRequest.call(this, i, { method: 'DELETE', url: `${profilePath(base, this.getNodeParameter('profile', i))}/disconnect/${enc(this.getNodeParameter('disconnectPlatform', i))}` });
		},
		async connectLink(i, base) {
			const opts = this.getNodeParameter('connectLinkOptions', i, {}) as IDataObject;
			return apiRequest.call(this, i, {
				method: 'POST',
				url: `${profilePath(base, this.getNodeParameter('profile', i))}/connect/${enc(this.getNodeParameter('oauthPlatform', i))}`,
				body: compact({ redirect_url: opts.redirect_url, replace_existing: opts.replace_existing || undefined }),
			});
		},
		async connectCredentials(i, base) {
			const platform = this.getNodeParameter('credentialPlatform', i) as string;
			const get = (name: string) => this.getNodeParameter(name, i) as string;
			const body: IDataObject =
				platform === 'telegram' ? { bot_token: get('botToken'), chat_id: get('chatId') }
				: platform === 'mastodon' ? { instance_url: get('instanceUrl'), access_token: get('accessToken') }
				: platform === 'wordpress' ? { site_url: get('siteUrl'), username: get('wpUsername'), app_password: get('wpAppPassword') }
				: { webhook_url: get('webhookUrl') };
			return apiRequest.call(this, i, { method: 'POST', url: `${profilePath(base, this.getNodeParameter('profile', i))}/connect/${enc(platform)}/credentials`, body });
		},
		async connectBluesky(i, base) {
			const opts = this.getNodeParameter('blueskyOptions', i, {}) as IDataObject;
			return apiRequest.call(this, i, {
				method: 'POST',
				url: `${profilePath(base, this.getNodeParameter('profile', i))}/connect/bluesky/app-password`,
				body: compact({ identifier: this.getNodeParameter('blueskyHandle', i), app_password: this.getNodeParameter('blueskyAppPassword', i), service: opts.service }),
			});
		},
		async syncConnections(i, base) {
			return apiRequest.call(this, i, { method: 'POST', url: `${profilePath(base, this.getNodeParameter('profile', i))}/sync-connections` });
		},
		async tiktokCreatorInfo(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${profilePath(base, this.getNodeParameter('profile', i))}/tiktok/creator-info` });
		},
		async createWhitelabelLink(i, base) {
			return apiRequest.call(this, i, {
				method: 'POST',
				url: `${profilePath(base, this.getNodeParameter('profile', i))}/whitelabel`,
				body: compact(this.getNodeParameter('whitelabelLinkOptions', i, {}) as IDataObject),
			});
		},
		async revokeWhitelabelLink(i, base) {
			return apiRequest.call(this, i, { method: 'DELETE', url: `${profilePath(base, this.getNodeParameter('profile', i))}/whitelabel` });
		},
	},
};
