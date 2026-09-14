'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2Icon, ShieldXIcon, WrenchIcon } from 'lucide-react';

import { Badge } from '@workspace/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { cn } from '@workspace/ui/lib/utils';

const RULES = [
  { label: 'allowlist / blocklist', detail: 'checked before tool execution', icon: ShieldXIcon },
  { label: 'per-session call ceiling', detail: 'shared with the active Captar session', icon: WrenchIcon },
  { label: 'result tracking', detail: 'tool span records completion or failure', icon: CheckCircle2Icon },
] as const;

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
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xl font-semibold">Tool guardrails</CardTitle>
          <Badge variant="secondary">In-process</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Apply tool policy before side effects run, then keep the execution in the same session and
          trace as the model request that triggered it.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {RULES.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <motion.div
                key={rule.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12 }}
                className="rounded-lg border bg-muted/20 p-4"
              >
                <Icon className="mb-3 size-5" />
                <p className="text-sm font-medium">{rule.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{rule.detail}</p>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </MotionCard>
  );
}
