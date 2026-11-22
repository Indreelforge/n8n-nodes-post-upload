# n8n-nodes-post-upload

Official [Post-Upload](https://post-upload.com) community node for n8n. Publish videos, photos and text to **22 social networks** from a single node, then schedule, track and analyse your posts. No per-platform credentials needed.

## Supported platforms

Instagram · YouTube · TikTok · Facebook · X (Twitter) · LinkedIn · Threads · Pinterest · Reddit · Bluesky · Google Business Profile · Discord · Telegram · Slack · Mastodon · WordPress · Dev.to · Hashnode · Lemmy · Nostr · Whop · Listmonk

Discord, Telegram, Slack, Mastodon, WordPress, Dev.to, Hashnode, Lemmy, Nostr, Whop and Listmonk are connected once in the Post-Upload dashboard, or from n8n with *Profile → Connect Webhook or Bot Platform* (webhook URL, bot token, access token, API key, password or private key) — see https://docs.post-upload.com/platform-guides/discord and the other platform guides.

## Installation

In n8n: **Settings → Community Nodes → Install** → enter `n8n-nodes-post-upload`

Or via npm:

```bash
npm install n8n-nodes-post-upload
```

## Credentials

The node uses one credential type, **Post-Upload API**: an API key and the API base URL (default `https://api.post-upload.com`). n8n tests it against `GET /api/profiles` when you save it.

Create a Post-Upload account at [post-upload.com](https://post-upload.com), then:

1. Enable 2FA on your account
2. Go to **Dashboard → API Keys → New Key**
3. In n8n, add a new **Post-Upload API** credential and paste your key

## Available actions

76 actions in one **Post-Upload** node, plus the **Post-Upload Trigger**:

| Resource | Operations |
|----------|-----------|
| Upload | Upload a Video (URL or binary) · Upload Photos (1–10, URLs or binary) · Post Text |
| Post | Get Upload Status · Get Upload History · Get Upload · Retry Failed Upload · Delete Upload |
| Schedule | List · Edit · Cancel Scheduled Post · Get Calendar Month · Get Calendar Stats |
| Queue | Get Settings · Update Settings · Get Next Slot · Preview Slots · Mark Slot Full · Unmark Slot Full |
| Analytics | Overview · Profile · Live Platform Stats · Post · Upload Counts · Top Posts · Platform Performance · Views · Activity · YouTube Stats |
| Profile | List · Get · Create · Delete · Get Connected Accounts · Get Connect Link · Connect Webhook or Bot Platform · Connect Bluesky · Disconnect Platform · Sync Connections · Get TikTok Creator Info · Create / Revoke Whitelabel Link |
| Platform | List Facebook Pages · List Google Business Locations · List LinkedIn Pages · List / Create Pinterest Boards · List Recent Media · List Reddit Posts · Get Supported Metrics |
| Account | Get · Get Platform Limits · Get X Allowance · Get YouTube Allowance · Get System Status |
| Webhook | Get / Set Account Webhook · List Deliveries · Rotate Secret · Send Test Event · List / Get / Create / Delete Subscriptions · Send Test Event to Subscription |
| Whitelabel | Generate Connect Link · Validate Connect Link |
| Video Tool | Convert · Resize · Trim · Add Watermark · Run FFmpeg Command · Get Job · List Jobs · Download Output · Get Usage |

**Post-Upload Trigger** starts a workflow on `upload.completed`, `upload.partial`, `upload.failed` or `scheduled_post_published` (optionally for one profile). When the workflow is activated it creates its own webhook subscription with its own signing secret, checks `X-Post-Upload-Signature` on every request, and removes the subscription when the workflow is deactivated. Webhooks need the Post-Upload Advanced plan or higher, and n8n must be reachable over public https.

Every upload takes a **Title / Caption** and an optional **Description**. YouTube uses them as the video title and description; the other networks post the title, a blank line, then the description.

The **Platforms** list only offers the networks that accept the chosen content type (for example, Slack, Reddit and Dev.to are text-only, and YouTube is video-only).

Dev.to, Hashnode, Lemmy and Listmonk need a title: the **Title / Caption** is the article title (Dev.to, Hashnode), the post title (Lemmy) or the email subject (Listmonk), and the **Description** is the Markdown body.

When the API rejects a request, the node shows the API's own message and `error_code` (for example "Too many photos: 11…"). With **Continue On Fail**, the item carries `error`, `error_code` and `http_code`.

Upload operations take a **Platform Options** list of name/value pairs that are sent as form fields — use it for platform-specific settings such as `privacy_level` (required for TikTok), `pinterest_board_id` (Pinterest), `reddit_subreddit` (Reddit), `youtube_privacy`, `devto_tags` / `devto_published` (Dev.to), `hashnode_subtitle` (Hashnode), `lemmy_url` / `lemmy_nsfw` (Lemmy) or `listmonk_draft` (Listmonk).

## Example workflows

**Post a new YouTube video to every network.** RSS Feed Trigger (your channel feed) → Post-Upload: *Upload → Post Text*, Platforms: X, LinkedIn, Threads, Bluesky, Title: `New video: {{ $json.title }} {{ $json.link }}`.

**Publish a photo carousel from Google Drive.** Google Drive Trigger → Google Drive (Download) → Post-Upload: *Upload → Upload Photos*, Photo Source: Binary Data, Platforms: Instagram, Facebook, Pinterest (add the `pinterest_board_id` platform option).

**Schedule a video for later and check it went out.** Post-Upload: *Upload → Upload a Video* with Additional Options → Schedule At → Wait (until the scheduled time) → Post-Upload: *Post → Get Upload Status* with `{{ $('Post-Upload').item.json.data.upload_id }}`.

**Alert on failed posts.** Post-Upload Trigger (event: Upload Failed) → Slack or Post-Upload *Post Text* with the `platform_errors` of the event.

**Use it as an AI agent tool.** The node is usable as a tool, so an AI Agent node can call Post-Upload to publish or schedule posts. On self-hosted n8n set `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`.

## Compatibility

Tested with n8n 2.x. Requires a Post-Upload account with an API key.

## Development

```bash
npm ci
npm run lint
npm test        # builds, then runs the tests in test/ (no network)
```

`test/operations.test.cjs` holds the API contract of every operation (method, path, fields); adding an operation without a contract row fails the suite. CI runs lint, build and tests on every push, and the publish workflow runs the tests before anything reaches npm.

## Docs

Full API reference: [docs.post-upload.com](https://docs.post-upload.com)

## License

MIT
