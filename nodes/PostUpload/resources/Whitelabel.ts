import type { IDataObject, INodeProperties } from 'n8n-workflow';
import type { ResourceModule } from '../GenericFunctions';
import { apiRequest, compact, OAUTH_PLATFORMS, platformOptions, showFor } from '../GenericFunctions';

const operations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['whitelabel'] } },
		options: [
			{ name: 'Generate Connect Link', value: 'generateLink', description: 'Create a branded page where your end user connects their social accounts', action: 'Generate a connect link' },
			{ name: 'Validate Connect Link', value: 'validateLink', description: 'Check whether a connect link token is still valid', action: 'Validate a connect link' },
		],
		default: 'generateLink',
	},
];

const fields: INodeProperties[] = [
	{
		displayName: 'Profile Name',
		name: 'whitelabelProfile',
		type: 'string',
		default: '',
		required: true,
		description: 'Profile the end user connects their accounts to',
		displayOptions: showFor('whitelabel', ['generateLink']),
	},
	{
		displayName: 'Options',
		name: 'linkOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('whitelabel', ['generateLink']),
		options: [
			{ displayName: 'Allow Replacing Accounts', name: 'allow_replace', type: 'boolean', default: false, description: 'Whether the user may replace an account that is already connected' },
			{ displayName: 'Description', name: 'connect_description', type: 'string', default: '', description: 'Text under the page title (max 500 characters)' },
			{ displayName: 'Expires In (Hours)', name: 'expires_in_hours', type: 'number', typeOptions: { minValue: 1, maxValue: 720 }, default: 48 },
			{ displayName: 'Logo URL', name: 'logo_image', type: 'string', default: '', description: 'Https URL of your logo' },
			{ displayName: 'Platforms', name: 'platforms', type: 'multiOptions', options: platformOptions(OAUTH_PLATFORMS), default: [], description: 'Platforms offered on the page (default: all)' },
			{ displayName: 'Read Only', name: 'readonly', type: 'boolean', default: false, description: 'Whether the page only shows connections without allowing changes' },
			{ displayName: 'Read-Only Calendar', name: 'readonly_calendar', type: 'boolean', default: false, description: 'Whether the calendar on the page is view-only' },
			{ displayName: 'Redirect Button Text', name: 'redirect_button_text', type: 'string', default: 'Back to App' },
			{ displayName: 'Redirect URL', name: 'redirect_url', type: 'string', default: '', description: 'Https URL the button returns to' },
			{ displayName: 'Rotate Existing Link', name: 'rotate', type: 'boolean', default: false, description: 'Whether to invalidate the profile’s previous link' },
			{ displayName: 'Show Calendar', name: 'show_calendar', type: 'boolean', default: true, description: 'Whether to show the post calendar on the page' },
			{ displayName: 'Title', name: 'connect_title', type: 'string', default: '', description: 'Page title (max 200 characters)' },
		],
	},
	{
		displayName: 'Token',
		name: 'linkToken',
		type: 'string',
		typeOptions: { password: true },
		default: '',
		required: true,
		description: 'The token (JWT) returned by Generate Connect Link',
		displayOptions: showFor('whitelabel', ['validateLink']),
	},
];

export const whitelabel: ResourceModule = {
	operations,
	fields,
	handlers: {
		async generateLink(i, base) {
			return apiRequest.call(this, i, {
				method: 'POST',
				url: `${base}/api/whitelabel/generate-jwt`,
				body: compact({ username: this.getNodeParameter('whitelabelProfile', i), ...(this.getNodeParameter('linkOptions', i, {}) as IDataObject) }),
			});
		},
		async validateLink(i, base) {
			return apiRequest.call(this, i, { method: 'POST', url: `${base}/api/whitelabel/validate-jwt`, body: { token: this.getNodeParameter('linkToken', i) } });
		},
	},
};
