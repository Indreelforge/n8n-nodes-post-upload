import type { IDataObject, INodeProperties } from 'n8n-workflow';
import type { ResourceModule } from '../GenericFunctions';
import { apiRequest, compact, enc, showFor, WEBHOOK_EVENTS } from '../GenericFunctions';

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['webhook'] } },
		options: [
			{ name: 'Create Subscription', value: 'createSubscription', description: 'Send upload events to another URL, with its own secret and event filter', action: 'Create a webhook subscription' },
			{ name: 'Delete Subscription', value: 'deleteSubscription', description: 'Stop sending events to a subscription', action: 'Delete a webhook subscription' },
			{ name: 'Get Account Webhook', value: 'getConfig', description: 'Get the account webhook URL and whether it is enabled', action: 'Get the account webhook' },
			{ name: 'Get Subscription', value: 'getSubscription', description: 'Get one webhook subscription', action: 'Get a webhook subscription' },
			{ name: 'List Deliveries', value: 'listDeliveries', description: 'List recent webhook deliveries and their results', action: 'List webhook deliveries' },
			{ name: 'List Subscriptions', value: 'listSubscriptions', description: 'List webhook subscriptions', action: 'List webhook subscriptions' },
			{ name: 'Rotate Secret', value: 'rotateSecret', description: 'Replace the signing secret of the account webhook', action: 'Rotate the webhook secret' },
			{ name: 'Send Test Event', value: 'sendTest', description: 'Send a signed test event to the account webhook', action: 'Send a test event' },
			{ name: 'Send Test Event to Subscription', value: 'testSubscription', description: 'Send a signed test event to one subscription', action: 'Send a test event to a subscription' },
			{ name: 'Set Account Webhook', value: 'updateConfig', description: 'Set or clear the account webhook URL', action: 'Set the account webhook' },
		],
		default: 'listSubscriptions',
	},
];

const fields: INodeProperties[] = [
	{
		displayName: 'Webhook URL',
		name: 'accountWebhookUrl',
		type: 'string',
		default: '',
		description: 'Public https URL that receives upload events. Leave empty to turn the account webhook off.',
		displayOptions: showFor('webhook', ['updateConfig']),
	},
	{
		displayName: 'Subscription ID',
		name: 'subscriptionId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'whs_…',
		displayOptions: showFor('webhook', ['deleteSubscription', 'getSubscription', 'testSubscription']),
	},
	{
		displayName: 'URL',
		name: 'subscriptionUrl',
		type: 'string',
		default: '',
		required: true,
		description: 'Public https URL that receives the events',
		displayOptions: showFor('webhook', ['createSubscription']),
	},
	{
		displayName: 'Events',
		name: 'subscriptionEvents',
		type: 'multiOptions',
		options: WEBHOOK_EVENTS,
		default: ['upload.completed', 'upload.failed', 'upload.partial', 'scheduled_post_published'],
		required: true,
		displayOptions: showFor('webhook', ['createSubscription']),
	},
	{
		displayName: 'Options',
		name: 'subscriptionOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('webhook', ['createSubscription']),
		options: [
			{ displayName: 'Name', name: 'name', type: 'string', default: '', description: 'A label for your own reference' },
			{ displayName: 'Profile Name', name: 'profile', type: 'string', default: '', description: 'Only events of this profile (default: every profile)' },
		],
	},
	{
		displayName: 'Options',
		name: 'deliveryOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('webhook', ['listDeliveries']),
		options: [
			{ displayName: 'Limit', name: 'limit', type: 'number', typeOptions: { minValue: 1, maxValue: 100 }, default: 50, description: 'Max number of results to return' },
			{ displayName: 'Page', name: 'page', type: 'number', typeOptions: { minValue: 1 }, default: 1 },
		],
	},
	{
		displayName: 'Options',
		name: 'listSubscriptionOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('webhook', ['listSubscriptions']),
		options: [{ displayName: 'URL', name: 'url', type: 'string', default: '', description: 'Only subscriptions for this exact URL' }],
	},
];

const sub = (base: string, id: unknown) => `${base}/api/webhooks/subscriptions/${enc(id)}`;

export const webhook: ResourceModule = {
	operations,
	fields,
	handlers: {
		async getConfig(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/webhooks/config` });
		},
		async updateConfig(i, base) {
			const url = (this.getNodeParameter('accountWebhookUrl', i, '') as string).trim();
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/webhooks/config`, body: { channels: { webhook: Boolean(url) }, webhook_url: url || null } });
		},
		async listDeliveries(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/webhooks/deliveries`, qs: compact(this.getNodeParameter('deliveryOptions', i, {}) as IDataObject) });
		},
		async rotateSecret(i, base) {
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/webhooks/rotate-secret` });
		},
		async sendTest(i, base) {
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/webhooks/test` });
		},
		async listSubscriptions(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/webhooks/subscriptions`, qs: compact(this.getNodeParameter('listSubscriptionOptions', i, {}) as IDataObject) });
		},
		async createSubscription(i, base) {
			const opts = this.getNodeParameter('subscriptionOptions', i, {}) as IDataObject;
			return apiRequest.call(this, i, {
				method: 'POST',
				url: `${base}/api/webhooks/subscriptions`,
				body: compact({ url: this.getNodeParameter('subscriptionUrl', i), events: this.getNodeParameter('subscriptionEvents', i), profile: opts.profile, name: opts.name, source: 'n8n' }),
			});
		},
		async getSubscription(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: sub(base, this.getNodeParameter('subscriptionId', i)) });
		},
		async deleteSubscription(i, base) {
			return apiRequest.call(this, i, { method: 'DELETE', url: sub(base, this.getNodeParameter('subscriptionId', i)) });
		},
		async testSubscription(i, base) {
			return apiRequest.call(this, i, { method: 'POST', url: `${sub(base, this.getNodeParameter('subscriptionId', i))}/test` });
		},
	},
};
