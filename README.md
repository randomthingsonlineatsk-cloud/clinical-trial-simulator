# Clinical Trial Simulator

Design a fictional Phase I to III programme, choose the reviewing authority, and see the consequences of your choices.

**Live site:** https://randomthingsonlineatsk-cloud.github.io/clinical-trial-simulator/

**Original version (Macaly):** https://macaly-lh2v5xxurjd9v3agyfu7x9yg-prod.macaly-app.com. It stays online unchanged. New features are built only in this repository.

> This is a fictional, educational demonstration. Do not use it for real patient data, clinical decisions or regulatory submissions.

## Features
- 15 curated programmes (small molecules, biologics, cell and gene therapies and vaccines on several platforms), Endless Practice and Build Your Own
- Choose dosing, escalation, population, endpoints, comparators, blinding, sample size and interim analyses; every choice is graded against ICH E4, E6, E8, E9 and E10 principles
- Branching consequences: clinical holds, biased estimates, under-powered trials and safety signals
- A verdict from one of 21 authorities, each with its own conventions (two pivotal trials or one, accelerated pathways, non-inferiority and surrogate scrutiny)
- Phase IV events, a regulatory assessment tool, a glossary, run history with achievements, and a leaderboard on this device

## Changes in the move from Macaly (October 2026)
- Rebuilt as a static site for GitHub Pages; there is no server and no sign-in.
- Cross-device sync codes are replaced by a history file you download and load on another device.
- The leaderboard keeps the scores submitted on this device. A shared class leaderboard comes back with classroom mode.

## Run it locally
```
npm install
npm test
npm run dev
```
`npm run build` writes the static site to `dist/`.

## Tech stack
React, TypeScript, Vite and Tailwind CSS. The simulation engine is in `src/data/ct-*.ts`.

## Attribution
Created by **Khan Gulrez Shagufa Fazal Ahmed**.

If you reuse or adapt this project, please credit the original author and link back to https://github.com/randomthingsonlineatsk-cloud/clinical-trial-simulator. The Apache License 2.0 requires you to keep the `LICENSE` and `NOTICE` files with any copy you distribute.

## License
Licensed under the [Apache License 2.0](LICENSE). Copyright 2026 Khan Gulrez Shagufa Fazal Ahmed.
