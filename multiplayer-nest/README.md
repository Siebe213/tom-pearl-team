# Tom Pearl Multiplayer on Hack Club Nest

This is a normal Node/WebSocket version of the multiplayer relay. It speaks the same protocol as `multiplayer.js`, so the GitHub Pages site can connect to it with a `wss://...` server URL.

## Local test

```bash
npm install
npm test
npm start
```

Then use this server address in the site multiplayer setup:

```text
ws://127.0.0.1:3000
```

## Nest deployment

On your Nest shell:

```bash
git clone https://github.com/Siebe213/tom-pearl-team.git
cd tom-pearl-team/multiplayer-nest
npm install --omit=dev
PORT=3000 npm start
```

After it is exposed through your Nest domain, put this into the site multiplayer setup:

```text
wss://YOUR-NEST-DOMAIN
```

Keep the GitHub Pages site as the frontend. Nest only needs to run this multiplayer server.
