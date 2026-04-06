# Precipitate

An example web app for viewing precipitation data using Dynamical's Icechunk repos in the browser with icechunk + wasm

Try it out: https://precipitate.earthmover-sandbox.workers.dev

## Developing

Install the deps

```bash
npm install --cpu=wasm32
```

Then run in dev mode

```bash
npm run dev
```

## Deploy to cloudflare

Build the app

```bash
npm run build
```

Use `wrangler` to deploy to cloudflare

```bash
npx wrangler deploy
```
