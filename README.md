# Clinical Trial Simulator: original Macaly version

This branch holds the original version of the app, as it was built on Macaly Cloud (TanStack Start, React, Tailwind CSS, Convex), moved to GitHub. Design a fictional Phase I to III programme, choose the reviewing authority from 21 regulators, and see the consequences of your choices. It has 13 curated scenarios, Endless Practice, Build Your Own, a regulatory assessment tool, a leaderboard and cross-device sync codes.

The `main` branch is a newer rebuild with extra phases (US IND, EU, India and more). It is a separate codebase, not an upgrade of this one.

> This is a fictional, educational demonstration. Do not use it for real patient data, clinical decisions or regulatory submissions.

## What changed in the move
- The Macaly sign-in tables were removed from the Convex schema (nothing used them).
- The leaderboard and sync codes use Convex when `VITE_CONVEX_URL` is set at build time, and fall back to the browser's localStorage otherwise.

## Run locally
```
npm install --legacy-peer-deps
npm run dev
```

## Deploy (Cloudflare Workers)
- Production branch: `macaly-original`
- Build variable: `NITRO_PRESET=node-server`
- Build command: `npm install --legacy-peer-deps && npm run build`
- Deploy command: `npx wrangler deploy --assets .output/public --name clinical-trial-simulator-original --compatibility-date 2026-01-01`
- Optional build variable `VITE_CONVEX_URL` for the shared leaderboard and sync codes (`npx convex dev --configure new`, then `npx convex deploy`).

## Attribution
Created by **Khan Gulrez Shagufa Fazal Ahmed**.

If you reuse or adapt this project, please credit the original author and link back to https://github.com/randomthingsonlineatsk-cloud/clinical-trial-simulator. The Apache License 2.0 requires you to keep the `LICENSE` and `NOTICE` files with any copy you distribute.

## License
Licensed under the [Apache License 2.0](LICENSE). Copyright 2026 Khan Gulrez Shagufa Fazal Ahmed.
