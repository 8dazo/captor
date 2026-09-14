import * as React from 'react';
import {
  ActivityIcon,
  BarChart3Icon,
  BookIcon,
  BookOpenIcon,
  CircuitBoardIcon,
  CuboidIcon,
  DatabaseIcon,
  GithubIcon,
  GaugeIcon,
  LayoutIcon,
  SendHorizonalIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from 'lucide-react';

import { routes } from '@workspace/routes';

export const MENU_LINKS = [
  {
    title: 'Product',
    items: [
      {
        title: 'Runtime Budgets',
        description: 'Reserve spend before execution and reconcile actual cost after',
        icon: <GaugeIcon className="size-5 shrink-0" />,
        href: '/docs/core-concepts/sessions-and-budgets',
        external: false,
      },
      {
        title: 'Tool Guardrails',
        description: 'Track tools and apply execution policy inside the active session',
        icon: <WrenchIcon className="size-5 shrink-0" />,
        href: '/docs/core-concepts/tool-guardrails',
        external: false,
      },
      {
        title: 'Trace Debugging',
        description: 'Inspect spans, events, tokens, spend, payloads, and failures',
        icon: <ActivityIcon className="size-5 shrink-0" />,
        href: '/docs/platform/traces',
        external: false,
      },
      {
        title: 'Spend & Provider Context',
        description: 'Keep provider/model identity and actual committed cost on the trace',
        icon: <BarChart3Icon className="size-5 shrink-0" />,
        href: '/docs/core-concepts/traces-and-export',
        external: false,
      },
      {
        title: 'Datasets & Manual Evals',
        description: 'Move retained traces into datasets and reviewer-scored eval runs',
        icon: <DatabaseIcon className="size-5 shrink-0" />,
        href: '/docs/platform/datasets',
        external: false,
      },
      {
        title: 'Violations',
        description: 'Connect request and tool policy failures back to the affected trace',
        icon: <ShieldCheckIcon className="size-5 shrink-0" />,
        href: '/docs/platform/traces',
        external: false,
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        title: 'Docs',
        description: 'Install the SDK and understand the runtime model',
        icon: <BookOpenIcon className="size-5 shrink-0" />,
        href: routes.marketing.Docs,
        external: false,
      },
      {
        title: 'GitHub',
        description: 'Read the source and follow development',
        icon: <GithubIcon className="size-5 shrink-0" />,
        href: 'https://github.com/8dazo/captor',
        external: true,
      },
      {
        title: 'Contact',
        description: 'Talk about a real workload or integration',
        icon: <SendHorizonalIcon className="size-5 shrink-0" />,
        href: routes.marketing.Contact,
        external: false,
      },
    ],
  },
  {
    title: 'Access',
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
      { name: 'Runtime Budgets', href: '/docs/core-concepts/sessions-and-budgets', external: false },
      { name: 'Tool Guardrails', href: '/docs/core-concepts/tool-guardrails', external: false },
      { name: 'Trace Debugging', href: '/docs/platform/traces', external: false },
      { name: 'Datasets', href: '/docs/platform/datasets', external: false },
      { name: 'Manual Evals', href: '/docs/platform/manual-evals', external: false },
    ],
  },
  {
    title: 'Resources',
    links: [
      { name: 'Docs', href: routes.marketing.Docs, external: false },
      { name: 'GitHub', href: 'https://github.com/8dazo/captor', external: true },
      { name: 'Contact', href: routes.marketing.Contact, external: false },
      { name: 'Access', href: routes.marketing.Pricing, external: false },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'Story', href: routes.marketing.Story, external: false },
      { name: 'Blog', href: routes.marketing.Blog, external: false },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Terms of Use', href: routes.marketing.TermsOfUse, external: false },
      { name: 'Privacy Policy', href: routes.marketing.PrivacyPolicy, external: false },
      { name: 'Cookie Policy', href: routes.marketing.CookiePolicy, external: false },
    ],
  },
];

export const SOCIAL_LINKS = [
  {
    name: 'GitHub',
    href: 'https://github.com/8dazo/captor',
    icon: <GithubIcon className="size-4 shrink-0" />,
  },
];

export const DOCS_LINKS = [
  {
    title: 'Getting Started',
    icon: <CuboidIcon className="size-4 shrink-0 text-muted-foreground" />,
    items: [
      { title: 'Introduction', href: '/docs', items: [] },
      { title: 'Overview', href: '/docs/getting-started/overview', items: [] },
      { title: 'Installation', href: '/docs/getting-started/installation', items: [] },
      { title: 'Quickstart', href: '/docs/getting-started/quickstart', items: [] },
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
        title: 'OpenAI-compatible Wrapping',
        href: '/docs/core-concepts/openai-wrapping',
        items: [],
      },
      { title: 'Tool Guardrails', href: '/docs/core-concepts/tool-guardrails', items: [] },
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
      { title: 'SDK API', href: '/docs/reference/sdk-api', items: [] },
      { title: 'Events and Types', href: '/docs/reference/events-and-types', items: [] },
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
      { title: 'Trace Inspection', href: '/docs/platform/traces', items: [] },
      { title: 'Datasets', href: '/docs/platform/datasets', items: [] },
      { title: 'Manual Evals', href: '/docs/platform/manual-evals', items: [] },
    ],
  },
];
