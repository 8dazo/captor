'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ActivityIcon,
  BarChart3Icon,
  ChevronRightIcon,
  DatabaseIcon,
  GaugeIcon,
  ShieldCheckIcon,
} from 'lucide-react';

import { routes } from '@workspace/routes';
import { Badge } from '@workspace/ui/components/badge';
import { buttonVariants } from '@workspace/ui/components/button';
import { ScrollArea, ScrollBar } from '@workspace/ui/components/scroll-area';
import { Separator } from '@workspace/ui/components/separator';
import {
  UnderlinedTabs,
  UnderlinedTabsContent,
  UnderlinedTabsList,
  UnderlinedTabsTrigger,
} from '@workspace/ui/components/tabs';
import { cn } from '@workspace/ui/lib/utils';

import { GridSection } from '~/components/fragments/grid-section';

const FLOW = [
  { label: 'Your app', detail: 'OpenAI-compatible client' },
  { label: 'Captar SDK', detail: 'policy + budget decision' },
  { label: 'Provider', detail: 'OpenAI / OpenRouter / compatible' },
  { label: 'Captar platform', detail: 'traces + spend + violations' },
] as const;

function HeroPill(): React.JSX.Element {
  return (
    <motion.div
      initial={{ filter: 'blur(10px)', opacity: 0, y: -20 }}
      animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="flex items-center justify-center"
    >
      <Link href="/docs/getting-started/quickstart">
        <Badge
          variant="outline"
          className="group h-8 rounded-full px-3 text-xs font-medium shadow-sm duration-200 hover:bg-accent/50 sm:text-sm"
        >
          <div className="w-fit py-0.5 text-center text-xs text-primary sm:text-sm">captar@0.5.0</div>
          <Separator orientation="vertical" className="mx-2" />
          Runtime control without a gateway
          <ChevronRightIcon className="ml-1.5 size-3 shrink-0 text-foreground transition-transform group-hover:translate-x-0.5" />
        </Badge>
      </Link>
    </motion.div>
  );
}

function HeroTitle(): React.JSX.Element {
  return (
    <motion.div
      initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
      animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <h1 className="mt-6 text-center text-[48px] font-bold leading-[54px] tracking-[-1.2px] [font-kerning:none] sm:text-[56px] md:text-[64px] lg:text-[76px] lg:leading-[74px] lg:tracking-[-2px]">
        Put limits on AI
        <br /> before the call runs
      </h1>
    </motion.div>
  );
}

function HeroDescription(): React.JSX.Element {
  return (
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="mx-auto mt-3 max-w-[690px] text-balance text-center text-lg leading-[28px] text-muted-foreground sm:text-xl lg:mt-6"
    >
      Captar wraps the client you already use, enforces session budgets and tool policy inside your
      runtime, then sends provider-aware traces, actual spend, and violations to one control plane.
      Your provider keys stay with your application.
    </motion.p>
  );
}

function HeroButtons(): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="mx-auto flex w-full flex-col gap-2 px-7 sm:w-auto sm:flex-row sm:px-0"
    >
      <Link
        href={routes.dashboard.auth.SignUp}
        className={cn(buttonVariants({ variant: 'default' }), 'h-10 rounded-xl sm:h-9')}
      >
        Open the platform
      </Link>
      <Link
        href="/docs/getting-started/quickstart"
        className={cn(buttonVariants({ variant: 'outline' }), 'h-10 rounded-xl sm:h-9')}
      >
        Read the quickstart
      </Link>
    </motion.div>
  );
}

