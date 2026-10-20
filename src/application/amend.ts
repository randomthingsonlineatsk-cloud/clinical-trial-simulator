// Changes during the trial and safety reporting, in the US (21 CFR 312.30 to 312.32), the EU
// (Regulation (EU) No 536/2014, Articles 2, 15 to 24, 42 and 54) and India (NDCT Rules, 2019:
// conditions of the CT-06 permission and Chapter VI).

export const US_OPTS = ['New protocol (312.30(a))', 'Change in protocol (312.30(b))', 'New investigator: tell FDA within 30 days (312.30(c))', 'Information amendment (312.31)', 'Act now to remove an immediate hazard, then tell FDA and the IRB (312.30(b)(2)(ii))', 'No IND submission needed']
export const EU_OPTS = ['Substantial modification, Part I', 'Substantial modification, Part II', 'Non-substantial change', 'Urgent safety measure: act now, inform within 7 days (Article 54)']
export const IN_OPTS = ['Approval by the CLA and the ethics committee before implementing', 'New site: ethics committee approval at that site, then apply to the CLA', 'Inform the CLA and the ethics committee', 'Act now; report the serious adverse event within 24 hours']

export interface ChangeEvent { id: string; text: string; us: string; eu: string; in: string; why: { us: string; eu: string; in: string } }

export const CHANGES: ChangeEvent[] = [
  { id: 'cohort', text: 'Add a dose cohort above the highest dose in the approved protocol.', us: US_OPTS[1], eu: EU_OPTS[0], in: IN_OPTS[0],
    why: { us: 'In phase 1, any change that significantly affects safety is a protocol amendment; it starts once submitted to FDA and approved by the IRB (312.30(b)).', eu: 'It is likely to affect the subjects’ safety: a substantial modification of Part I (Article 2(2)(13)), assessed by the reporting member state (Article 18).', in: 'The trial must follow the approved protocol (CT-06 conditions); a change to the doses needs CDSCO’s approval and the ethics committee’s before it is used.' } },
  { id: 'site', text: 'Open a new site, with a new principal investigator, in a country where the trial is already authorised.', us: US_OPTS[2], eu: EU_OPTS[1], in: IN_OPTS[1],
    why: { us: 'Adding an investigator is a protocol amendment notified within 30 days of the investigator being added (312.30(c)).', eu: 'A new site or principal investigator is a substantial modification of Part II, assessed by that member state only (Article 20).', in: 'Each site starts only after its own registered ethics committee approves; the site addition is filed with CDSCO through SUGAM.' } },
  { id: 'rsi', text: 'Update the investigator’s brochure with new animal findings that change the reference safety information.', us: US_OPTS[3], eu: EU_OPTS[0], in: IN_OPTS[2],
    why: { us: 'New toxicology or safety information outside a protocol change is an information amendment (312.31); investigators get the revised brochure (312.55(b)).', eu: 'A change to the reference safety information changes how events are judged expected: a substantial modification of Part I.', in: 'The revised brochure goes to CDSCO and to every ethics committee, and to the investigators.' } },
  { id: 'typo', text: 'Correct a typing error in the protocol and update the sponsor’s telephone number.', us: US_OPTS[5], eu: EU_OPTS[2], in: IN_OPTS[2],
    why: { us: 'An administrative correction that does not affect safety, scope or quality needs no IND amendment; it can go in the next annual report.', eu: 'Not likely to affect safety, rights or data reliability: a non-substantial change, recorded in CTIS when relevant to supervision (Article 81(9)).', in: 'Administrative changes are notified; they need no new permission.' } },
  { id: 'liver', text: 'A participant has an unexpected severe liver injury; dosing must stop today while you investigate.', us: US_OPTS[4], eu: EU_OPTS[3], in: IN_OPTS[3],
    why: { us: 'A change to remove an apparent immediate hazard may be made at once, then submitted as a protocol amendment and reported to the IRB (312.30(b)(2)(ii)).', eu: 'An urgent safety measure is taken without waiting for authorisation; the member states concerned are told within 7 days (Article 54).', in: 'The investigator reports the serious adverse event to CDSCO, the sponsor and the ethics committee within 24 hours (rule 42).' } },
  { id: 'age', text: 'Recruitment is slow: widen the age range from 18–45 to 18–55.', us: US_OPTS[1], eu: EU_OPTS[0], in: IN_OPTS[0],
    why: { us: 'Changing who can enter changes the risk in a phase 1 study: a protocol amendment before it applies (312.30(b)).', eu: 'Eligibility criteria are part of the protocol in Part I: a substantial modification.', in: 'A change to the participants needs approval before it is used.' } },
]

// Safety reporting deadlines (calendar days unless stated).
export interface SafetyRule { region: 'US' | 'EU' | 'IN'; what: string; deadline: string; cite: string }
export const SAFETY_RULES: SafetyRule[] = [
  { region: 'US', what: 'Unexpected fatal or life-threatening suspected adverse reaction', deadline: '7 days', cite: '21 CFR 312.32(c)(2)' },
  { region: 'US', what: 'Serious and unexpected suspected adverse reaction', deadline: '15 days', cite: '21 CFR 312.32(c)(1)' },
  { region: 'EU', what: 'Fatal or life-threatening SUSAR, to EudraVigilance', deadline: '7 days', cite: 'CTR Article 42(2)(a)' },
  { region: 'EU', what: 'Other SUSARs', deadline: '15 days', cite: 'CTR Article 42(2)(b)' },
  { region: 'IN', what: 'Investigator reports any serious adverse event to CDSCO, the sponsor and the ethics committee', deadline: '24 hours', cite: 'NDCT Rules, rule 42' },
  { region: 'IN', what: 'Report of the event after due analysis', deadline: '14 days', cite: 'NDCT Rules, rule 42' },
  { region: 'IN', what: 'Ethics committee’s report to CDSCO', deadline: '30 days', cite: 'NDCT Rules, rule 42' },
  { region: 'IN', what: 'CDSCO’s order on compensation; the sponsor pays within 30 days of it', deadline: '90 days', cite: 'NDCT Rules, rule 42' },
]
