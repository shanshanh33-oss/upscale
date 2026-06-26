# TU Scale analytics

This project uses Cloudflare Pages Functions plus KV to count privacy-friendly product events.

No image content, file names, email addresses, or user IDs are collected.

## Cloudflare setup

1. Open Cloudflare dashboard.
2. Go to `Storage & Databases` -> `KV`.
3. Create a namespace, for example `tuscale_analytics`.
4. Go to `Workers & Pages` -> `tu-scale` -> `Settings` -> `Bindings`.
5. Add a KV namespace binding:
   - Variable name: `TUSCALE_ANALYTICS`
   - KV namespace: the namespace created above
6. Redeploy the Pages project.

## Endpoints

- `POST /api/track`: used by the website to count events.
- `GET /api/stats`: returns totals and the last 30 days.

## Counted events

- `page_view`
- `session_start`
- `image_uploaded`
- `ai_enabled`
- `process_start`
- `process_success`
- `process_error`
- `batch_start`
- `batch_item_success`
- `batch_item_error`
- `download`
- `download_zip`
