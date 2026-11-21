import type { IDataObject, INodeProperties } from 'n8n-workflow';
import type { ResourceModule } from '../GenericFunctions';
import { apiRequest, compact, enc, showFor } from '../GenericFunctions';

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['post'] } },
		options: [
			{ name: 'Delete Upload', value: 'delete', description: 'Delete an upload record by ID (cancels it if it has not been published yet)', action: 'Delete an upload' },
			{ name: 'Get Upload', value: 'get', description: 'Get one upload with its per-platform status and post URLs', action: 'Get an upload' },
			{ name: 'Get Upload History', value: 'history', description: 'List past uploads for your account', action: 'Get upload history' },
			{ name: 'Get Upload Status', value: 'status', description: 'Check the status of an upload by request ID', action: 'Get upload status' },
			{ name: 'Retry Failed Upload', value: 'retry', description: 'Publish a failed upload again on the platforms that failed', action: 'Retry a failed upload' },
		],
		default: 'status',
	},
];

const fields: INodeProperties[] = [
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		default: '',
		required: true,
		description: 'The upload_id or request_id returned by a previous upload',
		displayOptions: showFor('post', ['status']),
	},
	{
		displayName: 'Upload ID',
		name: 'uploadId',
		type: 'string',
		default: '',
		required: true,
		description: 'The upload ID (upl_…)',
		displayOptions: showFor('post', ['delete', 'get', 'retry']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: showFor('post', ['history']),
	},
	{
		displayName: 'Filters',
		name: 'historyFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showFor('post', ['history']),
		options: [
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'Page of results (with Limit as the page size)',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Completed', value: 'completed' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Partial', value: 'partial' },
					{ name: 'Processing', value: 'processing' },
					{ name: 'Queued', value: 'queued' },
					{ name: 'Scheduled', value: 'scheduled' },
				],
				default: 'completed',
				description: 'Only uploads with this status',
			},
		],
	},
];

export const post: ResourceModule = {
	operations,
	fields,
	handlers: {
		async status(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/uploadposts/status`, qs: { request_id: this.getNodeParameter('requestId', i) } });
		},
		async history(i, base) {
			const filters = this.getNodeParameter('historyFilters', i, {}) as IDataObject;
			return apiRequest.call(this, i, {
				method: 'GET',
				url: `${base}/api/uploadposts/history`,
				qs: compact({ limit: this.getNodeParameter('limit', i), status: filters.status, page: filters.page }),
			});
		},
		async get(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/uploads/${enc(this.getNodeParameter('uploadId', i))}` });
		},
		async delete(i, base) {
			return apiRequest.call(this, i, { method: 'DELETE', url: `${base}/api/uploads/${enc(this.getNodeParameter('uploadId', i))}` });
		},
		async retry(i, base) {
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/uploads/${enc(this.getNodeParameter('uploadId', i))}/retry` });
		},
	},
};
