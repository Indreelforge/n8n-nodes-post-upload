import type { IDataObject, INodeProperties } from 'n8n-workflow';
import type { ResourceModule } from '../GenericFunctions';
import { apiRequest, compact, enc, PLATFORMS, showFor } from '../GenericFunctions';

const RANGE_OPTIONS = [
	{ name: 'All Time', value: 'all' },
	{ name: 'Last 7 Days', value: '7d' },
	{ name: 'Last 30 Days', value: '30d' },
	{ name: 'Last 90 Days', value: '90d' },
	{ name: 'Last 365 Days', value: '365d' },
];
const LIVE_PLATFORMS = ['bluesky', 'instagram', 'pinterest', 'threads', 'tiktok', 'youtube'];

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['analytics'] } },
		options: [
			{ name: 'Get Activity', value: 'activity', description: 'Get the latest uploads and account activity', action: 'Get activity' },
			{ name: 'Get Live Platform Stats', value: 'live', description: 'Fetch follower and engagement stats straight from the connected platforms', action: 'Get live platform stats' },
			{ name: 'Get Overview', value: 'overview', description: 'Get high-level analytics across all profiles', action: 'Get analytics overview' },
			{ name: 'Get Platform Performance', value: 'platformPerformance', description: 'Compare success rates and volume per platform', action: 'Get platform performance' },
			{ name: 'Get Post Analytics', value: 'post', description: 'Get the per-platform result of one post', action: 'Get post analytics' },
			{ name: 'Get Profile Analytics', value: 'profile', description: 'Get detailed analytics for a specific profile', action: 'Get profile analytics' },
			{ name: 'Get Top Posts', value: 'topPosts', description: 'Get the best-performing posts', action: 'Get top posts' },
			{ name: 'Get Upload Counts', value: 'uploadCounts', description: 'Count a profile’s uploads per platform over a period', action: 'Get upload counts' },
			{ name: 'Get Views', value: 'views', description: 'Get views and uploads over time', action: 'Get views' },
			{ name: 'Get YouTube Stats', value: 'youtubeStats', description: 'Get channel statistics of the connected YouTube accounts', action: 'Get you tube stats' },
		],
		default: 'overview',
	},
];

const fields: INodeProperties[] = [
	{
		displayName: 'Profile Name',
		name: 'analyticsProfile',
		type: 'string',
		default: '',
		required: true,
		description: 'Profile name to fetch analytics for',
		displayOptions: showFor('analytics', ['profile', 'live', 'uploadCounts']),
	},
	{
		displayName: 'Platforms',
		name: 'livePlatforms',
		type: 'multiOptions',
		options: PLATFORMS.filter((p) => LIVE_PLATFORMS.includes(p.value)),
		default: [],
		required: true,
		description: 'Platforms to fetch live stats from',
		displayOptions: showFor('analytics', ['live']),
	},
	{
		displayName: 'Request ID',
		name: 'postRequestId',
		type: 'string',
		default: '',
		required: true,
		description: 'The upload_id or request_id of the post',
		displayOptions: showFor('analytics', ['post']),
	},
	{
		displayName: 'Filters',
		name: 'analyticsFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showFor('analytics', ['overview', 'views', 'topPosts', 'platformPerformance']),
		options: [
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: PLATFORMS,
				default: 'instagram',
				description: 'Only this platform',
			},
			{
				displayName: 'Profile Name',
				name: 'profile',
				type: 'string',
				default: '',
				description: 'Only this profile',
			},
			{
				displayName: 'Range',
				name: 'range',
				type: 'options',
				options: RANGE_OPTIONS,
				default: '30d',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'profileAnalyticsOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('analytics', ['profile']),
		options: [
			{
				displayName: 'Range',
				name: 'range',
				type: 'options',
				options: RANGE_OPTIONS,
				default: '30d',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'postAnalyticsOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('analytics', ['post']),
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
	{
		displayName: 'Options',
		name: 'uploadCountOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('analytics', ['uploadCounts']),
		options: [
			{
				displayName: 'End Date',
				name: 'end_date',
				type: 'dateTime',
				default: '',
				description: 'Together with Start Date, overrides Period',
			},
			{
				displayName: 'Period',
				name: 'period',
				type: 'options',
				options: [
					{ name: 'Last 3 Months', value: '3months' },
					{ name: 'Last Day', value: 'last_day' },
					{ name: 'Last Month', value: 'last_month' },
					{ name: 'Last Week', value: 'last_week' },
					{ name: 'Last Year', value: 'year' },
				],
				default: 'last_month',
			},
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: PLATFORMS,
				default: 'instagram',
				description: 'Only this platform',
			},
			{
				displayName: 'Start Date',
				name: 'start_date',
				type: 'dateTime',
				default: '',
				description: 'Together with End Date, overrides Period',
			},
		],
	},
];

const dateOnly = (v: unknown) => (v ? String(v).slice(0, 10) : undefined);

export const analytics: ResourceModule = {
	operations,
	fields,
	handlers: {
		async overview(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/analytics/overview`, qs: compact(this.getNodeParameter('analyticsFilters', i, {}) as IDataObject) });
		},
		async profile(i, base) {
			const opts = this.getNodeParameter('profileAnalyticsOptions', i, {}) as IDataObject;
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/analytics/profile/${enc(this.getNodeParameter('analyticsProfile', i))}`, qs: compact({ range: opts.range }) });
		},
		async live(i, base) {
			const platforms = (this.getNodeParameter('livePlatforms', i) as string[]).join(',');
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/analytics/live/${enc(this.getNodeParameter('analyticsProfile', i))}`, qs: { platforms } });
		},
		async post(i, base) {
			const opts = this.getNodeParameter('postAnalyticsOptions', i, {}) as IDataObject;
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/analytics/post/${enc(this.getNodeParameter('postRequestId', i))}`, qs: compact({ platform: opts.platform }) });
		},
		async uploadCounts(i, base) {
			const opts = this.getNodeParameter('uploadCountOptions', i, {}) as IDataObject;
			return apiRequest.call(this, i, {
				method: 'GET',
				url: `${base}/api/analytics/total-impressions/${enc(this.getNodeParameter('analyticsProfile', i))}`,
				qs: compact({ period: opts.period, platform: opts.platform, start_date: dateOnly(opts.start_date), end_date: dateOnly(opts.end_date) }),
			});
		},
		async topPosts(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/analytics/top-posts`, qs: compact(this.getNodeParameter('analyticsFilters', i, {}) as IDataObject) });
		},
		async platformPerformance(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/analytics/platform-performance`, qs: compact(this.getNodeParameter('analyticsFilters', i, {}) as IDataObject) });
		},
		async views(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/analytics/views`, qs: compact(this.getNodeParameter('analyticsFilters', i, {}) as IDataObject) });
		},
		async activity(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/analytics/activity` });
		},
		async youtubeStats(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/analytics/youtube-stats` });
		},
	},
};
