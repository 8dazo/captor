'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  ActivityIcon,
  BarChart3Icon,
  DatabaseIcon,
  FileSearchIcon,
  GaugeIcon,
  LockIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';

import { GridSection } from '~/components/fragments/grid-section';
import { Marquee } from '~/components/fragments/marquee';

const DATA = [
  {
    title: 'Budget reservation',
    icon: GaugeIcon,
    description:
      'Estimate and reserve session budget before an upstream request is allowed to execute.',
  },
  {
    title: 'Actual spend',
    icon: BarChart3Icon,
    description:
      'Reconcile the reservation with provider-reported actual cost when the response supplies it.',
  },
  {
    title: 'Tool policy',
    icon: WrenchIcon,
    description:
      'Track tool execution and enforce allowlists, blocklists, retries, and session call ceilings.',
  },
  {
    title: 'Trace debugging',
    icon: ActivityIcon,
    description:
      'Inspect request and tool spans as a tree or timeline with status, duration, tokens, and cost.',
  },
  {
    title: 'Failure evidence',
    icon: FileSearchIcon,
    description:
      'Failed and blocked runtime activity remains visible through span status, events, and trace-linked violations.',
  },
  {
    title: 'Violations',
    icon: ShieldCheckIcon,
    description:
      'Keep request blocks, tool blocks, and execution failures attached to the session and trace that produced them.',
  },
  {
    title: 'Payload control',
    icon: LockIcon,
    description:
      'Choose raw, redacted, or no retention for prompt and response payloads on a hook.',
  },
  {
    title: 'Datasets + evals',
    icon: DatabaseIcon,
    description:
      'Export retained traces into datasets and review rows with pass/fail and weighted rubric criteria.',
  },
] as const;

export function Testimonials(): React.JSX.Element {
  const columns = [DATA.slice(0, 4), DATA.slice(4)];

  return (
    <GridSection hideVerticalGridLines>
      <div className="container border-x py-20 md:border-none">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            One continuous runtime story
          </p>
          <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
            From policy decision to production evidence
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Captar is designed so the thing that blocks a request and the thing that explains that
            request later share the same session, trace, provider, and policy context.
          </p>
        </div>
        <div className="relative mt-10 max-h-[600px] overflow-hidden">
          <div className="grid gap-4 md:grid-cols-2">
            {columns.map((column, columnIndex) => (
              <Marquee
                vertical
                key={columnIndex}
                reverse={columnIndex === 1}
                className={cn(columnIndex === 0 ? '[--duration:46s]' : '[--duration:54s]')}
              >
                {column.map((prop, index) => {
                  const Icon = prop.icon;
                  return (
                    <motion.div
                      key={prop.title}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.08, duration: 0.45 }}
                      className="mb-4 flex w-full break-inside-avoid flex-col gap-5 rounded-xl border bg-background p-5 dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
                    >
                      <div className="text-sm leading-6 text-muted-foreground">
                        {prop.description}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted/30">
                          <Icon className="size-4" />
                        </div>
                        <p className="text-sm font-medium">{prop.title}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </Marquee>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 w-full bg-gradient-to-t from-background from-20%" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 w-full bg-gradient-to-b from-background from-20%" />
        </div>
      </div>
    </GridSection>
  );
}
