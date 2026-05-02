export const Role = {
  owner: 'owner',
  admin: 'admin',
  member: 'member',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ContactStage = {
  lead: 'lead',
  prospect: 'prospect',
  qualified: 'qualified',
  negotiation: 'negotiation',
  closed: 'closed',
} as const;
export type ContactStage = (typeof ContactStage)[keyof typeof ContactStage];

export const ContactTaskStatus = {
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
} as const;
export type ContactTaskStatus = (typeof ContactTaskStatus)[keyof typeof ContactTaskStatus];

export const InvitationStatus = {
  pending: 'pending',
  accepted: 'accepted',
  declined: 'declined',
  expired: 'expired',
} as const;
export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const WebhookTrigger = {
  contact_created: 'contact_created',
  contact_updated: 'contact_updated',
  contact_deleted: 'contact_deleted',
  invitation_created: 'invitation_created',
  invitation_accepted: 'invitation_accepted',
} as const;
export type WebhookTrigger = (typeof WebhookTrigger)[keyof typeof WebhookTrigger];

export const DayOfWeek = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
} as const;
export type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

export const FeedbackCategory = {
  bug: 'bug',
  feature: 'feature',
  improvement: 'improvement',
  other: 'other',
} as const;
export type FeedbackCategory = (typeof FeedbackCategory)[keyof typeof FeedbackCategory];

export const ActionType = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export const ActorType = {
  user: 'user',
  system: 'system',
  api: 'api',
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export type Prisma = any;
export const ContactRecord = {
  PERSON: 'person',
  COMPANY: 'company',
} as const;
export type ContactRecord = (typeof ContactRecord)[keyof typeof ContactRecord];
export type ResetPasswordRequest = any;
