import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	INodeProperties,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

// What each platform can publish — mirrors `content` in shared/platforms.json
// so the picker only offers platforms that accept the chosen content type.
export const VIDEO_PLATFORMS = ['bluesky', 'discord', 'facebook', 'instagram', 'linkedin', 'mastodon', 'pinterest', 'telegram', 'threads', 'tiktok', 'wordpress', 'x', 'youtube'];
export const PHOTO_PLATFORMS = ['bluesky', 'discord', 'facebook', 'google_business', 'instagram', 'linkedin', 'mastodon', 'pinterest', 'telegram', 'threads', 'tiktok', 'wordpress', 'x'];
export const TEXT_PLATFORMS = ['bluesky', 'discord', 'facebook', 'google_business', 'linkedin', 'mastodon', 'reddit', 'slack', 'telegram', 'threads', 'wordpress', 'x'];
export const OAUTH_PLATFORMS = ['facebook', 'google_business', 'instagram', 'linkedin', 'pinterest', 'reddit', 'threads', 'tiktok', 'x', 'youtube'];

export const PLATFORMS = [
	{ name: 'Bluesky', value: 'bluesky' },
	{ name: 'Discord', value: 'discord' },
	{ name: 'Facebook', value: 'facebook' },
	{ name: 'Google Business Profile', value: 'google_business' },
	{ name: 'Instagram', value: 'instagram' },
	{ name: 'LinkedIn', value: 'linkedin' },
	{ name: 'Mastodon', value: 'mastodon' },
	{ name: 'Pinterest', value: 'pinterest' },
	{ name: 'Reddit', value: 'reddit' },
	{ name: 'Slack', value: 'slack' },
	{ name: 'Telegram', value: 'telegram' },
	{ name: 'Threads', value: 'threads' },
	{ name: 'TikTok', value: 'tiktok' },
	{ name: 'WordPress', value: 'wordpress' },
	{ name: 'X (Twitter)', value: 'x' },
	{ name: 'YouTube', value: 'youtube' },
];
export const platformOptions = (keys: string[]) => PLATFORMS.filter((p) => keys.includes(p.value));

export const WEBHOOK_EVENTS = [
	{ name: 'Scheduled Post Published', value: 'scheduled_post_published', description: 'A scheduled post was published' },
	{ name: 'Upload Completed', value: 'upload.completed', description: 'An upload was published on every platform' },
	{ name: 'Upload Failed', value: 'upload.failed', description: 'An upload failed on every platform' },
	{ name: 'Upload Partially Failed', value: 'upload.partial', description: 'An upload was published on some platforms and failed on others' },
];

export type ApiRequest = IHttpRequestOptions & { method: IHttpRequestMethods };
export type HandlerResult = IDataObject | IDataObject[] | INodeExecutionData[];
export type Handler = (this: IExecuteFunctions, i: number, baseUrl: string) => Promise<HandlerResult>;

export interface ResourceModule {
	operations: INodeProperties[];
	fields: INodeProperties[];
	handlers: Record<string, Handler>;
}

/** Shorthand for a displayOptions block bound to one resource and some operations. */
export const showFor = (resource: string, operation: string[]) => ({ show: { resource: [resource], operation } });

export async function getBaseUrl(this: IExecuteFunctions | IHookFunctions | IWebhookFunctions): Promise<string> {
	const credentials = await this.getCredentials('postUploadApi');
	return String(credentials.baseUrl || 'https://api.post-upload.com').replace(/\/$/, '');
}

export const enc = (value: unknown) => encodeURIComponent(String(value ?? ''));

/** Drops empty values so optional query/body fields are only sent when set. */
export function compact(obj: IDataObject): IDataObject {
	const out: IDataObject = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null || value === '') continue;
		if (Array.isArray(value) && value.length === 0) continue;
		out[key] = value;
	}
	return out;
}

