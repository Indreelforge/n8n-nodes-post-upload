import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import type { ResourceModule } from '../GenericFunctions';
import { apiRequest, binaryBlob, downloadBinary, enc, showFor } from '../GenericFunctions';

// FFmpeg runs synchronously on the server (up to 5 min, 10 min for custom
// commands), so these calls wait longer than n8n's default HTTP timeout.
const LONG_TIMEOUT = 11 * 60 * 1000;
const FILE_OPS = ['convert', 'resize', 'trim', 'watermark'];

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['videoTool'] } },
		options: [
			{ name: 'Add Watermark', value: 'watermark', description: 'Burn a text watermark into a video', action: 'Add a watermark' },
			{ name: 'Convert', value: 'convert', description: 'Convert a video to MP4, WebM, MOV, AVI or GIF', action: 'Convert a video' },
			{ name: 'Download Output', value: 'download', description: 'Download the processed file of a finished job as binary data', action: 'Download a job output' },
			{ name: 'Get Job', value: 'getJob', description: 'Get the status and output URL of a processing job', action: 'Get a job' },
			{ name: 'Get Usage', value: 'usage', description: 'Get the processing minutes used and left this month', action: 'Get usage' },
			{ name: 'List Jobs', value: 'listJobs', description: 'List the last 50 processing jobs', action: 'List jobs' },
			{ name: 'Resize', value: 'resize', description: 'Resize a video, e.g. to 1080×1920 for Reels and Shorts', action: 'Resize a video' },
			{ name: 'Run FFmpeg Command', value: 'runCommand', description: 'Run your own FFmpeg command on up to three input files', action: 'Run an f fmpeg command' },
			{ name: 'Trim', value: 'trim', description: 'Cut a section out of a video', action: 'Trim a video' },
		],
		default: 'resize',
	},
];

const fields: INodeProperties[] = [
	{
		displayName: 'Input Binary Property',
		name: 'videoBinaryProperty',
		type: 'string',
		default: 'data',
		required: true,
		description: 'Binary property that holds the video (max 500 MB)',
		displayOptions: showFor('videoTool', FILE_OPS),
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{ name: 'AVI', value: 'avi' },
			{ name: 'GIF', value: 'gif' },
			{ name: 'MOV', value: 'mov' },
			{ name: 'MP4', value: 'mp4' },
			{ name: 'WebM', value: 'webm' },
		],
		default: 'mp4',
		displayOptions: showFor('videoTool', ['convert']),
	},
	{
		displayName: 'Width',
		name: 'width',
		type: 'number',
		typeOptions: { minValue: 16 },
		default: 1080,
		displayOptions: showFor('videoTool', ['resize']),
	},
	{
		displayName: 'Height',
		name: 'height',
		type: 'number',
		typeOptions: { minValue: 16 },
		default: 1920,
		displayOptions: showFor('videoTool', ['resize']),
	},
	{
		displayName: 'Start (Seconds)',
		name: 'start',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		displayOptions: showFor('videoTool', ['trim']),
	},
	{
		displayName: 'Duration (Seconds)',
		name: 'duration',
		type: 'number',
		typeOptions: { minValue: 0.1 },
		default: 30,
		required: true,
		displayOptions: showFor('videoTool', ['trim']),
	},
	{
		displayName: 'Text',
		name: 'watermarkText',
		type: 'string',
		default: '',
		required: true,
		description: 'Watermark text (max 200 characters)',
		displayOptions: showFor('videoTool', ['watermark']),
	},
	{
		displayName: 'Position',
		name: 'position',
		type: 'options',
		options: [
			{ name: 'Bottom Left', value: 'bottom-left' },
			{ name: 'Bottom Right', value: 'bottom-right' },
			{ name: 'Center', value: 'center' },
			{ name: 'Top Left', value: 'top-left' },
			{ name: 'Top Right', value: 'top-right' },
		],
		default: 'bottom-right',
		displayOptions: showFor('videoTool', ['watermark']),
	},
	{
		displayName: 'Font Size',
		name: 'fontSize',
		type: 'number',
		typeOptions: { minValue: 8, maxValue: 128 },
		default: 24,
		displayOptions: showFor('videoTool', ['watermark']),
	},
	{
		displayName: 'FFmpeg Command',
		name: 'fullCommand',
		type: 'string',
		typeOptions: { rows: 3 },
		default: 'ffmpeg -i {input} -vf "scale=1080:-2" {output}',
		required: true,
		description: 'Must start with ffmpeg. Use {input} (or {input0}, {input1}, {input2}) and {output} as placeholders; shell operators and paths are not allowed.',
		displayOptions: showFor('videoTool', ['runCommand']),
	},
	{
		displayName: 'Output Extension',
		name: 'outputExtension',
		type: 'string',
		default: 'mp4',
		required: true,
		description: 'File type of the result, e.g. mp4, webm, mp3, gif, png',
		displayOptions: showFor('videoTool', ['runCommand']),
	},
	{
		displayName: 'Input Source',
		name: 'commandInputSource',
		type: 'options',
		options: [
			{ name: 'URLs', value: 'urls', description: 'Public URLs the server downloads' },
			{ name: 'Binary Data', value: 'binary', description: 'Files from previous nodes' },
		],
		default: 'urls',
		displayOptions: showFor('videoTool', ['runCommand']),
	},
	{
		displayName: 'Input URLs',
		name: 'commandUrls',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		description: 'One public URL per line, up to 3 ({input0}, {input1}, {input2})',
		displayOptions: { show: { resource: ['videoTool'], operation: ['runCommand'], commandInputSource: ['urls'] } },
	},
	{
		displayName: 'Input Binary Properties',
		name: 'commandBinaryProperties',
		type: 'string',
		default: 'data',
		required: true,
		description: 'Comma-separated binary properties, up to 3 ({input0}, {input1}, {input2})',
		displayOptions: { show: { resource: ['videoTool'], operation: ['runCommand'], commandInputSource: ['binary'] } },
	},
	{
		displayName: 'Job ID',
		name: 'ffmpegJobId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: showFor('videoTool', ['download', 'getJob']),
	},
	{
		displayName: 'Put Output File in Field',
		name: 'outputBinaryProperty',
		type: 'string',
		default: 'data',
		required: true,
		description: 'Binary property to store the downloaded file in',
		displayOptions: showFor('videoTool', ['download']),
	},
];

