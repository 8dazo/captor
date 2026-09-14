'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

import { cn } from '@workspace/ui/lib/utils';

import { GridSection } from '~/components/fragments/grid-section';

const DATA = [
  {
    value: 'No gateway',
    description: 'Keep your provider SDK and keys in your app',
  },
  {
    value: '3 modes',
    description: 'Raw, redacted, or no payload retention',
  },
  {
    value: 'Provider-aware',
    description: 'OpenAI-compatible clients can identify OpenRouter and other upstreams',
  },
  {
    value: 'Trace → eval',
    description: 'Move retained production context into datasets and manual review',
  },
] as const;

export function Stats(): React.JSX.Element {
  return (
    <GridSection>
      <div className="grid grid-cols-2 divide-x divide-border lg:grid-cols-4">
        {DATA.map((stat, index) => (
          <motion.div
            key={stat.value}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className={cn(
              'justify-top flex flex-col items-center border-dashed p-6 text-center lg:p-8',
              (index === 2 || index === 3) && 'border-t lg:border-t-0'
            )}
          >
            <p className="text-2xl font-semibold md:text-3xl">{stat.value}</p>
            <p className="mt-2 max-w-[240px] text-xs leading-5 text-muted-foreground sm:text-sm">
              {stat.description}
            </p>
          </motion.div>
        ))}
      </div>
    </GridSection>
  );
}
