'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownIcon, CheckCircle2Icon, CoinsIcon, RotateCcwIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { cn } from '@workspace/ui/lib/utils';

const STEPS = [
  { icon: CoinsIcon, label: 'Reserve', detail: 'estimated cost before the call' },
  { icon: CheckCircle2Icon, label: 'Commit', detail: 'actual provider cost after response' },
  { icon: RotateCcwIcon, label: 'Release', detail: 'unused reservation returned to session' },
] as const;

const MotionCard = motion.create(Card);

export function BentoAnalyticsCard({
  className,
  ...other
}: React.ComponentPropsWithoutRef<typeof MotionCard>): React.JSX.Element {
  return (
    <MotionCard
      className={cn('relative h-[300px] max-h-[300px] overflow-hidden', className)}
      {...other}
    >
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Spend accounting</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-5 text-sm text-muted-foreground">
          Separate pre-call reservation from post-call actual spend so enforcement and analytics use
          the right number at the right time.
        </p>
        <div className="space-y-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.label}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"
                >
                  <Icon className="size-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                  </div>
                </motion.div>
                {index < STEPS.length - 1 ? (
                  <ArrowDownIcon className="mx-auto size-3.5 text-muted-foreground" />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </MotionCard>
  );
}
