export type BillingUnit = 'per_seat' | 'per_organization';

export const BillingUnit = {
  PerSeat: 'per_seat' as BillingUnit,
  PerOrganization: 'per_organization' as BillingUnit,
} satisfies Record<string, BillingUnit>;
