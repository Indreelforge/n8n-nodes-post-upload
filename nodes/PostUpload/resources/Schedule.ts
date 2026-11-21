import type { IDataObject, INodeProperties } from 'n8n-workflow';
import type { ResourceModule } from '../GenericFunctions';
import { apiRequest, enc, showFor } from '../GenericFunctions';

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['schedule'] } },
		options: [
			{ name: 'Cancel Scheduled Post', value: 'cancel', description: 'Cancel a scheduled post by job ID', action: 'Cancel a scheduled post' },
			{ name: 'Edit Scheduled Post', value: 'edit', description: 'Change the date, title or description of a scheduled post', action: 'Edit a scheduled post' },
			{ name: 'Get Calendar Month', value: 'calendar', description: 'List every post of one month: published, scheduled and failed', action: 'Get a calendar month' },
			{ name: 'Get Calendar Stats', value: 'calendarStats', description: 'Count published and scheduled posts and the platforms used', action: 'Get calendar stats' },
			{ name: 'List Scheduled Posts', value: 'list', description: 'List all scheduled posts for your account', action: 'List scheduled posts' },
		],
		default: 'list',
	},
];

const fields: INodeProperties[] = [
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		default: '',
		required: true,
		description: 'The scheduled post job ID',
		displayOptions: showFor('schedule', ['cancel', 'edit']),
	},
	{
		displayName: 'New Scheduled Date',
		name: 'scheduledDate',
		type: 'dateTime',
		default: '',
		description: 'New date and time for the scheduled post (ISO-8601)',
		displayOptions: showFor('schedule', ['edit']),
	},
	{
		displayName: 'New Title / Caption',
		name: 'newTitle',
		type: 'string',
		default: '',
		description: 'Replaces the title (caption) of the scheduled post. Leave empty to keep it.',
		displayOptions: showFor('schedule', ['edit']),
	},
	{
		displayName: 'New Description',
		name: 'newDescription',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		description: 'Replaces the description of the scheduled post. Leave empty to keep it.',
		displayOptions: showFor('schedule', ['edit']),
	},
	{
		displayName: 'Timezone',
		name: 'editTimezone',
		type: 'string',
		default: '',
		placeholder: 'America/New_York',
		description: 'Timezone for the new scheduled date',
		displayOptions: showFor('schedule', ['edit']),
	},
	{
		displayName: 'Month',
		name: 'month',
		type: 'string',
		default: '={{ $now.toFormat("yyyy-MM") }}',
		required: true,
		placeholder: '2026-12',
		description: 'Month to list, as YYYY-MM',
		displayOptions: showFor('schedule', ['calendar']),
	},
];

export const schedule: ResourceModule = {
	operations,
	fields,
	handlers: {
		async list(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/schedule` });
		},
		async cancel(i, base) {
			return apiRequest.call(this, i, { method: 'DELETE', url: `${base}/api/schedule/${enc(this.getNodeParameter('jobId', i))}` });
		},
		async edit(i, base) {
			const body: IDataObject = {};
			const scheduledDate = this.getNodeParameter('scheduledDate', i, '') as string;
			const newTitle = this.getNodeParameter('newTitle', i, '') as string;
			const newDescription = this.getNodeParameter('newDescription', i, '') as string;
			const editTimezone = this.getNodeParameter('editTimezone', i, '') as string;
			if (scheduledDate) body.scheduled_date = scheduledDate;
			if (newTitle) body.title = newTitle;
			if (newDescription) body.caption = newDescription;
			if (editTimezone) body.timezone = editTimezone;
			return apiRequest.call(this, i, { method: 'PATCH', url: `${base}/api/schedule/${enc(this.getNodeParameter('jobId', i))}`, body });
		},
		async calendar(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/calendar`, qs: { month: this.getNodeParameter('month', i) } });
		},
		async calendarStats(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/calendar/stats` });
		},
	},
};
