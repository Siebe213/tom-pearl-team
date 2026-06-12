# Pearl.io Public Arena

This version upgrades the existing Pearl.io game into one shared public world.
Real players and server-controlled bots use the same food, powers, viruses,
collisions, leaderboard, split rules, and merge timers.

## Architecture

- `server.js` owns the authoritative world and all bots.
- `public/index.html` keeps the existing Pearl.io site, casino, skins, missions,
  media board, and local profile.
- `public/online-client.js` sends only player input and renders server snapshots.
- Every connected player joins the same in-memory arena.

Keep the service at exactly **one instance**. Multiple instances would each
create a separate arena unless a future shared-state layer is added.

## Run locally

```text
npm install
npm start
```

Open `http://localhost:3000` in two browser windows to test two real players.
The health endpoint is available at `http://localhost:3000/health`.

## Deploy

The included `render.yaml` creates one Node web service in Frankfurt. It serves
both the website and WebSocket endpoint, so `public/config.js` can remain blank.

The free plan is suitable for testing but can sleep while unused. For a public
always-available lobby, change the Render service to a paid always-on plan.

## Keep GitHub Pages

The recommended setup is to use the Node service URL as the game website.
If the static site must remain on GitHub Pages:

1. Deploy this server.
2. Set `window.PEARL_SERVER_URL` in `public/config.js` to the HTTPS server URL.
3. Publish the files in `public/` to GitHub Pages.

The client automatically converts an HTTPS server URL to `wss://`.

## Controls

- Mouse or touch: move
- Space: split
- W: eject mass
- Q: pull cells together once their merge timer is ready
