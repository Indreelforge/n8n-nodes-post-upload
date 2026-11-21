import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ResourceModule } from '../GenericFunctions';
import { apiRequest, binaryBlob, PHOTO_PLATFORMS, platformOptions, TEXT_PLATFORMS, VIDEO_PLATFORMS } from '../GenericFunctions';

const UPLOAD_OPS = ['video', 'photos', 'text'];
const show = (operation: string[], extra: IDataObject = {}) => ({ show: { resource: ['upload'], operation, ...extra } });

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['upload'] } },
		options: [
			{ name: 'Post Text', value: 'text', description: 'Post text-only content to one or more platforms', action: 'Post text' },
			{ name: 'Upload a Video', value: 'video', description: 'Upload a video to one or more platforms', action: 'Upload a video' },
			{ name: 'Upload Photos', value: 'photos', description: 'Upload photos or a carousel to one or more platforms', action: 'Upload photos' },
		],
		default: 'video',
	},
];

const fields: INodeProperties[] = [
	{
		displayName: 'Profile Name',
		name: 'profile',
		type: 'string',
		default: '',
		required: true,
		description: 'The Post-Upload profile name',
		displayOptions: show(UPLOAD_OPS),
	},
	{
		displayName: 'Platforms',
		name: 'platforms',
		type: 'multiOptions',
		options: platformOptions(VIDEO_PLATFORMS),
		default: [],
		required: true,
		description: 'Networks to publish the video to. Each must be connected to the profile in the Post-Upload dashboard.',
		displayOptions: show(['video']),
	},
	{
		displayName: 'Platforms',
		name: 'platforms',
		type: 'multiOptions',
		options: platformOptions(PHOTO_PLATFORMS),
		default: [],
		required: true,
		description: 'Networks to publish the photos to. Each must be connected to the profile in the Post-Upload dashboard.',
		displayOptions: show(['photos']),
	},
	{
		displayName: 'Platforms',
		name: 'platforms',
		type: 'multiOptions',
		options: platformOptions(TEXT_PLATFORMS),
		default: [],
		required: true,
		description: 'Networks to publish the text post to. Each must be connected to the profile in the Post-Upload dashboard.',
		displayOptions: show(['text']),
	},
	{
		displayName: 'Title / Caption',
		name: 'title',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		description: 'The post text. It is the video title on YouTube and the caption everywhere else; with a Description, most networks post "Title, blank line, Description".',
		displayOptions: show(UPLOAD_OPS),
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 5 },
		default: '',
		description: 'Optional longer text: the YouTube video description, and added below the title on the other networks. Leave empty to post the title only.',
		displayOptions: show(UPLOAD_OPS),
	},
	{
		displayName: 'Video Source',
		name: 'videoSource',
		type: 'options',
		options: [
			{ name: 'URL', value: 'url', description: 'Provide a publicly accessible video URL' },
			{ name: 'Binary Data', value: 'binary', description: 'Use the binary file from a previous node' },
		],
		default: 'url',
		displayOptions: show(['video']),
	},
	{
		displayName: 'Video URL',
		name: 'videoUrl',
		type: 'string',
		default: '',
		required: true,
		description: 'Publicly accessible URL of the video file',
		displayOptions: show(['video'], { videoSource: ['url'] }),
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		description: 'Name of the binary property containing the video file',
		displayOptions: show(['video'], { videoSource: ['binary'] }),
	},
	{
		displayName: 'Photo Source',
		name: 'photoSource',
		type: 'options',
		options: [
			{ name: 'URLs (One per Line)', value: 'urls' },
			{ name: 'Binary Data', value: 'binary' },
		],
		default: 'urls',
		displayOptions: show(['photos']),
	},
	{
		displayName: 'Photo URLs',
		name: 'photoUrls',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		description: 'One photo URL per line (up to 10 for carousels)',
		displayOptions: show(['photos'], { photoSource: ['urls'] }),
	},
	{
		displayName: 'Binary Properties',
		name: 'binaryPhotoProperties',
		type: 'string',
		default: 'data',
		required: true,
		description: 'Comma-separated binary property names (e.g. "data,photo2,photo3")',
		displayOptions: show(['photos'], { photoSource: ['binary'] }),
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show(UPLOAD_OPS),
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
	{
		displayName: 'Platform Options',
		name: 'platformOptions',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Platform Option',
		default: {},
		description: 'Platform-specific form fields sent as-is, e.g. privacy_level (required for TikTok), pinterest_board_id (required for Pinterest), reddit_subreddit (required for Reddit), youtube_privacy, youtube_tags, target_linkedin_page_id. Full list: https://docs.post-upload.com/platform-guides/tiktok and the other platform guides.',
		displayOptions: show(UPLOAD_OPS),
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
];

async function baseForm(this: IExecuteFunctions, i: number): Promise<FormData> {
	const platforms = this.getNodeParameter('platforms', i) as string[];
	if (!platforms.length) throw new NodeOperationError(this.getNode(), 'Select at least one platform', { itemIndex: i });
	const form = new FormData();
	form.append('user', this.getNodeParameter('profile', i) as string);
	form.append('title', this.getNodeParameter('title', i) as string);
	const description = this.getNodeParameter('description', i, '') as string;
	if (description) form.append('description', description);
	for (const p of platforms) form.append('platform[]', p);
	const opts = this.getNodeParameter('additionalOptions', i, {}) as IDataObject;
	if (opts.schedule) form.append('schedule', opts.schedule as string);
	if (opts.addToQueue) form.append('add_to_queue', 'true');
	// Always explicit: true = respond immediately (API default), false = wait for the result.
	form.append('async_upload', opts.asyncUpload === false ? 'false' : 'true');
	if (opts.requestId) form.append('request_id', opts.requestId as string);
	if (opts.firstComment) form.append('first_comment', opts.firstComment as string);
	if (opts.timezone) form.append('timezone', opts.timezone as string);
	// Platform options: sent as plain form fields (privacy_level, pinterest_board_id, …).
	const entries = ((this.getNodeParameter('platformOptions', i, {}) as IDataObject).option as IDataObject[] | undefined) ?? [];
	for (const entry of entries) {
		const name = String(entry.name ?? '').trim();
		if (name) form.append(name, String(entry.value ?? ''));
	}
	return form;
}

export const upload: ResourceModule = {
	operations,
	fields,
	handlers: {
		async text(i, base) {
			const form = await baseForm.call(this, i);
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/upload_text`, body: form });
		},
		async video(i, base) {
			const form = await baseForm.call(this, i);
			if (this.getNodeParameter('videoSource', i) === 'url') {
				form.append('video_url', this.getNodeParameter('videoUrl', i) as string);
			} else {
				const { blob, fileName } = await binaryBlob.call(this, i, this.getNodeParameter('binaryPropertyName', i) as string, 'video.mp4');
				form.append('video', blob, fileName);
			}
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/upload`, body: form });
		},
		async photos(i, base) {
			const form = await baseForm.call(this, i);
			if (this.getNodeParameter('photoSource', i) === 'urls') {
				const urls = (this.getNodeParameter('photoUrls', i) as string).split('\n').map((u) => u.trim()).filter(Boolean);
				for (const url of urls) form.append('photo_urls[]', url);
			} else {
				const props = (this.getNodeParameter('binaryPhotoProperties', i) as string).split(',').map((p) => p.trim()).filter(Boolean);
				for (const prop of props) {
					const { blob, fileName } = await binaryBlob.call(this, i, prop, 'photo.jpg');
					form.append('photos[]', blob, fileName);
				}
			}
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/upload_photos`, body: form });
		},
	},
};
