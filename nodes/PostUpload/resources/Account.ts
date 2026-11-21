import type { INodeProperties } from 'n8n-workflow';
import type { Handler, ResourceModule } from '../GenericFunctions';
import { apiRequest } from '../GenericFunctions';

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{ name: 'Get', value: 'get', description: 'Get the account plan and this month’s usage', action: 'Get the account' },
			{ name: 'Get Platform Limits', value: 'platformLimits', description: 'Get daily and hourly posting limits and what is left today', action: 'Get platform limits' },
			{ name: 'Get System Status', value: 'systemStatus', description: 'Get the health of Post-Upload and the platform APIs', action: 'Get system status' },
			{ name: 'Get X Allowance', value: 'xAllowance', description: 'Get the X (Twitter) posts left this month', action: 'Get x allowance' },
			{ name: 'Get YouTube Allowance', value: 'youtubeAllowance', description: 'Get the YouTube uploads left today and when the quota resets', action: 'Get you tube allowance' },
		],
		default: 'get',
	},
];

const get = (path: string): Handler =>
	async function (i, base) {
		return apiRequest.call(this, i, { method: 'GET', url: `${base}${path}` });
	};

export const account: ResourceModule = {
	operations,
	fields: [],
	handlers: {
		get: get('/api/me'),
		platformLimits: get('/api/platform-limits'),
		systemStatus: get('/api/status'),
		xAllowance: get('/api/x-allowance'),
		youtubeAllowance: get('/api/youtube-allowance'),
	},
};
