'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { FileUpIcon, FlaskConicalIcon, Table2Icon, UploadIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { cn } from '@workspace/ui/lib/utils';

const DATA = [
  {
    icon: FileUpIcon,
    title: 'Export a trace',
    detail: 'Turn retained prompt / response context into a dataset row.',
  },
  {
    icon: UploadIcon,
    title: 'Import rows',
    detail: 'Append dataset rows from supported file formats such as CSV or JSONL.',
  },
  {
    icon: Table2Icon,
    title: 'Keep source context',
    detail: 'Rows can retain their source trace and payload-retention metadata.',
  },
  {
    icon: FlaskConicalIcon,
    title: 'Review with an eval',
    detail: 'Create a manual eval and score dataset rows against defined criteria.',
  },
] as const;

const MotionCard = motion.create(Card);

export function BentoCampaignsCard({
  className,
  ...other
}: React.ComponentPropsWithoutRef<typeof MotionCard>): React.JSX.Element {
  return (
    <MotionCard
      className={cn('relative h-[300px] max-h-[300px] overflow-hidden', className)}
      {...other}
    >
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Datasets</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Move from a production trace to a reviewable dataset without inventing a second data model.
        </p>
        <div className="grid gap-2">
          {DATA.map(({ title, detail, icon: Icon }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background">
                <Icon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs leading-5 text-muted-foreground">{detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </MotionCard>
  );
}
