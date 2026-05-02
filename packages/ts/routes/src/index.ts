export const routes = {
  dashboard: {
    auth: {
      SignIn: '/auth/sign-in',
      SignUp: '/auth/sign-up',
      RecoveryCode: '/auth/recovery-code',
      Totp: '/auth/totp',
      changeEmail: {
        Index: '/auth/change-email',
        Request: '/auth/change-email/request',
        Expired: '/auth/change-email/expired',
        Invalid: '/auth/change-email/invalid',
      },
      forgetPassword: {
        Index: '/auth/forgot-password',
        Success: '/auth/forgot-password/success',
      },
      resetPassword: {
        Request: '/auth/reset-password',
        Expired: '/auth/reset-password/expired',
        Success: '/auth/reset-password/success',
      },
      verifyEmail: {
        Index: '/auth/verify-email',
        Request: '/auth/verify-email/request',
        Expired: '/auth/verify-email/expired',
        Success: '/auth/verify-email/success',
      },
    },
    invitations: {
      AlreadyAccepted: '/invitations/already-accepted',
      Revoked: '/invitations/revoked',
    },
    onboarding: {
      Index: '/onboarding',
      Organization: '/onboarding/organization',
      User: '/onboarding/user',
    },
    organizations: {
      Index: '/organizations',
      slug: {
        Home: '/organizations/:slug/home',
        Contacts: '/organizations/:slug/contacts',
        settings: {
          Index: '/organizations/:slug/settings',
          account: {
            Index: '/organizations/:slug/settings/account',
            Profile: '/organizations/:slug/settings/account/profile',
            Security: '/organizations/:slug/settings/account/security',
            Notifications: '/organizations/:slug/settings/account/notifications',
          },
          organization: {
            Index: '/organizations/:slug/settings/organization',
            General: '/organizations/:slug/settings/organization/general',
            Members: '/organizations/:slug/settings/organization/members',
            Billing: '/organizations/:slug/settings/organization/billing',
            Developers: '/organizations/:slug/settings/organization/developers',
          },
        },
      },
    },
    Api: '/api',
  },
  marketing: {
    Index: '/',
    Contact: '/contact',
    PrivacyPolicy: '/privacy-policy',
    TermsOfUse: '/terms-of-use',
  },
} as const;

export const baseUrl = {
  Dashboard: 'http://localhost:3000',
  Marketing: 'http://localhost:3001',
} as const;

export function replaceOrgSlug(path: string, slug: string): string {
  return path.replace(':slug', slug);
}

export function getPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function getContactImageUrl(contactId: string): string {
  return `/contacts/${contactId}/image`;
}

export function getOrganizationLogoUrl(orgSlug: string): string {
  return `/organizations/${orgSlug}/logo`;
}

export function getUserImageUrl(userId: string): string {
  return `/users/${userId}/image`;
}
