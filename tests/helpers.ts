import { EMPTY_FORM, COMMITMENTS, IB_SECTIONS, type IndForm } from '../src/application/ind'
import type { Choices, Scenario } from '../src/data/ct-types'

export function bestP1(s: Scenario): Choices {
  const c: Choices = { p1_dose: s.startingDoseBasis, p1_escalation: s.escalation, p1_population: s.p1Population, p1_n: s.platformGroup.startsWith('vaccine') ? 'medium' : 'small', p1_dlt: 'prespecified' }
  if (s.special) c[s.special.id] = s.special.correctOptionId
  return c
}
export const goodForm: IndForm = { ...EMPTY_FORM, sponsor: 'Halvern Therapeutics (fictional)', commitments: COMMITMENTS.map((c) => c.id), plan: 'year', ibSections: IB_SECTIONS.map((x) => x.id), safety: ['sentinel', 'stagger', 'src', 'stopping', 'site'], label: 'caution', glp: 'statement', form3674: 'not_apply', form1572: true }
