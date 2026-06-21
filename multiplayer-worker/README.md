# Tom Pearl Multiplayer

Free WebSocket room relay for Pearl.io and Snake, built for Cloudflare Workers and Durable Objects.

## Deploy once

1. Create a free Cloudflare account.
2. In this folder run `npm install`.
3. Run `npx wrangler login` and approve the browser prompt.
4. Run `npm run deploy`.
5. Open the returned `https://...workers.dev` address. That address serves the site and multiplayer together, so visitors never need to configure anything.

Both games are multiplayer-only. The Worker proxies the unchanged site from GitHub Pages and only handles lightweight room traffic itself.
