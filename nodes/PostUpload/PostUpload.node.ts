import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type { HandlerResult, ResourceModule } from './GenericFunctions';
import { getBaseUrl, toNodeError } from './GenericFunctions';
import { account } from './resources/Account';
import { analytics } from './resources/Analytics';
import { platform } from './resources/Platform';
import { post } from './resources/Post';
import { profile } from './resources/Profile';
import { queue } from './resources/Queue';
import { schedule } from './resources/Schedule';
import { upload } from './resources/Upload';
import { videoTool } from './resources/VideoTool';
import { webhook } from './resources/Webhook';
import { whitelabel } from './resources/Whitelabel';

const RESOURCES: Record<string, ResourceModule> = {
	account,
	analytics,
	platform,
	post,
	profile,
	queue,
	schedule,
	upload,
	videoTool,
	webhook,
	whitelabel,
};

export class PostUpload implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Post-Upload',
		name: 'postUpload',
		icon: { light: 'file:../../icons/post-upload.svg', dark: 'file:../../icons/post-upload.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Publish videos, photos and text to Instagram, YouTube, TikTok, Facebook, X, LinkedIn and 16 more networks in one step, then schedule, track and analyse your posts',
		defaults: { name: 'Post-Upload' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'postUploadApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account', description: 'Plan, usage and posting allowances' },
					{ name: 'Analytics', value: 'analytics', description: 'Post, profile and platform analytics' },
					{ name: 'Platform', value: 'platform', description: 'Pages, boards, locations and media of connected accounts' },
					{ name: 'Post', value: 'post', description: 'Status, history, retry and deletion of uploads' },
					{ name: 'Profile', value: 'profile', description: 'Profiles and their connected social accounts' },
					{ name: 'Queue', value: 'queue', description: 'Posting-queue slots' },
					{ name: 'Schedule', value: 'schedule', description: 'Scheduled posts and the content calendar' },
					{ name: 'Upload', value: 'upload', description: 'Publish videos, photos and text' },
					{ name: 'Video Tool', value: 'videoTool', description: 'Convert, resize, trim and watermark videos' },
					{ name: 'Webhook', value: 'webhook', description: 'Webhook destinations and delivery logs' },
					{ name: 'Whitelabel', value: 'whitelabel', description: 'Branded connect links for your clients' },
				],
				default: 'upload',
			},
			...Object.values(RESOURCES).flatMap((r) => [...r.operations, ...r.fields]),
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const baseUrl = await getBaseUrl.call(this);

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const handler = RESOURCES[resource]?.handlers[operation];
				if (!handler) {
					throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for "${resource}"`, { itemIndex: i });
				}
				const result: HandlerResult = await handler.call(this, i, baseUrl);
				if (Array.isArray(result) && result.length && (result[0] as INodeExecutionData).binary) {
					returnData.push(...(result as INodeExecutionData[]));
				} else {
					returnData.push(
						...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(result as IDataObject | IDataObject[]), { itemData: { item: i } }),
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const json: IDataObject = { error: (error as Error).message };
					if (error instanceof NodeApiError) {
						if (error.httpCode) json.http_code = Number(error.httpCode);
						const details = (error as NodeApiError & { postUploadBody?: IDataObject }).postUploadBody;
						if (details) Object.assign(json, details, { error: (error as Error).message });
					}
					// Attach the error to the item so "On Error → Continue (using error output)"
					// routes it to the error branch; the JSON keeps the API's details.
					returnData.push({ json, error: toNodeError(this.getNode(), error, i), pairedItem: { item: i } });
				} else {
					throw toNodeError(this.getNode(), error, i);
				}
			}
		}

		return [returnData];
	}
}
