# Changelog

## 1.3.3
- Package author contact is now n8n@post-upload.com. No code changes.

## 1.3.2
- With **On Error → Continue (using error output)**, API errors (for example a platform that isn't connected) now go to the error output instead of the success output. The item still carries `error`, `error_code` and `http_code`.

## 1.3.1
- Built and published with the n8n node CLI from GitHub Actions, with npm provenance.
- Light and dark icons; the node can be used as an AI agent tool.
- Resources and options listed alphabetically; Profile operations are named List, Get, Create and Delete.

## 1.3.0
- New **Description** field on every upload, and **New Description** when editing a scheduled post.
- API errors show the API's message and `error_code` instead of n8n's generic "Bad request - please check your parameters".
- The **Platforms** list is filtered to the networks that support the chosen content type.
- Removed **Upload a Document**: no network accepts documents through the API yet, so it always failed.
- New icon matching the Post-Upload logo, also shown on the credential.

## 1.2.0
- Photo URLs are sent as `photo_urls[]`.
- New **Platform Options** name/value list on every upload operation.
- **Async Upload** is a real on/off switch, default on.

## 1.1.0
- Initial public release.
