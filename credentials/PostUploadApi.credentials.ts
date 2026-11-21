import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	Icon,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PostUploadApi implements ICredentialType {
	name = 'postUploadApi';
	displayName = 'Post-Upload API';
	icon: Icon = { light: 'file:../icons/post-upload.svg', dark: 'file:../icons/post-upload.dark.svg' };
	documentationUrl = 'https://docs.post-upload.com/api-reference/authentication';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			hint: 'Dashboard → API Keys → New Key (2FA must be enabled)',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.post-upload.com',
			hint: 'Change only if using a self-hosted instance',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Apikey {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/profiles',
		},
	};
}