function FeaturePanel({
  eyebrow,
  title,
  description,
  points,
}: {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}): React.JSX.Element {
  return (
    <div className="grid min-h-[420px] gap-8 rounded-xl border bg-background p-6 shadow-sm md:grid-cols-[1.05fr_0.95fr] md:p-10">
      <div className="flex flex-col justify-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h3>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{description}</p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          {points.map((point) => (
            <div key={point} className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              {point}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center">
        <div className="w-full rounded-xl border bg-muted/20 p-4">
          {FLOW.map((step, index) => (
            <React.Fragment key={step.label}>
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-lg border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">{step.label}</span>
                  <span className="text-xs text-muted-foreground">{step.detail}</span>
                </div>
              </motion.div>
              {index < FLOW.length - 1 ? (
                <div className="mx-auto h-5 w-px border-l border-dashed border-border" />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroIllustration(): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="relative mt-3 lg:mt-6"
    >
      <UnderlinedTabs defaultValue="guardrails">
        <ScrollArea className="max-w-[100vw] lg:max-w-none">
          <UnderlinedTabsList className="relative z-20 mb-6 flex h-fit flex-row flex-wrap justify-center md:flex-nowrap">
            <UnderlinedTabsTrigger value="guardrails" className="mx-1 px-2.5 sm:mx-2 sm:px-3">
              <GaugeIcon className="mr-2 size-4 shrink-0" /> Budget control
            </UnderlinedTabsTrigger>
            <UnderlinedTabsTrigger value="traces" className="mx-1 px-2.5 sm:mx-2 sm:px-3">
              <ActivityIcon className="mr-2 size-4 shrink-0" /> Trace debugging
            </UnderlinedTabsTrigger>
            <UnderlinedTabsTrigger value="spend" className="mx-1 px-2.5 sm:mx-2 sm:px-3">
              <BarChart3Icon className="mr-2 size-4 shrink-0" /> Spend analytics
            </UnderlinedTabsTrigger>
            <UnderlinedTabsTrigger value="violations" className="mx-1 px-2.5 sm:mx-2 sm:px-3">
              <ShieldCheckIcon className="mr-2 size-4 shrink-0" /> Guardrails
            </UnderlinedTabsTrigger>
            <UnderlinedTabsTrigger value="evals" className="mx-1 px-2.5 sm:mx-2 sm:px-3">
              <DatabaseIcon className="mr-2 size-4 shrink-0" /> Datasets + evals
            </UnderlinedTabsTrigger>
          </UnderlinedTabsList>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>

        <UnderlinedTabsContent value="guardrails">
          <FeaturePanel
            eyebrow="Before execution"
            title="Reserve budget before the provider sees the request"
            description="Captar checks the session budget and policy in-process. A call that would exceed the configured limit is blocked before it reaches the upstream model API."
            points={['Session max spend', 'Per-call estimated-cost ceiling', 'Repeated-call protection', 'Policy sync by hook']}
          />
        </UnderlinedTabsContent>
        <UnderlinedTabsContent value="traces">
          <FeaturePanel
            eyebrow="After execution"
            title="Debug the exact request or tool span that failed"
            description="Trace views keep provider, model, token, cost, retained payload, event, span, and violation context together instead of splitting runtime control from observability."
            points={['Span tree + timeline', 'Failed / blocked problem spans', 'Prompt + response retention modes', 'Request and session identifiers']}
          />
        </UnderlinedTabsContent>
        <UnderlinedTabsContent value="spend">
          <FeaturePanel
            eyebrow="Actual usage"
            title="Use provider-reported cost when it exists"
            description="Captar records estimated reservation and committed actual spend. OpenAI-compatible routers such as OpenRouter can report authoritative usage cost, including legitimate $0 free-model calls."
            points={['Reserved vs committed', 'Provider breakdown', 'Model breakdown', 'Zero-cost traffic stays visible']}
          />
        </UnderlinedTabsContent>
        <UnderlinedTabsContent value="violations">
          <FeaturePanel
            eyebrow="Policy evidence"
            title="See what was blocked and why"
            description="Blocked requests, blocked tools, execution failures, and guardrail violations are stored with their hook and trace context so you can move from a policy event back to the exact runtime path."
            points={['Request blocks', 'Tool blocks', 'Execution failures', 'Project-wide filters']}
          />
        </UnderlinedTabsContent>
        <UnderlinedTabsContent value="evals">
          <FeaturePanel
            eyebrow="From production to evaluation"
            title="Turn retained traces into reviewable datasets"
            description="Export a trace into a project dataset or import rows from a file, then run manual evaluations with pass/fail decisions and weighted rubric criteria."
            points={['Trace → dataset row', 'CSV / JSONL import', 'Manual eval runs', 'Weighted criterion scores']}
          />
        </UnderlinedTabsContent>
      </UnderlinedTabs>
    </motion.div>
  );
}

export function Hero(): React.JSX.Element {
  return (
    <GridSection className="overflow-x-hidden">
      <div className="mx-auto mt-16 flex flex-col gap-6 px-2 sm:mt-20 sm:px-1 md:mt-24 lg:mt-32">
        <div className="gap-2">
          <HeroPill />
          <HeroTitle />
        </div>
        <HeroDescription />
        <HeroButtons />
        <HeroIllustration />
      </div>
    </GridSection>
  );
}
