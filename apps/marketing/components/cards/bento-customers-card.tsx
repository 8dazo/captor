'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ActivityIcon, TrendingUpIcon } from 'lucide-react';

import { AvatarGroup } from '@workspace/ui/components/avatar-group';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { cn } from '@workspace/ui/lib/utils';

const DATA = [
  { id: '1', name: 'GPT-4.1 Mini' },
  { id: '2', name: 'Claude Sonnet' },
  { id: '3', name: 'GPT-4.1' },
  { id: '4', name: 'Claude Haiku' },
  { id: '5', name: 'Gemini 2.5' },
];

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
        <CardTitle className="text-xl font-semibold">Traces</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          Capture retained prompts and responses inside your runtime.
        </p>
        <div className="space-y-2.5 rounded-lg border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ActivityIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total traces</span>
            </div>
            <motion.div
              className="flex items-center text-primary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <TrendingUpIcon className="mr-1 size-4" />
              <span className="text-sm font-semibold">+8.3%</span>
            </motion.div>
          </div>
          <motion.div
            className="text-3xl font-bold"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            4,827
          </motion.div>
          <div className="flex gap-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <AvatarGroup max={5} showOverflowCount={false} size="sm" avatars={DATA} />
            </motion.div>
          </div>
        </div>
      </CardContent>
    </MotionCard>
  );
}
