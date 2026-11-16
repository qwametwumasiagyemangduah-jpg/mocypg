# Ministry website push notifications

These files add browser push subscriptions and a protected sending endpoint for the Ministry of Communication, Digital Technology and Innovation website.

## Required Vercel environment variables

Create a free Upstash Redis database and add its REST URL and REST token in Vercel:

- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

Generate VAPID keys locally with `npx web-push generate-vapid-keys`, then add:

- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_SUBJECT (for example, mailto:your-official-ministry-email@example.com)
- PUSH_ADMIN_TOKEN (a long random secret; never put this value in website JavaScript or GitHub)

Set all variables for Production (and Preview if you intend to test there), then redeploy.

## Sending a notification

Send a POST request to `https://mocypg.vercel.app/api/push/send` with header `Authorization: Bearer YOUR_PUSH_ADMIN_TOKEN` and JSON body:

```json
{
  "title": "New Ministry Update",
  "body": "A new official update is now available on our website.",
  "url": "/newsroom"
}
```

The destination must be on mocypg.vercel.app. The endpoint reports sent, expired subscriptions removed, and failed deliveries. Keep the admin token private.

## Important

Visitors must choose Enable notifications and grant browser permission. A previous visit alone cannot grant permission. Push delivery requires HTTPS and a supported browser/device. Use an official Ministry contact email for VAPID_SUBJECT.
