import type { INodeProperties } from 'n8n-workflow';
import type { ResourceModule } from '../GenericFunctions';
import { apiRequest, showFor } from '../GenericFunctions';

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['queue'] } },
		options: [
			{ name: 'Get Next Slot', value: 'nextSlot', description: 'Get the next free posting slot of a profile', action: 'Get the next queue slot' },
			{ name: 'Get Settings', value: 'getSettings', description: 'Get the queue timezone, slot times and posting days', action: 'Get queue settings' },
			{ name: 'Mark Slot Full', value: 'markSlotFull', description: 'Block a queue slot so nothing new is queued into it', action: 'Mark a queue slot full' },
			{ name: 'Preview Slots', value: 'preview', description: 'List the upcoming queue slots and whether they are free', action: 'Preview queue slots' },
			{ name: 'Unmark Slot Full', value: 'unmarkSlotFull', description: 'Free a queue slot again', action: 'Unmark a queue slot' },
			{ name: 'Update Settings', value: 'updateSettings', description: 'Replace the queue timezone, slot times and posting days', action: 'Update queue settings' },
		],
		default: 'nextSlot',
	},
];

const fields: INodeProperties[] = [
	{
		displayName: 'Profile Name',
		name: 'queueProfile',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('queue', ['nextSlot', 'getSettings', 'markSlotFull', 'preview', 'unmarkSlotFull', 'updateSettings']),
	},
	{
		displayName: 'Count',
		name: 'count',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 50 },
		default: 10,
		description: 'How many upcoming slots to list',
		displayOptions: showFor('queue', ['preview']),
	},
	{
		displayName: 'Slot Time',
		name: 'slotTime',
		type: 'dateTime',
		default: '',
		required: true,
		description: 'The slot’s date and time, as returned by Preview Slots',
		displayOptions: showFor('queue', ['markSlotFull', 'unmarkSlotFull']),
	},
	{
		displayName: 'Timezone',
		name: 'queueTimezone',
		type: 'string',
		default: 'UTC',
		required: true,
		placeholder: 'Asia/Kolkata',
		description: 'IANA timezone the slot times are in',
		displayOptions: showFor('queue', ['updateSettings']),
	},
	{
		displayName: 'Slot Times',
		name: 'slots',
		type: 'string',
		default: '09:00, 12:00, 17:00',
		required: true,
		description: 'Comma-separated times of day (HH:MM), up to 24',
		displayOptions: showFor('queue', ['updateSettings']),
	},
	{
		displayName: 'Posting Days',
		name: 'daysOfWeek',
		type: 'multiOptions',
		options: [
			{ name: 'Friday', value: 5 },
			{ name: 'Monday', value: 1 },
			{ name: 'Saturday', value: 6 },
			{ name: 'Sunday', value: 0 },
			{ name: 'Thursday', value: 4 },
			{ name: 'Tuesday', value: 2 },
			{ name: 'Wednesday', value: 3 },
		],
		default: [1, 2, 3, 4, 5],
		required: true,
		displayOptions: showFor('queue', ['updateSettings']),
	},
	{
		displayName: 'Max Posts per Slot',
		name: 'maxPostsPerSlot',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 10 },
		default: 1,
		displayOptions: showFor('queue', ['updateSettings']),
	},
];

export const queue: ResourceModule = {
	operations,
	fields,
	handlers: {
		async nextSlot(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/queue/next-slot`, qs: { profile: this.getNodeParameter('queueProfile', i) } });
		},
		async getSettings(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/queue/settings`, qs: { profile: this.getNodeParameter('queueProfile', i) } });
		},
		async preview(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/queue/preview`, qs: { profile: this.getNodeParameter('queueProfile', i), count: this.getNodeParameter('count', i) } });
		},
		async updateSettings(i, base) {
			const slots = (this.getNodeParameter('slots', i) as string).split(',').map((s) => s.trim()).filter(Boolean);
			return apiRequest.call(this, i, {
				method: 'POST',
				url: `${base}/api/queue/settings`,
				body: {
					profile_username: this.getNodeParameter('queueProfile', i),
					timezone: this.getNodeParameter('queueTimezone', i),
					slots,
					days_of_week: this.getNodeParameter('daysOfWeek', i),
					max_posts_per_slot: this.getNodeParameter('maxPostsPerSlot', i),
				},
			});
		},
		async markSlotFull(i, base) {
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/queue/slot-full`, body: { profile: this.getNodeParameter('queueProfile', i), slot_time: this.getNodeParameter('slotTime', i) } });
		},
		async unmarkSlotFull(i, base) {
			return apiRequest.call(this, i, { method: 'DELETE', url: `${base}/api/queue/slot-full`, body: { profile: this.getNodeParameter('queueProfile', i), slot_time: this.getNodeParameter('slotTime', i) } });
		},
	},
};
