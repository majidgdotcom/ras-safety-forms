/**
 * The safety checklist is defined ONCE here and used by:
 *  - the API (to validate answers and compute status)
 *  - the React form (to render the questions)
 * Adding a question = adding one line below.
 */
export interface ChecklistItem {
  key: string;
  label: string;
}

export const CHECKLIST_SECTIONS = [
  {
    title: 'PPE worn',
    items: [
      { key: 'ppeHardHat', label: 'Hard hat' },
      { key: 'ppeVest', label: 'High-visibility vest' },
      { key: 'ppeBoots', label: 'Safety boots' },
      { key: 'ppeEyeProtection', label: 'Eye protection' },
    ],
  },
  {
    title: 'Work at height',
    items: [
      { key: 'fallProtection', label: 'Fall protection in place' },
      { key: 'laddersScaffolding', label: 'Ladders / scaffolding inspected' },
    ],
  },
  {
    title: 'Tools & site',
    items: [
      { key: 'toolsCords', label: 'Tools and cords in good condition' },
      { key: 'hazardsIdentified', label: 'Hazards identified and controlled' },
    ],
  },
] as const;

export type ChecklistKey = (typeof CHECKLIST_SECTIONS)[number]['items'][number]['key'];

export const CHECKLIST_ITEMS: readonly ChecklistItem[] = CHECKLIST_SECTIONS.flatMap(
  (s): readonly ChecklistItem[] => s.items,
);

export const CHECKLIST_KEYS = CHECKLIST_ITEMS.map((i) => i.key) as [ChecklistKey, ...ChecklistKey[]];

export function checklistLabel(key: string): string {
  return CHECKLIST_ITEMS.find((i) => i.key === key)?.label ?? key;
}
