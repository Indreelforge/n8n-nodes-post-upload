import type { IDataObject, INodeProperties } from 'n8n-workflow';
import type { ResourceModule } from '../GenericFunctions';
import { apiRequest, compact, enc, OAUTH_PLATFORMS, PLATFORMS, platformOptions, showFor } from '../GenericFunctions';

const NAMED_OPS = ['get', 'create', 'delete', 'connectedAccounts', 'disconnect', 'connectLink', 'connectCredentials', 'connectBluesky', 'syncConnections', 'tiktokCreatorInfo', 'createWhitelabelLink', 'revokeWhitelabelLink'];
const CREDENTIAL_PLATFORMS = ['devto', 'discord', 'hashnode', 'lemmy', 'listmonk', 'mastodon', 'nostr', 'slack', 'telegram', 'whop', 'wordpress'];
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
			{ name: 'Connect Webhook or Bot Platform', value: 'connectCredentials', description: 'Connect Discord, Slack, Telegram, Mastodon, WordPress, Dev.to, Hashnode, Lemmy, Nostr, Whop or Listmonk with their webhook, token, API key, password or private key', action: 'Connect a webhook or bot platform' },
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
		displayName: 'API Key',
		name: 'devtoApiKey',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'Dev.to → Settings → Extensions → DEV Community API Keys → Generate API Key',
		displayOptions: credShow(['devto']),
	},
	{
		displayName: 'Options',
		name: 'devtoOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: credShow(['devto']),
		options: [
			{
				displayName: 'Forem Site URL',
				name: 'base_url',
				type: 'string',
				default: '',
				placeholder: 'https://dev.to',
				description: 'Only for a Forem community other than dev.to',
			},
		],
	},
	{
		displayName: 'Personal Access Token',
		name: 'hashnodeAccessToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'Hashnode → Account settings → Developer → Generate new token',
		displayOptions: credShow(['hashnode']),
	},
	{
		displayName: 'Publication ID',
		name: 'hashnodePublicationId',
		type: 'string',
		default: '',
		required: true,
		placeholder: '64a1b2c3d4e5f6a7b8c9d0e1',
		description: 'From your blog dashboard URL: hashnode.com/PUBLICATION_ID/dashboard. The publication must be on Hashnode Pro.',
		displayOptions: credShow(['hashnode']),
	},
	{
		displayName: 'Instance URL',
		name: 'lemmyInstanceUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://lemmy.world',
		displayOptions: credShow(['lemmy']),
	},
	{
		displayName: 'Username or Email',
		name: 'lemmyUsername',
		type: 'string',
		default: '',
		required: true,
		description: 'The account Post-Upload posts as (a dedicated bot account is recommended)',
		displayOptions: credShow(['lemmy']),
	},
	{
		displayName: 'Password',
		name: 'lemmyPassword',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		displayOptions: credShow(['lemmy']),
	},
	{
		displayName: 'Community',
		name: 'lemmyCommunity',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'technology or technology@lemmy.world',
		description: 'Community name, or name@instance for a community on another server',
		displayOptions: credShow(['lemmy']),
	},
	{
		displayName: 'Options',
		name: 'lemmyOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: credShow(['lemmy']),
		options: [
			{
				displayName: '2FA Code',
				name: 'totp',
				type: 'string',
				default: '',
				description: 'Only if the account uses two-factor authentication. Used once to sign in and not stored.',
			},
		],
	},
	{
		displayName: 'Listmonk URL',
		name: 'listmonkUrl',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'https://lists.example.com',
		displayOptions: credShow(['listmonk']),
	},
	{
		displayName: 'API User',
		name: 'listmonkApiUser',
		type: 'string',
		default: '',
		required: true,
		description: 'Listmonk → Admin → Users → New, type API (needs campaigns:manage, campaigns:send, lists:get_all and media:manage)',
		displayOptions: credShow(['listmonk']),
	},
	{
		displayName: 'API Token',
		name: 'listmonkApiToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		displayOptions: credShow(['listmonk']),
	},
	{
		displayName: 'List IDs',
		name: 'listmonkListIds',
		type: 'string',
		default: '',
		required: true,
		placeholder: '1, 4',
		description: 'Numeric IDs of the lists each campaign is sent to, comma-separated',
		displayOptions: credShow(['listmonk']),
	},
	{
		displayName: 'Private Key (Nsec)',
		name: 'nostrPrivateKey',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		placeholder: 'nsec1…',
		description: 'Your nsec… key (or 64-character hex). Stored encrypted; a Nostr key cannot be revoked, so consider a dedicated key.',
		displayOptions: credShow(['nostr']),
	},
	{
		displayName: 'Options',
		name: 'nostrOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: credShow(['nostr']),
		options: [
			{
				displayName: 'Blossom Media Server',
				name: 'blossom_server',
				type: 'string',
				default: '',
				placeholder: 'https://blossom.primal.net',
				description: 'Where photos are uploaded (default: blossom.primal.net)',
			},
			{
				displayName: 'Relays',
				name: 'relays',
				type: 'string',
				default: '',
				placeholder: 'wss://relay.damus.io, wss://nos.lol',
				description: 'Comma-separated wss:// relays (default: relay.damus.io, nos.lol and relay.primal.net)',
			},
		],
	},
	{
		displayName: 'API Key',
		name: 'whopApiKey',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'Whop dashboard → Developer → API keys (forum post create, chat message create and file create permissions)',
		displayOptions: credShow(['whop']),
	},
	{
		displayName: 'Post In',
		name: 'whopDestination',
		type: 'options',
		options: [
			{ name: 'Chat Channel', value: 'chat' },
			{ name: 'Forum', value: 'forum' },
		],
		default: 'forum',
		displayOptions: credShow(['whop']),
	},
	{
		displayName: 'Forum Experience ID',
		name: 'whopExperienceId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'exp_XXXXXXXXXXXX',
		displayOptions: { show: { resource: ['profile'], operation: ['connectCredentials'], credentialPlatform: ['whop'], whopDestination: ['forum'] } },
	},
	{
		displayName: 'Chat Channel ID',
		name: 'whopChannelId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['profile'], operation: ['connectCredentials'], credentialPlatform: ['whop'], whopDestination: ['chat'] } },
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
			const opts = (name: string) => this.getNodeParameter(name, i, {}) as IDataObject;
			const whopTarget = () =>
				this.getNodeParameter('whopDestination', i) === 'chat' ? { channel_id: get('whopChannelId') } : { experience_id: get('whopExperienceId') };
			const body: IDataObject =
				platform === 'telegram' ? { bot_token: get('botToken'), chat_id: get('chatId') }
				: platform === 'mastodon' ? { instance_url: get('instanceUrl'), access_token: get('accessToken') }
				: platform === 'wordpress' ? { site_url: get('siteUrl'), username: get('wpUsername'), app_password: get('wpAppPassword') }
				: platform === 'devto' ? compact({ api_key: get('devtoApiKey'), base_url: opts('devtoOptions').base_url })
				: platform === 'hashnode' ? { access_token: get('hashnodeAccessToken'), publication_id: get('hashnodePublicationId') }
				: platform === 'lemmy' ? compact({ instance_url: get('lemmyInstanceUrl'), username: get('lemmyUsername'), password: get('lemmyPassword'), community: get('lemmyCommunity'), totp: opts('lemmyOptions').totp })
				: platform === 'listmonk' ? { base_url: get('listmonkUrl'), api_user: get('listmonkApiUser'), api_token: get('listmonkApiToken'), list_ids: get('listmonkListIds') }
				: platform === 'nostr' ? compact({ nsec: get('nostrPrivateKey'), relays: opts('nostrOptions').relays, blossom_server: opts('nostrOptions').blossom_server })
				: platform === 'whop' ? { api_key: get('whopApiKey'), ...whopTarget() }
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
