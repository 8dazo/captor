import * as React from 'react';
import {
  BookIcon,
  BookOpenIcon,
  BoxIcon,
  CircuitBoardIcon,
  CuboidIcon,
  FileBarChartIcon,
  LayoutIcon,
  PlayIcon,
  SendHorizonalIcon,
} from 'lucide-react';

import { routes } from '@workspace/routes';
import { LinkedInIcon, XIcon } from '@workspace/ui/components/brand-icons';

export const MENU_LINKS = [
  {
    title: 'Product',
    items: [
      {
        title: 'Budget Guardrails',
        description: 'Reserve, commit, and release spend per request session',
        icon: <BoxIcon className="size-5 shrink-0" />,
        href: '/docs/core-concepts/sessions-and-budgets',
        external: false,
      },
      {
        title: 'Tool Tracking',
        description: 'Monitor tool calls, execution time, and success rates',
        icon: <PlayIcon className="size-5 shrink-0" />,
        href: '/docs/core-concepts/tool-guardrails',
        external: false,
      },
      {
        title: 'Trace Export',
        description: 'Span-first traces with parent-child hierarchy and payloads',
        icon: <CircuitBoardIcon className="size-5 shrink-0" />,
        href: '/docs/core-concepts/traces-and-export',
        external: false,
      },
      {
        title: 'Datasets',
        description: 'Build evaluation datasets from traces and file imports',
        icon: <LayoutIcon className="size-5 shrink-0" />,
        href: '/docs/platform/datasets',
        external: false,
      },
      {
        title: 'Manual Evals',
        description: 'Reviewer-driven evaluation runs with rubrics and scoring',
        icon: <FileBarChartIcon className="size-5 shrink-0" />,
        href: '/docs/platform/manual-evals',
        external: false,
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        title: 'Contact',
        description: 'Reach out for assistance',
        icon: <SendHorizonalIcon className="size-5 shrink-0" />,
        href: routes.marketing.Contact,
        external: false,
      },
      {
        title: 'Roadmap',
        description: 'See what is coming next',
        icon: <LayoutIcon className="size-5 shrink-0" />,
        href: routes.marketing.Roadmap,
        external: true,
      },
      {
        title: 'Docs',
        description: 'Learn how to use our platform',
        icon: <BookOpenIcon className="size-5 shrink-0" />,
        href: routes.marketing.Docs,
        external: false,
      },
    ],
  },
  {
    title: 'Pricing',
    href: routes.marketing.Pricing,
    external: false,
  },
  {
    title: 'Blog',
    href: routes.marketing.Blog,
    external: false,
  },
  {
    title: 'Story',
    href: routes.marketing.Story,
    external: false,
  },
];

export const FOOTER_LINKS = [
  {
    title: 'Product',
    links: [
      {
        name: 'Budget Guardrails',
        href: '/docs/core-concepts/sessions-and-budgets',
        external: false,
      },
      { name: 'Tool Tracking', href: '/docs/core-concepts/tool-guardrails', external: false },
      { name: 'Trace Export', href: '/docs/core-concepts/traces-and-export', external: false },
      { name: 'Datasets', href: '/docs/platform/datasets', external: false },
      { name: 'Manual Evals', href: '/docs/platform/manual-evals', external: false },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Contact', href: routes.marketing.Contact, external: false },
      { name: 'Roadmap', href: routes.marketing.Roadmap, external: true },
      { name: 'Docs', href: routes.marketing.Docs, external: false },
    ],
  },
  {
    title: 'About',
    links: [
      { name: 'Story', href: routes.marketing.Story, external: false },
      { name: 'Blog', href: routes.marketing.Blog, external: false },
      { name: 'Careers', href: routes.marketing.Careers, external: false },
    ],
  },
  {
    title: 'Legal',
    links: [
      {
        name: 'Terms of Use',
        href: routes.marketing.TermsOfUse,
        external: false,
      },
      {
        name: 'Privacy Policy',
        href: routes.marketing.PrivacyPolicy,
        external: false,
      },
      {
        name: 'Cookie Policy',
        href: routes.marketing.CookiePolicy,
        external: false,
      },
    ],
  },
];

export const SOCIAL_LINKS = [
  {
    name: 'X (formerly Twitter)',
    href: 'https://x.com/captarhq',
    icon: <XIcon className="size-4 shrink-0" />,
  },
  {
    name: 'LinkedIn',
    href: 'https://linkedin.com/company/captarhq',
    icon: <LinkedInIcon className="size-4 shrink-0" />,
  },
];

export const DOCS_LINKS = [
  {
    title: 'Getting Started',
    icon: <CuboidIcon className="size-4 shrink-0 text-muted-foreground" />,
    items: [
      {
        title: 'Introduction',
        href: '/docs',
        items: [],
      },
      {
        title: 'Overview',
        href: '/docs/getting-started/overview',
        items: [],
      },
      {
        title: 'Installation',
        href: '/docs/getting-started/installation',
        items: [],
      },
      {
        title: 'Quickstart',
        href: '/docs/getting-started/quickstart',
        items: [],
      },
    ],
  },
  {
    title: 'Core Concepts',
    icon: <CircuitBoardIcon className="size-4 shrink-0 text-muted-foreground" />,
    items: [
      {
        title: 'Sessions and Budgets',
        href: '/docs/core-concepts/sessions-and-budgets',
        items: [],
      },
      {
        title: 'OpenAI Wrapping',
        href: '/docs/core-concepts/openai-wrapping',
        items: [],
      },
      {
        title: 'Tool Guardrails',
        href: '/docs/core-concepts/tool-guardrails',
        items: [],
      },
      {
        title: 'Traces and Export',
        href: '/docs/core-concepts/traces-and-export',
        items: [],
      },
    ],
  },
  {
    title: 'Reference',
    icon: <BookIcon className="size-4 shrink-0 text-muted-foreground" />,
    items: [
      {
        title: 'SDK API',
        href: '/docs/reference/sdk-api',
        items: [],
      },
      {
        title: 'Events and Types',
        href: '/docs/reference/events-and-types',
        items: [],
      },
      {
        title: 'Configuration and Environment',
        href: '/docs/reference/configuration',
        items: [],
      },
    ],
  },
  {
    title: 'Platform',
    icon: <LayoutIcon className="size-4 shrink-0 text-muted-foreground" />,
    items: [
      {
        title: 'Trace Inspection',
        href: '/docs/platform/traces',
        items: [],
      },
      {
        title: 'Datasets',
        href: '/docs/platform/datasets',
        items: [],
      },
      {
        title: 'Manual Evals',
        href: '/docs/platform/manual-evals',
        items: [],
      },
    ],
  },
];
