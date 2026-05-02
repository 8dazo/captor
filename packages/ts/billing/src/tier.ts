export type Tier = 'free' | 'pro' | 'enterprise';

export const Tier = {
  Free: 'free' as Tier,
  Pro: 'pro' as Tier,
  Enterprise: 'enterprise' as Tier,
} satisfies Record<string, Tier>;
