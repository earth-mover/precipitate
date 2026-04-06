# Precipitate

An example web app for viewing precipitation data using [dynamical.org](https://dynamical.org/) Icechunk repos in the browser with [typescript + wasm](https://www.npmjs.com/package/@earthmover/icechunk/v/2.0.0-alpha.14)

<img width="664" height="395" alt="Screenshot 2026-04-06 at 9 30 17 AM" src="https://github.com/user-attachments/assets/ba7a6874-7ffd-4c87-89bf-598b25bfd023" />

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