// Every API call goes through here so a 4xx/5xx surfaces the API's own
// message ("Too many photos: 11…", "Profile not found", …) and error_code
// instead of n8n's generic "Bad request - please check your parameters".
export async function apiRequest(
	this: IExecuteFunctions | IHookFunctions | IWebhookFunctions,
	itemIndex: number,
	options: ApiRequest,
): Promise<IDataObject> {
	const isJson = options.body !== undefined && !(options.body instanceof FormData);
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'postUploadApi', {
		...options,
		...(isJson ? { json: true } : {}),
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	})) as { statusCode: number; body: unknown };
	const body = parseBody(response.body);
	if (response.statusCode >= 400) throw apiError(this.getNode(), body, response.statusCode, itemIndex);
	return body;
}

/** Downloads a file (e.g. a processed video) and returns it as binary data. */
export async function downloadBinary(
	this: IExecuteFunctions,
	itemIndex: number,
	url: string,
	binaryProperty: string,
	fallbackName: string,
): Promise<INodeExecutionData[]> {
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'postUploadApi', {
		method: 'GET',
		url,
		encoding: 'arraybuffer',
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	})) as { statusCode: number; body: ArrayBuffer | Buffer; headers: IDataObject };
	const buffer = Buffer.from(response.body as ArrayBuffer);
	if (response.statusCode >= 400) throw apiError(this.getNode(), parseBody(buffer), response.statusCode, itemIndex);
	const disposition = String(response.headers?.['content-disposition'] ?? '');
	const fileName = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? fallbackName;
	const mimeType = String(response.headers?.['content-type'] ?? 'application/octet-stream').split(';')[0];
	const binary = await this.helpers.prepareBinaryData(buffer, fileName, mimeType);
	return [{ json: { fileName, mimeType, size: buffer.length }, binary: { [binaryProperty]: binary }, pairedItem: { item: itemIndex } }];
}

function apiError(node: INode, body: IDataObject, statusCode: number, itemIndex: number): NodeApiError {
	const message = String(body.error ?? body.message ?? `Post-Upload API returned HTTP ${statusCode}`);
	const rest: IDataObject = { ...body };
	delete rest.error;
	delete rest.message;
	const error = new NodeApiError(node, body as JsonObject, {
		message,
		description: Object.keys(rest).length ? JSON.stringify(rest) : undefined,
		httpCode: String(statusCode),
		itemIndex,
	});
	(error as NodeApiError & { postUploadBody?: IDataObject }).postUploadBody = body;
	return error;
}

// Arrays are returned as-is (typed loosely) so list endpoints become one n8n
// item per entry, as in earlier versions of the node.
export function parseBody(body: unknown): IDataObject {
	if (body && typeof body === 'object' && !Buffer.isBuffer(body) && !(body instanceof ArrayBuffer)) return body as IDataObject;
	const text = Buffer.isBuffer(body) ? body.toString('utf8') : body instanceof ArrayBuffer ? Buffer.from(body).toString('utf8') : String(body ?? '');
	if (!text) return {};
	try {
		const parsed = JSON.parse(text);
		return parsed && typeof parsed === 'object' ? (parsed as IDataObject) : { data: parsed };
	} catch {
		return { message: text.slice(0, 500) };
	}
}

/** Reads a binary input and returns it as a Blob for multipart uploads. */
export async function binaryBlob(this: IExecuteFunctions, itemIndex: number, property: string, fallbackName: string) {
	const bin = this.helpers.assertBinaryData(itemIndex, property);
	const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, property);
	return { blob: new Blob([buffer], { type: bin.mimeType }), fileName: bin.fileName ?? fallbackName };
}

// Errors leave the node as NodeApiError (API responses, with HTTP code and the
// API's message) or NodeOperationError (everything else) so the n8n UI keeps
// the context.
export function toNodeError(node: INode, error: unknown, itemIndex: number): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) return error;
	return new NodeOperationError(node, error as Error, { itemIndex });
}
