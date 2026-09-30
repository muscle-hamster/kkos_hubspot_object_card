// Core + automation properties are shown for all form types
// (spec: "any but Solo K and Future EPQ" — neither exists as an
// intake_form_type option today, so this effectively means all).
const CORE = [
  'entity_name',
  'intake_form_type',
  'entity_state_of_registration',
  'msbs_services',
  'notes',
  'billing_notes',
];

const AUTOMATION = [
  'document_packet_id',
  'customer_box_account_id',
];

const BASE = [...CORE, ...AUTOMATION];

const ENTITY_FORMATION_SPECIFICS = [
  'entity_taxation',
  'registered_agent_name',
  'deed_transfer_needed',
  'entity_foreign_states_of_registration',
];

export const PROPERTY_SETS = {
  llc: {
    properties: [...BASE, ...ENTITY_FORMATION_SPECIFICS],
  },
  llc_401k: {
    properties: [...BASE],
  },
  ira_llc: {
    properties: [...BASE, ...ENTITY_FORMATION_SPECIFICS],
  },
  partnership: {
    properties: [...BASE, ...ENTITY_FORMATION_SPECIFICS],
  },
  dissolution: {
    properties: [...BASE],
  },
  entity_clean_up: {
    properties: [
      ...BASE,
      'entity_taxation',
      'entity_foreign_states_of_registration',
    ],
  },
  transfer: {
    properties: [...BASE, 'entity_taxation'],
  },
};

export function getPropertySet(formType) {
  return PROPERTY_SETS[formType] ?? PROPERTY_SETS.default;
}
