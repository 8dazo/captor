'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

import { Badge } from '@workspace/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Progress } from '@workspace/ui/components/progress';
import { cn } from '@workspace/ui/lib/utils';

const DATA = [
  {
    id: 'order-lookup',
    label: 'order.lookup',
    calls: 45,
    blocked: 1,
    value: 100,
  },
  {
    id: 'web-search',
    label: 'web.search',
    calls: 32,
    blocked: 4,
    value: 71,
  },
  {
    id: 'db-query',
    label: 'db.query',
    calls: 18,
    blocked: 0,
    value: 40,
  },
  {
    id: 'email-send',
    label: 'email.send',
    calls: 12,
    blocked: 3,
    value: 27,
  },
  {
    id: 'refund-process',
    label: 'refund.process',
    calls: 7,
    blocked: 2,
    value: 16,
  },
];

const MotionCard = motion.create(Card);

export function BentoPipelinesCard({
  className,
  ...other
}: React.ComponentPropsWithoutRef<typeof MotionCard>): React.JSX.Element {
  return (
    <MotionCard
      className={cn('relative h-[300px] max-h-[300px] overflow-hidden', className)}
      {...other}
    >
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Tool Guardrails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm text-muted-foreground lg:max-w-[55%]">
          Allowlist, blocklist, and enforce per-session tool limits before any call reaches an
          external system.
        </p>
        <div className="relative min-h-[142px] overflow-hidden">
          <div className="group absolute inset-0 top-2 flex flex-col justify-between">
            {DATA.map((stage, index) => (
              <div key={stage.id} className="hover:!opacity-100 group-hover:opacity-40">
                <motion.div
                  className="flex items-center space-x-2 rounded-md pr-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Badge
                    id={`stage-${stage.label}`}
                    variant="secondary"
                    className="w-28 justify-center"
                  >
                    {stage.label}
                  </Badge>
                  <Progress
                    aria-labelledby={`stage-${stage.label}`}
                    value={stage.value}
                    className="flex-1"
                  />
                  <span className="w-28 text-right text-sm font-medium">
                    {stage.calls} calls · {stage.blocked} blocked
                  </span>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </MotionCard>
  );
}
