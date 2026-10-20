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
- Four US IND missions: open an IND without a hold, clear a hold in one cycle, IND or exempt (312.2(b)), and file the IND in eCTD.
- The setup screen chooses the applications before Phase I: US IND, EU (CTIS), both, or none (the classic game).

### Clinical trial application: EU CTR and CTIS (Phase 2)
- One application under Regulation (EU) No 536/2014 for the member states you choose, with a proposed reporting member state. Part I (Annex I, B to J): cover letter, application form, protocol, investigator's brochure, GMP documentation, IMPD and labelling. Part II per country (Annex I, K to R): recruitment, consent in the national language, investigator and site suitability, insurance under national law (Article 76), payments, fee and data protection.
- The real clock, day by day: validation in 10 days (plus 10 + 5 with a request), assessment in 45 days (26 + 12 + 7), up to 31 more days for a request for information with 12 days to answer, 50 more for advanced therapies, and the decision within 5 days. About 60 days without questions, up to 106 with them.
- Reviewer questions (simulated) come from weaknesses in the Phase I design and the dossier. A bad answer at validation makes the application lapse; an unresolved Part I point means every member state refuses; an unresolved Part II point means one country refuses while the others start. Resubmission adds its own clock.
- A start-up timeline per country (and for the US IND), the 2024 CTIS transparency categories and what becomes public when, and a Watch toggle with the proposed European Biotech Act clock (not adopted; off by default).
- The EU dossier exports as a checklist: CTIS is not eCTD.
- Three EU missions: a three-country start-up, Part I or Part II, and the CTR clock and transparency.

### Clinical trial application: India, and changes during the trial (Phase 3)
- India under the New Drugs and Clinical Trials Rules, 2019: Form CT-04 with the Second Schedule documents (rule 21), CDSCO's decision within 90 working days (rule 22), or 30 with deemed approval for a drug discovered and developed in India (rule 23), queries from the Subject Expert Committee that pause the clock, rejection and reconsideration, and permission in Form CT-06, valid two years (rule 26).
- Consent in English and the local language, with audio-video recording for vulnerable participants (Third Schedule); the compensation undertaking (rule 39(5)); an ethics committee registered with CDSCO (CT-01 to CT-02, valid five years); and CTRI registration before the first participant (rule 25). An unregistered committee or a late CTRI registration blocks the first enrolment.
- Choose any mix of US, EU and India in the setup; the Phase I result compares the start-up of every chosen region.
- Changes during the trial, classified for each region: US protocol and information amendments (21 CFR 312.30 and 312.31), EU substantial modifications of Part I or II, non-substantial changes and urgent safety measures (CTR Articles 2, 54 and 81), and India's approvals. Safety reporting deadlines in all three regions, and India's compensation formulas (Seventh Schedule) worked through.
- Three missions: start in India without a query, India's safety, compensation and academic trial rules (rule 28), and classifying six changes across the regions.

### More regions and the certificate (Phase 4)
- The UK (combined MHRA and ethics review under the regulations in force since 28 April 2026: validation in 7 days, a decision within 30, 60 days to answer questions and a decision within 10; the notifiable scheme only for the lowest-risk trials; registration before the first participant or within 90 days of approval).
- Canada (Food and Drug Regulations, Division 5: no objection within 30 days, REB approval and site information before the drug is shipped to a site).
- Australia (CTN scheme after HREC approval and site governance, or the CTA scheme with TGA evaluation).
- Japan (clinical trial notification; 30-day PMDA review of the first notification).
- China (implied approval after 60 working days, or the 30-working-day track for eligible innovative drugs; human genetic resources approval when samples leave China).
- Each region raises reviewer questions from the design, can object, and has one rule that blocks the first participant if missed. The Phase I result compares start-up across every chosen region.
- Two missions (five more countries, and the routes and clocks quiz), 12 in all, and a certificate for passing 10 of them at 70% or more, with a verification code.

## Roadmap
| Phase | Scope | Status |
|---|---|---|
| 0 | Move from Macaly to GitHub Pages, no sign-in | Done |
| 1 | US IND step, clinical holds, eCTD export, IND missions | Done |
| 2 | EU CTR and CTIS: Part I and Part II, the CTR clock, refusals and resubmission, transparency, multi-country timeline, 3 missions | Done |
| 3 | India NDCT Rules 2019 (CT-04 to CT-06, SEC queries, ethics committee, CTRI, compensation, academic trials), changes and safety reporting across regions, 3 missions | Done |
| 4 | UK, Canada, Australia, Japan and China packs; 2 missions; the certificate | Done |

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
