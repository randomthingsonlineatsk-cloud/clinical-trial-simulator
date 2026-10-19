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

### Clinical trial application: US IND (Phase 1)
- Before Phase I starts, build the initial IND (21 CFR 312.23(a)(1) to (9)): Form FDA 1571 commitments, the transfer of obligations to a CRO (312.52), the general investigational plan, the investigator's brochure, the safety measures for the first-in-human risk, the investigational label caution statement (312.6), the GLP statement (312.23(a)(8)(iii)), and Forms 1572 and 3674.
- A simulated FDA review over the 30-day wait (312.40(b)): information requests, or a clinical hold on the grounds of 312.42(b)(1). Answer the hold with a complete response; FDA replies within 30 days. The timeline shows the day the study may proceed and the first patient in.
- Reviewer questions are plain "simulated" cards, not agency letters.
- Download the IND as an eCTD package and import it in the [eCTD Dossier Builder](https://randomthingsonlineatsk-cloud.github.io/ectd-dossier-builder/) (Sequences tab), which places each document in its US Module 1, 2 or 5 node.
- Four IND missions: open an IND without a hold, clear a hold in one cycle, IND or exempt (312.2(b)), and file the IND in eCTD.
- The setup screen can skip the IND for the classic game.

## Roadmap
| Phase | Scope | Status |
|---|---|---|
| 0 | Move from Macaly to GitHub Pages, no sign-in | Done |
| 1 | US IND step, clinical holds, eCTD export, IND missions | Done |
| 2 | EU CTR and CTIS (Part I and Part II, RFIs, timelines) | Planned |
| 3 | India NDCT Rules 2019 (CT-04/CT-06, SEC review) | Planned |
| 4 | Ethics, consent, insurance and registries; amendments and timeline comparison | Planned |

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
React, TypeScript, Vite and Tailwind CSS. The simulation engine is in `src/data/ct-*.ts`; the application step is in `src/application/`.

## Attribution
Created by **Khan Gulrez Shagufa Fazal Ahmed**.

If you reuse or adapt this project, please credit the original author and link back to https://github.com/randomthingsonlineatsk-cloud/clinical-trial-simulator. The Apache License 2.0 requires you to keep the `LICENSE` and `NOTICE` files with any copy you distribute.

## License
Licensed under the [Apache License 2.0](LICENSE). Copyright 2026 Khan Gulrez Shagufa Fazal Ahmed.
