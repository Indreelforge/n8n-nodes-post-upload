import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { apiRequest, enc, getBaseUrl, WEBHOOK_EVENTS } from '../PostUpload/GenericFunctions';

/** 'sha256=' + hex HMAC-SHA256 of the raw body, compared in constant time. */
export function signatureMatches(secret: string, rawBody: Buffer, header: string): boolean {
	if (!secret || !header) return false;
	const expected = Buffer.from('sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex'));
	const given = Buffer.from(header.trim());
	return expected.length === given.length && timingSafeEqual(expected, given);
}

export class PostUploadTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Post-Upload Trigger',
		name: 'postUploadTrigger',
		icon: { light: 'file:../../icons/post-upload.svg', dark: 'file:../../icons/post-upload.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when a Post-Upload post is published, partly fails or fails',
		defaults: { name: 'Post-Upload Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'postUploadApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Post-Upload can only call a public https address, so n8n must be reachable from the internet (set WEBHOOK_URL on self-hosted n8n). Webhooks need the Advanced plan or higher.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: WEBHOOK_EVENTS,
				default: ['scheduled_post_published', 'upload.completed', 'upload.failed', 'upload.partial'],
				required: true,
				description: 'The events that start the workflow',
			},
			{
				displayName: 'Profile Name',
				name: 'profile',
				type: 'string',
				default: '',
				description: 'Only events of this profile. Leave empty for every profile.',
			},
			{
				displayName: 'Verify Signature',
				name: 'verifySignature',
				type: 'boolean',
				default: true,
				description: 'Whether to reject requests that are not signed by Post-Upload with this subscription’s secret',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const id = staticData.subscriptionId as string | undefined;
				if (!id || !staticData.webhookSecret) return false;
				const base = await getBaseUrl.call(this);
				try {
					const sub = await apiRequest.call(this, 0, { method: 'GET', url: `${base}/api/webhooks/subscriptions/${enc(id)}` });
					const wanted = [...(this.getNodeParameter('events', []) as string[])].sort().join(',');
					const have = [...((sub.events as string[]) ?? [])].sort().join(',');
					const profile = (this.getNodeParameter('profile', '') as string).trim() || null;
					return sub.url === this.getNodeWebhookUrl('default') && wanted === have && (sub.profile ?? null) === profile;
				} catch (error) {
					this.logger.warn(`Post-Upload Trigger: subscription ${id} could not be checked, it will be recreated: ${(error as Error).message}`);
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const base = await getBaseUrl.call(this);
				const url = this.getNodeWebhookUrl('default') as string;

				// Remove earlier subscriptions for this URL (e.g. from a previous
				// activation whose secret was lost) so events are not sent twice.
				try {
					const existing = await apiRequest.call(this, 0, { method: 'GET', url: `${base}/api/webhooks/subscriptions`, qs: { url } });
					for (const old of (existing.subscriptions as IDataObject[]) ?? []) {
						await apiRequest.call(this, 0, { method: 'DELETE', url: `${base}/api/webhooks/subscriptions/${enc(old.id)}` }).catch((error: Error) =>
							this.logger.warn(`Post-Upload Trigger: could not remove old subscription ${String(old.id)}: ${error.message}`),
						);
					}
				} catch (error) {
					// Listing is best-effort; creating the new subscription is what matters.
					this.logger.warn(`Post-Upload Trigger: could not check for old subscriptions on this URL: ${(error as Error).message}`);
				}

				const profile = (this.getNodeParameter('profile', '') as string).trim();
				const name = String(this.getWorkflow().name ?? '').trim().slice(0, 200);
				const response = await apiRequest.call(this, 0, {
					method: 'POST',
					url: `${base}/api/webhooks/subscriptions`,
					body: {
						url,
						events: this.getNodeParameter('events', []) as string[],
						source: 'n8n',
						...(profile ? { profile } : {}),
						...(name ? { name } : {}),
					},
				});
				staticData.subscriptionId = (response.subscription as IDataObject).id;
				staticData.webhookSecret = response.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const id = staticData.subscriptionId as string | undefined;
				if (id) {
					const base = await getBaseUrl.call(this);
					try {
						await apiRequest.call(this, 0, { method: 'DELETE', url: `${base}/api/webhooks/subscriptions/${enc(id)}` });
					} catch (error) {
						// Already gone (404) is fine; anything else means it may still exist.
						if (!/not found/i.test((error as Error).message)) return false;
					}
				}
				delete staticData.subscriptionId;
				delete staticData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = this.getBodyData() as IDataObject;

		if (this.getNodeParameter('verifySignature', true) as boolean) {
			const secret = String(this.getWorkflowStaticData('node').webhookSecret ?? '');
			const header = String(req.headers['x-post-upload-signature'] ?? '');
			const raw = (req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(body));
			if (!signatureMatches(secret, raw, header)) {
				const res = this.getResponseObject();
				res.status(401).json({ error: 'Invalid or missing X-Post-Upload-Signature' });
				return { noWebhookResponse: true };
			}
		}

		const events = this.getNodeParameter('events', []) as string[];
		if (body.event !== 'test' && !events.includes(String(body.event))) return { webhookResponse: { received: true, ignored: true } };

		return { workflowData: [this.helpers.returnJsonArray(body)] };
	}
}
