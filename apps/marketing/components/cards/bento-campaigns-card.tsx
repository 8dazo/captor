'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { FileUpIcon, FlaskConicalIcon, Table2Icon, UploadIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import {
  Autoplay,
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@workspace/ui/components/carousel';
import { cn } from '@workspace/ui/lib/utils';

const DATA = [
  {
    type: 'export',
    icon: FileUpIcon,
    title: 'Trace Export',
    timing: 'Strong traces → dataset rows',
  },
  {
    type: 'import',
    icon: UploadIcon,
    title: 'File Import',
    timing: 'CSV / JSONL batch upload',
  },
  {
    type: 'eval',
    icon: FlaskConicalIcon,
    title: 'Manual Eval Run',
    timing: 'Score dataset against rubric',
  },
  {
    type: 'table',
    icon: Table2Icon,
    title: 'Manual Curation',
    timing: 'Tag, label, and cherry-pick rows',
  },
  {
    type: 'export',
    icon: FileUpIcon,
    title: 'Snapshot Export',
    timing: 'Fork dataset at a point in time',
  },
  {
    type: 'import',
    icon: UploadIcon,
    title: 'API Ingestion',
    timing: 'Stream traces via REST endpoint',
  },
  {
    type: 'eval',
    icon: FlaskConicalIcon,
    title: 'Regression Suite',
    timing: 'Auto-run on every dataset change',
  },
  {
    type: 'table',
    icon: Table2Icon,
    title: 'Dedup & Filter',
    timing: 'Remove duplicate or low-quality rows',
  },
];

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
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          Export strong traces into append-only project datasets for eval prep and review.
        </p>
        <Carousel
          opts={{
            align: 'start',
            skipSnaps: true,
            loop: true,
            dragFree: true,
          }}
          plugins={[
            Autoplay({
              delay: 2000,
            }),
          ]}
          orientation="vertical"
          className="pointer-events-none size-full select-none"
        >
          <CarouselContent className="pointer-events-none -mt-1 h-[232px] select-none sm:h-[146px]">
            {DATA.map(({ title, timing, icon: Icon }, index) => (
              <CarouselItem
                key={index}
                className="pointer-events-none basis-1/4 select-none pt-1 will-change-transform"
              >
                <Card className="m-1">
                  <CardContent className="flex w-full flex-row items-center justify-start gap-4 p-6">
                    <div className="rounded-full bg-primary p-2 text-primary-foreground">
                      <Icon className="size-5 shrink-0" />
                    </div>
                    <div>
                      <div className="text-xs font-medium sm:text-sm">{title}</div>
                      <div className="text-[10px] text-muted-foreground sm:text-xs">{timing}</div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </CardContent>
    </MotionCard>
  );
}
