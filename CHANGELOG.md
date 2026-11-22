# Changelog

## 1.5.0
- Six new networks (16 → 22): **Dev.to**, **Hashnode**, **Lemmy**, **Nostr**, **Whop** and **Listmonk**, in every platform list (upload pickers filtered by content type, disconnect, analytics and platform filters).
- **Profile → Connect Webhook or Bot Platform** connects the six new networks with their own fields (API key, access token and publication ID, instance login and community, private key and relays, forum or chat ID, Listmonk API user and list IDs). Secrets are masked.
- Title, Description and Platform Options help now cover the new networks (Dev.to, Hashnode, Lemmy and Listmonk need a title; `devto_tags`, `devto_published`, `hashnode_subtitle`, `lemmy_url`, `lemmy_nsfw`, `listmonk_draft`, …).
- Existing operations and parameters are unchanged, so current workflows keep working.

## 1.4.0
- 76 actions (from 15): new Queue, Platform, Account, Webhook, Whitelabel and Video Tool resources; more Post, Schedule, Analytics and Profile operations (retry, calendar, live stats, top posts, connect links, credential and Bluesky connections, whitelabel links, …).
- New **Post-Upload Trigger** node: instant workflows on upload completed, partially failed, failed and scheduled post published, using a webhook subscription with its own signing secret (verified on every request).
- Existing operations and parameters are unchanged, so current workflows keep working.

## 1.3.3
- Package author contact is now n8n@post-upload.com. No code changes.

## 1.3.2
- With **On Error → Continue (using error output)**, API errors (for example a platform that isn't connected) now go to the error output instead of the success output, with the API's message in `error`. With **Continue (regular output)** the item also keeps `error_code` and `http_code`.

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
