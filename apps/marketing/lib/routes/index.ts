const marketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? 'http://localhost:3001';
const platformUrl =
  process.env.NEXT_PUBLIC_PLATFORM_URL ?? 'http://localhost:3000';

export const baseUrl = {
  Marketing: marketingUrl,
  Platform: platformUrl
} as const;

export const routes = {
  marketing: {
    Index: '/',
    Docs: '/docs',
    Blog: '/blog',
    Story: '/story',
    Pricing: '/pricing',
    Careers: '/careers',
    Contact: '/contact',
    TermsOfUse: '/terms-of-use',
    PrivacyPolicy: '/privacy-policy',
    CookiePolicy: '/cookie-policy',
    Roadmap: 'https://github.com/8dazo/captor/issues'
  },
  dashboard: {
    auth: {
      SignIn: `${platformUrl}/login`,
      SignUp: `${platformUrl}/login?mode=signup`
    },
    organizations: {
      Index: `${platformUrl}/projects`
    }
  }
} as const;

export function getPathname(href: string, base?: string): string {
  try {
    return new URL(href, base ?? marketingUrl).pathname;
  } catch {
    return href;
  }
}
