'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ActivityIcon, BracesIcon, CoinsIcon, CpuIcon } from 'lucide-react';

import { Badge } from '@workspace/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { cn } from '@workspace/ui/lib/utils';

const FIELDS = [
  { icon: CpuIcon, label: 'Provider + model', value: 'recorded on each request trace' },
  { icon: CoinsIcon, label: 'Estimated + actual cost', value: 'kept separately' },
  { icon: BracesIcon, label: 'Prompt / response', value: 'raw, redacted, or not retained' },
] as const;

const MotionCard = motion.create(Card);

export function BentoCustomersCard({
  className,
  ...other
}: React.ComponentPropsWithoutRef<typeof MotionCard>): React.JSX.Element {
  return (
    <MotionCard
      className={cn('relative h-[300px] max-h-[300px] overflow-hidden', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      {...other}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl font-semibold">Trace context</CardTitle>
          <Badge variant="secondary">Span-first</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Keep runtime evidence together instead of reconstructing a model call from separate logs.
        </p>
        <div className="space-y-2.5">
          {FIELDS.map((field, index) => {
            const Icon = field.icon;
            return (
              <motion.div
                key={field.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 * index }}
                className="rounded-lg border bg-muted/20 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground">{field.value}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ActivityIcon className="size-3.5" /> Request and tool spans share the same trace.
          </div>
        </div>
      </CardContent>
    </MotionCard>
  );
}
