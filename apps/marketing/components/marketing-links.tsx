import * as React from 'react';
import {
  ActivityIcon,
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
        title: 'Execution contracts',
        description: 'Bound named resources and verify outcome metrics',
        icon: <GaugeIcon className="size-5 shrink-0" />,
        href: '/docs/execution/contracts',
        external: false,
      },
      {
        title: 'Resumable backfills',
        description: 'Process batches and restart from durable checkpoints',
        icon: <WrenchIcon className="size-5 shrink-0" />,
        href: '/docs/execution/backfills',
        external: false,
      },
      {
        title: 'Local run history',
        description: 'Store receipts in JSONL or SQLite and inspect with the CLI',
        icon: <DatabaseIcon className="size-5 shrink-0" />,
        href: '/docs/execution/stores',
        external: false,
      },
      {
        title: 'Fetch and Prisma adapters',
        description: 'Account for requests and supported database operations',
        icon: <ActivityIcon className="size-5 shrink-0" />,
        href: '/docs/execution/adapters',
        external: false,
      },
      {
        title: 'Receipt inspection',
        description: 'Manually import and inspect execution snapshots',
        icon: <ShieldCheckIcon className="size-5 shrink-0" />,
        href: '/docs/platform/receipts',
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
      { name: 'Execution contracts', href: '/docs/execution/contracts', external: false },
      { name: 'Resumable backfills', href: '/docs/execution/backfills', external: false },
      { name: 'Local run history', href: '/docs/execution/stores', external: false },
      { name: 'Fetch and Prisma adapters', href: '/docs/execution/adapters', external: false },
      { name: 'Receipt inspection', href: '/docs/platform/receipts', external: false },
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
      { title: 'Recovery demo', href: '/docs/getting-started/recovery-demo', items: [] },
    ],
  },
  {
    title: 'Execution',
    icon: <CircuitBoardIcon className="size-4 shrink-0 text-muted-foreground" />,
    items: [
      { title: 'Execution contracts', href: '/docs/execution/contracts', items: [] },
      { title: 'Resumable backfills', href: '/docs/execution/backfills', items: [] },
      { title: 'Local run history', href: '/docs/execution/stores', items: [] },
      { title: 'Fetch and Prisma adapters', href: '/docs/execution/adapters', items: [] },
    ],
  },
  {
    title: 'Reference',
    icon: <BookIcon className="size-4 shrink-0 text-muted-foreground" />,
    items: [{ title: 'SDK API', href: '/docs/reference/sdk-api', items: [] }],
  },
  {
    title: 'Optional Platform',
    icon: <LayoutIcon className="size-4 shrink-0 text-muted-foreground" />,
    items: [{ title: 'Execution receipts', href: '/docs/platform/receipts', items: [] }],
  },
  {
    title: 'AI Compatibility',
    icon: <BookOpenIcon className="size-4 shrink-0 text-muted-foreground" />,
    items: [
      { title: 'AI quickstart', href: '/docs/getting-started/ai-quickstart', items: [] },
      { title: 'AI API', href: '/docs/reference/ai-sdk-api', items: [] },
      {
        title: 'Sessions and budgets',
        href: '/docs/core-concepts/sessions-and-budgets',
        items: [],
      },
      { title: 'OpenAI wrapping', href: '/docs/core-concepts/openai-wrapping', items: [] },
      { title: 'Tool guardrails', href: '/docs/core-concepts/tool-guardrails', items: [] },
      { title: 'Traces and export', href: '/docs/core-concepts/traces-and-export', items: [] },
      { title: 'Events and types', href: '/docs/reference/events-and-types', items: [] },
      { title: 'Configuration', href: '/docs/reference/configuration', items: [] },
      { title: 'Trace inspection', href: '/docs/platform/traces', items: [] },
      { title: 'Datasets', href: '/docs/platform/datasets', items: [] },
      { title: 'Manual evals', href: '/docs/platform/manual-evals', items: [] },
    ],
  },
];
