import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeApiError,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INode,
	JsonObject,
	NodeConnectionTypes,
} from 'n8n-workflow';

// What each platform can publish — mirrors `content` in shared/platforms.json
// so the picker only offers platforms that accept the chosen content type.
const VIDEO_PLATFORMS = ['bluesky', 'discord', 'facebook', 'instagram', 'linkedin', 'mastodon', 'pinterest', 'telegram', 'threads', 'tiktok', 'wordpress', 'x', 'youtube'];
const PHOTO_PLATFORMS = ['bluesky', 'discord', 'facebook', 'google_business', 'instagram', 'linkedin', 'mastodon', 'pinterest', 'telegram', 'threads', 'tiktok', 'wordpress', 'x'];
const TEXT_PLATFORMS = ['bluesky', 'discord', 'facebook', 'google_business', 'linkedin', 'mastodon', 'reddit', 'slack', 'telegram', 'threads', 'wordpress', 'x'];

const PLATFORMS = [
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
const platformOptions = (keys: string[]) => PLATFORMS.filter((p) => keys.includes(p.value));

export class PostUpload implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Post-Upload',
		name: 'postUpload',
		icon: { light: 'file:../../icons/post-upload.svg', dark: 'file:../../icons/post-upload.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Publish videos, photos and text to Instagram, YouTube, TikTok, Facebook, X, LinkedIn and 10 more networks in one step, then schedule, track and analyse your posts',
		defaults: { name: 'Post-Upload' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'postUploadApi', required: true }],
		properties: [
			// ── Resource ─────────────────────────────────────────────────────────
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Analytics', value: 'analytics' },
					{ name: 'Post', value: 'post' },
					{ name: 'Profile', value: 'profile' },
					{ name: 'Schedule', value: 'schedule' },
					{ name: 'Upload', value: 'upload' },
				],
				default: 'upload',
			},

			// ── Upload operations ─────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['upload'] } },
				options: [
					{ name: 'Upload a Video', value: 'video', description: 'Upload a video to one or more platforms', action: 'Upload a video' },
					{ name: 'Upload Photos', value: 'photos', description: 'Upload photos or a carousel to one or more platforms', action: 'Upload photos' },
					{ name: 'Post Text', value: 'text', description: 'Post text-only content to one or more platforms', action: 'Post text' },
				],
				default: 'video',
			},

			// ── Post operations ───────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['post'] } },
				options: [
					{ name: 'Get Upload Status', value: 'status', description: 'Check the status of an upload by request ID', action: 'Get upload status' },
					{ name: 'Get Upload History', value: 'history', description: 'List past uploads for your account', action: 'Get upload history' },
					{ name: 'Delete Upload', value: 'delete', description: 'Delete an upload record by ID', action: 'Delete an upload' },
				],
				default: 'status',
			},

			// ── Schedule operations ───────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['schedule'] } },
				options: [
					{ name: 'List Scheduled Posts', value: 'list', description: 'List all scheduled posts for your account', action: 'List scheduled posts' },
					{ name: 'Cancel Scheduled Post', value: 'cancel', description: 'Cancel a scheduled post by job ID', action: 'Cancel a scheduled post' },
					{ name: 'Edit Scheduled Post', value: 'edit', description: 'Change the date, title or description of a scheduled post', action: 'Edit a scheduled post' },
				],
				default: 'list',
			},

			// ── Analytics operations ──────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['analytics'] } },
				options: [
					{ name: 'Get Overview', value: 'overview', description: 'Get high-level analytics across all profiles', action: 'Get analytics overview' },
					{ name: 'Get Profile Analytics', value: 'profile', description: 'Get detailed analytics for a specific profile', action: 'Get profile analytics' },
				],
				default: 'overview',
			},

			// ── Profile operations ────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['profile'] } },
				options: [
					{ name: 'List', value: 'list', description: 'List all profiles on your account', action: 'List profiles' },
					{ name: 'Get', value: 'get', description: 'Get details for a specific profile', action: 'Get a profile' },
					{ name: 'Create', value: 'create', description: 'Create a new profile', action: 'Create a profile' },
					{ name: 'Delete', value: 'delete', description: 'Delete a profile by name', action: 'Delete a profile' },
				],
				default: 'list',
			},

			// ── Shared: Profile name ──────────────────────────────────────────
			{
				displayName: 'Profile Name',
				name: 'profile',
				type: 'string',
				default: '',
				required: true,
				description: 'The Post-Upload profile name',
				displayOptions: {
					show: {
						resource: ['upload', 'profile'],
						operation: ['video', 'photos', 'text', 'get', 'create', 'delete'],
					},
				},
			},

			// ── Shared: Platforms (one list per content type, same parameter name) ──
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: platformOptions(VIDEO_PLATFORMS),
				default: [],
				required: true,
				description: 'Networks to publish the video to. Each must be connected to the profile in the Post-Upload dashboard.',
				displayOptions: { show: { resource: ['upload'], operation: ['video'] } },
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: platformOptions(PHOTO_PLATFORMS),
				default: [],
				required: true,
				description: 'Networks to publish the photos to. Each must be connected to the profile in the Post-Upload dashboard.',
				displayOptions: { show: { resource: ['upload'], operation: ['photos'] } },
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: platformOptions(TEXT_PLATFORMS),
				default: [],
				required: true,
				description: 'Networks to publish the text post to. Each must be connected to the profile in the Post-Upload dashboard.',
				displayOptions: { show: { resource: ['upload'], operation: ['text'] } },
			},

			// ── Shared: Title and Description ───────────────────────────────
			{
				displayName: 'Title / Caption',
				name: 'title',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				required: true,
				description: 'The post text. It is the video title on YouTube and the caption everywhere else; with a Description, most networks post "Title, blank line, Description".',
				displayOptions: { show: { resource: ['upload'], operation: ['video', 'photos', 'text'] } },
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				description: 'Optional longer text: the YouTube video description, and added below the title on the other networks. Leave empty to post the title only.',
				displayOptions: { show: { resource: ['upload'], operation: ['video', 'photos', 'text'] } },
			},

			// ── Video: source ─────────────────────────────────────────────────
			{
				displayName: 'Video Source',
				name: 'videoSource',
				type: 'options',
				options: [
					{ name: 'URL', value: 'url', description: 'Provide a publicly accessible video URL' },
					{ name: 'Binary Data', value: 'binary', description: 'Use the binary file from a previous node' },
				],
				default: 'url',
				displayOptions: { show: { resource: ['upload'], operation: ['video'] } },
			},
			{
				displayName: 'Video URL',
				name: 'videoUrl',
				type: 'string',
				default: '',
				required: true,
				description: 'Publicly accessible URL of the video file',
				displayOptions: { show: { resource: ['upload'], operation: ['video'], videoSource: ['url'] } },
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property containing the video file',
				displayOptions: { show: { resource: ['upload'], operation: ['video'], videoSource: ['binary'] } },
			},

			// ── Photos: source ────────────────────────────────────────────────
			{
				displayName: 'Photo Source',
				name: 'photoSource',
				type: 'options',
				options: [
					{ name: 'URLs (One per Line)', value: 'urls' },
					{ name: 'Binary Data', value: 'binary' },
				],
				default: 'urls',
				displayOptions: { show: { resource: ['upload'], operation: ['photos'] } },
			},
			{
				displayName: 'Photo URLs',
				name: 'photoUrls',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				required: true,
				description: 'One photo URL per line (up to 10 for carousels)',
				displayOptions: { show: { resource: ['upload'], operation: ['photos'], photoSource: ['urls'] } },
			},
			{
				displayName: 'Binary Properties',
				name: 'binaryPhotoProperties',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Comma-separated binary property names (e.g. "data,photo2,photo3")',
				displayOptions: { show: { resource: ['upload'], operation: ['photos'], photoSource: ['binary'] } },
			},

			// ── Upload additional options ──────────────────────────────────────
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['upload'], operation: ['video', 'photos', 'text'] } },
				options: [
					{
						displayName: 'Add to Queue',
						name: 'addToQueue',
						type: 'boolean',
						default: false,
						description: 'Whether to post at the next pre-configured queue slot instead of immediately',
					},
					{
						displayName: 'Async Upload',
						name: 'asyncUpload',
						type: 'boolean',
						default: true,
						description: 'Whether to return immediately with an upload_id and publish in the background (poll Get Upload Status). Off = wait up to ~50 s for the per-platform result in the same response.',
					},
					{
						displayName: 'First Comment',
						name: 'firstComment',
						type: 'string',
						default: '',
						description: 'First comment to post immediately after publishing (Instagram, YouTube)',
					},
					{
						displayName: 'Request ID',
						name: 'requestId',
						type: 'string',
						default: '',
						description: 'Custom identifier for tracking this upload in downstream nodes',
					},
					{
						displayName: 'Schedule At',
						name: 'schedule',
						type: 'dateTime',
						default: '',
						description: 'ISO-8601 datetime to schedule the post (leave blank to post immediately)',
					},
					{
						displayName: 'Timezone',
						name: 'timezone',
						type: 'string',
						default: '',
						placeholder: 'America/New_York',
						description: 'Timezone for the scheduled datetime',
					},
				],
			},

			// ── Upload: platform-specific options ───────────────────────────────
			{
				displayName: 'Platform Options',
				name: 'platformOptions',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Platform Option',
				default: {},
				description: 'Platform-specific form fields sent as-is, e.g. privacy_level (required for TikTok), pinterest_board_id (required for Pinterest), reddit_subreddit (required for Reddit), youtube_privacy, youtube_tags, target_linkedin_page_id. Full list: https://docs.post-upload.com/platform-guides/tiktok and the other platform guides.',
				displayOptions: { show: { resource: ['upload'], operation: ['video', 'photos', 'text'] } },
				options: [
					{
						displayName: 'Option',
						name: 'option',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'privacy_level',
								description: 'API field name, e.g. privacy_level, pinterest_board_id, reddit_subreddit, youtube_privacy',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'PUBLIC_TO_EVERYONE',
							},
						],
					},
				],
			},

			// ── Post: Get Status ──────────────────────────────────────────────
			{
				displayName: 'Request ID',
				name: 'requestId',
				type: 'string',
				default: '',
				required: true,
				description: 'The upload_id or request_id returned by a previous upload',
				displayOptions: { show: { resource: ['post'], operation: ['status'] } },
			},

			// ── Post: Delete ──────────────────────────────────────────────────
			{
				displayName: 'Upload ID',
				name: 'uploadId',
				type: 'string',
				default: '',
				required: true,
				description: 'The upload ID to delete',
				displayOptions: { show: { resource: ['post'], operation: ['delete'] } },
			},

			// ── Post: History options ─────────────────────────────────────────
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
				displayOptions: { show: { resource: ['post'], operation: ['history'] } },
			},

			// ── Schedule: Cancel / Edit ───────────────────────────────────────
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				default: '',
				required: true,
				description: 'The scheduled post job ID',
				displayOptions: { show: { resource: ['schedule'], operation: ['cancel', 'edit'] } },
			},
			{
				displayName: 'New Scheduled Date',
				name: 'scheduledDate',
				type: 'dateTime',
				default: '',
				description: 'New date and time for the scheduled post (ISO-8601)',
				displayOptions: { show: { resource: ['schedule'], operation: ['edit'] } },
			},
			{
				displayName: 'New Title / Caption',
				name: 'newTitle',
				type: 'string',
				default: '',
				description: 'Replaces the title (caption) of the scheduled post. Leave empty to keep it.',
				displayOptions: { show: { resource: ['schedule'], operation: ['edit'] } },
			},
			{
				displayName: 'New Description',
				name: 'newDescription',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Replaces the description of the scheduled post. Leave empty to keep it.',
				displayOptions: { show: { resource: ['schedule'], operation: ['edit'] } },
			},
			{
				displayName: 'Timezone',
				name: 'editTimezone',
				type: 'string',
				default: '',
				placeholder: 'America/New_York',
				description: 'Timezone for the new scheduled date',
				displayOptions: { show: { resource: ['schedule'], operation: ['edit'] } },
			},

			// ── Analytics: Profile ────────────────────────────────────────────
			{
				displayName: 'Profile Name',
				name: 'analyticsProfile',
				type: 'string',
				default: '',
				required: true,
				description: 'Profile name to fetch analytics for',
				displayOptions: { show: { resource: ['analytics'], operation: ['profile'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('postUploadApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let responseData: IDataObject | IDataObject[];

				// ── Upload ────────────────────────────────────────────────────
				if (resource === 'upload') {
					const profile = this.getNodeParameter('profile', i) as string;
					const platforms = this.getNodeParameter('platforms', i) as string[];
					const title = this.getNodeParameter('title', i) as string;
					const description = this.getNodeParameter('description', i, '') as string;
					const opts = this.getNodeParameter('additionalOptions', i) as IDataObject;
					const platformOptions = this.getNodeParameter('platformOptions', i, {}) as IDataObject;

					if (!platforms.length) {
						throw new NodeOperationError(this.getNode(), 'Select at least one platform', { itemIndex: i });
					}

					if (operation === 'text') {
						const form = new FormData();
						form.append('user', profile);
						form.append('title', title);
						if (description) form.append('description', description);
						for (const p of platforms) form.append('platform[]', p);
						appendUploadOpts(form, opts, platformOptions);
						responseData = await apiRequest.call(this, i, { method: 'POST', url: `${baseUrl}/api/upload_text`, body: form });

					} else if (operation === 'video') {
						const source = this.getNodeParameter('videoSource', i) as string;
						const form = new FormData();
						form.append('user', profile);
						form.append('title', title);
						if (description) form.append('description', description);
						for (const p of platforms) form.append('platform[]', p);
						appendUploadOpts(form, opts, platformOptions);
						if (source === 'url') {
							form.append('video_url', this.getNodeParameter('videoUrl', i) as string);
						} else {
							const prop = this.getNodeParameter('binaryPropertyName', i) as string;
							const bin = this.helpers.assertBinaryData(i, prop);
							const buf = await this.helpers.getBinaryDataBuffer(i, prop);
							form.append('video', new Blob([buf], { type: bin.mimeType }), bin.fileName ?? 'video.mp4');
						}
						responseData = await apiRequest.call(this, i, { method: 'POST', url: `${baseUrl}/api/upload`, body: form });

					} else {
						// photos
						const source = this.getNodeParameter('photoSource', i) as string;
						const form = new FormData();
						form.append('user', profile);
						form.append('title', title);
						if (description) form.append('description', description);
						for (const p of platforms) form.append('platform[]', p);
						appendUploadOpts(form, opts, platformOptions);
						if (source === 'urls') {
							const urls = (this.getNodeParameter('photoUrls', i) as string).split('\n').map(u => u.trim()).filter(Boolean);
							for (const url of urls) form.append('photo_urls[]', url);
						} else {
							const props = (this.getNodeParameter('binaryPhotoProperties', i) as string).split(',').map(p => p.trim()).filter(Boolean);
							for (const prop of props) {
								const bin = this.helpers.assertBinaryData(i, prop);
								const buf = await this.helpers.getBinaryDataBuffer(i, prop);
								form.append('photos[]', new Blob([buf], { type: bin.mimeType }), bin.fileName ?? 'photo.jpg');
							}
						}
						responseData = await apiRequest.call(this, i, { method: 'POST', url: `${baseUrl}/api/upload_photos`, body: form });
					}

				// ── Post ──────────────────────────────────────────────────────
				} else if (resource === 'post') {
					if (operation === 'status') {
						const requestId = this.getNodeParameter('requestId', i) as string;
						responseData = await apiRequest.call(this, i, { method: 'GET', url: `${baseUrl}/api/uploadposts/status`, qs: { request_id: requestId } });
					} else if (operation === 'history') {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = await apiRequest.call(this, i, { method: 'GET', url: `${baseUrl}/api/uploadposts/history`, qs: { limit } });
					} else {
						const uploadId = this.getNodeParameter('uploadId', i) as string;
						responseData = await apiRequest.call(this, i, { method: 'DELETE', url: `${baseUrl}/api/uploads/${encodeURIComponent(uploadId)}` });
					}

				// ── Schedule ──────────────────────────────────────────────────
				} else if (resource === 'schedule') {
					if (operation === 'list') {
						responseData = await apiRequest.call(this, i, { method: 'GET', url: `${baseUrl}/api/schedule` });
					} else if (operation === 'cancel') {
						const jobId = this.getNodeParameter('jobId', i) as string;
						responseData = await apiRequest.call(this, i, { method: 'DELETE', url: `${baseUrl}/api/schedule/${encodeURIComponent(jobId)}` });
					} else {
						const jobId = this.getNodeParameter('jobId', i) as string;
						const body: IDataObject = {};
						const scheduledDate = this.getNodeParameter('scheduledDate', i) as string;
						const newTitle = this.getNodeParameter('newTitle', i) as string;
						const editTimezone = this.getNodeParameter('editTimezone', i) as string;
						if (scheduledDate) body.scheduled_date = scheduledDate;
						if (newTitle) body.title = newTitle;
						const newDescription = this.getNodeParameter('newDescription', i, '') as string;
						if (newDescription) body.caption = newDescription;
						if (editTimezone) body.timezone = editTimezone;
						responseData = await apiRequest.call(this, i, { method: 'PATCH', url: `${baseUrl}/api/schedule/${encodeURIComponent(jobId)}`, body, headers: { 'Content-Type': 'application/json' } });
					}

				// ── Analytics ─────────────────────────────────────────────────
				} else if (resource === 'analytics') {
					if (operation === 'overview') {
						responseData = await apiRequest.call(this, i, { method: 'GET', url: `${baseUrl}/api/analytics/overview` });
					} else {
						const profileName = this.getNodeParameter('analyticsProfile', i) as string;
						responseData = await apiRequest.call(this, i, { method: 'GET', url: `${baseUrl}/api/analytics/profile/${encodeURIComponent(profileName)}` });
					}

				// ── Profile ───────────────────────────────────────────────────
				} else {
					if (operation === 'list') {
						responseData = await apiRequest.call(this, i, { method: 'GET', url: `${baseUrl}/api/profiles` });
					} else if (operation === 'get') {
						const profileName = this.getNodeParameter('profile', i) as string;
						responseData = await apiRequest.call(this, i, { method: 'GET', url: `${baseUrl}/api/profiles/${encodeURIComponent(profileName)}` });
					} else if (operation === 'create') {
						const profileName = this.getNodeParameter('profile', i) as string;
						responseData = await apiRequest.call(this, i, { method: 'POST', url: `${baseUrl}/api/profiles`, body: { name: profileName }, headers: { 'Content-Type': 'application/json' } });
					} else {
						const profileName = this.getNodeParameter('profile', i) as string;
						responseData = await apiRequest.call(this, i, { method: 'DELETE', url: `${baseUrl}/api/profiles/${encodeURIComponent(profileName)}` });
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
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

function appendUploadOpts(form: FormData, opts: IDataObject, platformOptions: IDataObject = {}): void {
	if (opts.schedule) form.append('schedule', opts.schedule as string);
	if (opts.addToQueue) form.append('add_to_queue', 'true');
	// Always explicit: true = respond immediately (API default), false = wait for the result.
	form.append('async_upload', opts.asyncUpload === false ? 'false' : 'true');
	if (opts.requestId) form.append('request_id', opts.requestId as string);
	if (opts.firstComment) form.append('first_comment', opts.firstComment as string);
	if (opts.timezone) form.append('timezone', opts.timezone as string);
	// Platform options: sent as plain form fields (privacy_level, pinterest_board_id, …).
	const entries = (platformOptions.option as IDataObject[] | undefined) ?? [];
	for (const entry of entries) {
		const name = String(entry.name ?? '').trim();
		if (!name) continue;
		form.append(name, String(entry.value ?? ''));
	}
}

// Every API call goes through here so a 4xx/5xx surfaces the API's own
// message ("Too many photos: 11…", "Profile not found", …) and error_code
// instead of n8n's generic "Bad request - please check your parameters".
async function apiRequest(this: IExecuteFunctions, itemIndex: number, options: IHttpRequestOptions & { method: IHttpRequestMethods }): Promise<IDataObject> {
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'postUploadApi', {
		...options,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	})) as { statusCode: number; body: unknown };
	const body = parseBody(response.body);
	if (response.statusCode >= 400) {
		const message = String(body.error ?? body.message ?? `Post-Upload API returned HTTP ${response.statusCode}`);
		const rest: IDataObject = { ...body };
		delete rest.error;
		delete rest.message;
		const error = new NodeApiError(this.getNode(), body as JsonObject, {
			message,
			description: Object.keys(rest).length ? JSON.stringify(rest) : undefined,
			httpCode: String(response.statusCode),
			itemIndex,
		});
		(error as NodeApiError & { postUploadBody?: IDataObject }).postUploadBody = body;
		throw error;
	}
	return body;
}

function parseBody(body: unknown): IDataObject {
	if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body as IDataObject;
	const text = Buffer.isBuffer(body) ? body.toString('utf8') : String(body ?? '');
	if (!text) return {};
	try {
		const parsed = JSON.parse(text);
		return parsed && typeof parsed === 'object' ? (parsed as IDataObject) : { data: parsed };
	} catch {
		return { message: text.slice(0, 500) };
	}
}

// Errors leave the node as NodeApiError (API responses, with HTTP code and the
// API's message) or NodeOperationError (everything else) so the n8n UI keeps
// the context.
function toNodeError(node: INode, error: unknown, itemIndex: number): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) return error;
	return new NodeOperationError(node, error as Error, { itemIndex });
}