async function fileForm(this: IExecuteFunctions, i: number, extra: IDataObject): Promise<FormData> {
	const form = new FormData();
	const { blob, fileName } = await binaryBlob.call(this, i, this.getNodeParameter('videoBinaryProperty', i) as string, 'video.mp4');
	form.append('video', blob, fileName);
	for (const [key, value] of Object.entries(extra)) form.append(key, String(value));
	return form;
}

const process = (path: string, params: (this: IExecuteFunctions, i: number) => IDataObject) =>
	async function (this: IExecuteFunctions, i: number, base: string) {
		const body = await fileForm.call(this, i, params.call(this, i));
		return apiRequest.call(this, i, { method: 'POST', url: `${base}${path}`, body, timeout: LONG_TIMEOUT });
	};

export const videoTool: ResourceModule = {
	operations,
	fields,
	handlers: {
		convert: process('/api/ffmpeg/convert', function (i) {
			return { format: this.getNodeParameter('format', i) };
		}),
		resize: process('/api/ffmpeg/resize', function (i) {
			return { width: this.getNodeParameter('width', i), height: this.getNodeParameter('height', i) };
		}),
		trim: process('/api/ffmpeg/trim', function (i) {
			return { start: this.getNodeParameter('start', i), duration: this.getNodeParameter('duration', i) };
		}),
		watermark: process('/api/ffmpeg/watermark', function (i) {
			return { text: this.getNodeParameter('watermarkText', i), position: this.getNodeParameter('position', i), fontSize: this.getNodeParameter('fontSize', i) };
		}),
		async runCommand(i, base) {
			const full_command = this.getNodeParameter('fullCommand', i) as string;
			const output_extension = this.getNodeParameter('outputExtension', i) as string;
			if (this.getNodeParameter('commandInputSource', i) === 'urls') {
				const files = (this.getNodeParameter('commandUrls', i) as string).split('\n').map((u) => u.trim()).filter(Boolean).slice(0, 3);
				return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/ffmpeg/jobs/upload`, body: { full_command, output_extension, files }, timeout: LONG_TIMEOUT });
			}
			const form = new FormData();
			form.append('full_command', full_command);
			form.append('output_extension', output_extension);
			const props = (this.getNodeParameter('commandBinaryProperties', i) as string).split(',').map((p) => p.trim()).filter(Boolean).slice(0, 3);
			for (const [index, prop] of props.entries()) {
				const { blob, fileName } = await binaryBlob.call(this, i, prop, `input${index}`);
				form.append(index === 0 ? 'file' : `file${index}`, blob, fileName);
			}
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/ffmpeg/jobs/upload`, body: form, timeout: LONG_TIMEOUT });
		},
		async getJob(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/ffmpeg/jobs/${enc(this.getNodeParameter('ffmpegJobId', i))}` });
		},
		async listJobs(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/ffmpeg/jobs` });
		},
		async usage(i, base) {
			return apiRequest.call(this, i, { method: 'GET', url: `${base}/api/ffmpeg/usage` });
		},
		async download(i, base) {
			const jobId = this.getNodeParameter('ffmpegJobId', i) as string;
			return downloadBinary.call(this, i, `${base}/api/ffmpeg/download/${enc(jobId)}`, this.getNodeParameter('outputBinaryProperty', i) as string, `${jobId}.mp4`);
		},
	},
};
