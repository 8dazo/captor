'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Shield, Wrench, FileOutput, Lock } from 'lucide-react';

import { cn } from '@workspace/ui/lib/utils';

import { GridSection } from '~/components/fragments/grid-section';
import { Marquee } from '~/components/fragments/marquee';

const DATA = [
  {
    title: 'Budget Guardrails',
    icon: Shield,
    description:
      'Session-level spend reservation means you never exceed your AI budget. Reserve, commit, and release per request.',
  },
  {
    title: 'Tool Tracking',
    icon: Wrench,
    description:
      'Track every tool call inside a session. Know which tools ran, how long they took, and whether they succeeded.',
  },
  {
    title: 'Trace Export',
    icon: FileOutput,
    description:
      'Every request produces a span-first trace with parent-child hierarchy, payloads, and violations. Export traces to datasets for evaluation.',
  },
  {
    title: 'Local-First',
    icon: Lock,
    description:
      'No proxy, no key rotation risk. Guardrails run inside your application runtime. Keys never leave your infrastructure.',
  },
];

export function Testimonials(): React.JSX.Element {
  return (
    <GridSection hideVerticalGridLines>
      <div className="container border-x py-20 md:border-none">
        <h2 className="mb-8 text-center text-3xl font-semibold md:text-5xl lg:text-left">
          Built for production AI
        </h2>
        <div className="relative mt-6 max-h-[640px] overflow-hidden">
          <div className="gap-4 md:columns-2 xl:columns-3 2xl:columns-4">
            {Array(Math.ceil(DATA.length / 3))
              .fill(0)
              .map((_, i) => (
                <Marquee
                  vertical
                  key={i}
                  className={cn({
                    '[--duration:60s]': i === 1,
                    '[--duration:30s]': i === 2,
                    '[--duration:70s]': i === 3,
                  })}
                >
                  {DATA.slice(i * 3, (i + 1) * 3).map((prop, index) => {
                    const Icon = prop.icon;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          delay: Math.random() * 0.4,
                          duration: 1,
                        }}
                        className="mb-4 flex w-full break-inside-avoid flex-col items-center justify-between gap-6 rounded-xl border bg-background p-4 dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
                      >
                        <div className="select-none text-sm font-normal text-muted-foreground">
                          {prop.description}
                        </div>
                        <div className="flex w-full select-none items-center justify-start gap-5">
                          <Icon className="size-8 shrink-0 text-muted-foreground" />
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
