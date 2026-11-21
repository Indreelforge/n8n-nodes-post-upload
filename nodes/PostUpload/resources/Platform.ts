import type { IDataObject, INodeProperties } from 'n8n-workflow';
import type { Handler, ResourceModule } from '../GenericFunctions';
import { apiRequest, compact, PLATFORMS, showFor } from '../GenericFunctions';

const PROFILE_OPS = ['facebookPages', 'googleBusinessLocations', 'linkedinPages', 'pinterestBoards', 'createPinterestBoard', 'recentMedia', 'redditPosts'];

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['platform'] } },
		options: [
			{ name: 'Create Pinterest Board', value: 'createPinterestBoard', description: 'Create a board on the connected Pinterest account', action: 'Create a pinterest board' },
			{ name: 'Get Supported Metrics', value: 'metrics', description: 'List the analytics metrics each platform provides', action: 'Get supported metrics' },
			{ name: 'List Facebook Pages', value: 'facebookPages', description: 'List the Facebook Pages you can post to (for facebook_page_id)', action: 'List facebook pages' },
			{ name: 'List Google Business Locations', value: 'googleBusinessLocations', description: 'List Google Business Profile locations (for gbp_location_id)', action: 'List google business locations' },
			{ name: 'List LinkedIn Pages', value: 'linkedinPages', description: 'List LinkedIn company pages you manage (for target_linkedin_page_id)', action: 'List linked in pages' },
			{ name: 'List Pinterest Boards', value: 'pinterestBoards', description: 'List Pinterest boards (for pinterest_board_id)', action: 'List pinterest boards' },
			{ name: 'List Recent Media', value: 'recentMedia', description: 'List recently published posts of a profile', action: 'List recent media' },
			{ name: 'List Reddit Posts', value: 'redditPosts', description: 'List recent Reddit posts with score and comment counts', action: 'List reddit posts' },
		],
		default: 'facebookPages',
	},
];

const fields: INodeProperties[] = [
	{
		displayName: 'Profile Name',
		name: 'platformProfile',
		type: 'string',
		default: '',
		required: true,
		description: 'Profile whose connected account to use',
		displayOptions: showFor('platform', PROFILE_OPS),
	},
	{
		displayName: 'Board Name',
		name: 'boardName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('platform', ['createPinterestBoard']),
	},
	{
		displayName: 'Options',
		name: 'boardOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('platform', ['createPinterestBoard']),
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{
				displayName: 'Privacy',
				name: 'privacy',
				type: 'options',
				options: [
					{ name: 'Public', value: 'PUBLIC' },
					{ name: 'Secret', value: 'SECRET' },
				],
				default: 'PUBLIC',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'mediaOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('platform', ['recentMedia']),
		options: [
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: PLATFORMS,
				default: 'instagram',
				description: 'Only this platform',
			},
		],
	},
];

const byProfile = (path: string, key = 'profile'): Handler =>
	async function (i, base) {
		return apiRequest.call(this, i, { method: 'GET', url: `${base}${path}`, qs: { [key]: this.getNodeParameter('platformProfile', i) } });
	};

export const platform: ResourceModule = {
	operations,
	fields,
	handlers: {
		facebookPages: byProfile('/api/platforms/facebook/pages'),
		googleBusinessLocations: byProfile('/api/platforms/google-business/locations'),
		linkedinPages: byProfile('/api/platforms/linkedin/pages'),
		pinterestBoards: byProfile('/api/platforms/pinterest/boards'),
		redditPosts: byProfile('/api/platforms/reddit/detailed-posts', 'profile_username'),
		async recentMedia(i, base) {
			const opts = this.getNodeParameter('mediaOptions', i, {}) as IDataObject;
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/platforms/media`, qs: compact({ profile: this.getNodeParameter('platformProfile', i), platform: opts.platform }) });
		},
		async createPinterestBoard(i, base) {
			const opts = this.getNodeParameter('boardOptions', i, {}) as IDataObject;
			return apiRequest.call(this, i, {
				method: 'POST',
				url: `${base}/api/platforms/pinterest/boards`,
				body: compact({ profile: this.getNodeParameter('platformProfile', i), name: this.getNodeParameter('boardName', i), description: opts.description, privacy: opts.privacy }),
			});
		},
		async metrics(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/platforms/metrics` });
		},
	},
};
