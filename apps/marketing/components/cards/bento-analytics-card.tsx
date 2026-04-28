'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@workspace/ui/components/chart';
import { cn } from '@workspace/ui/lib/utils';

const DATA = [
  { name: 'Jan', value: 248 },
  { name: 'Feb', value: 312 },
  { name: 'Mar', value: 189 },
  { name: 'Apr', value: 475 },
  { name: 'May', value: 394 },
  { name: 'Jun', value: 537 },
];

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
        <CardTitle className="text-xl font-semibold">Spend Tracking</CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden p-0">
        <p className="mb-6 line-clamp-2 px-6 text-sm text-muted-foreground">
          Monitor budget reservations, actual spend, and unused reserve releases in real time.
        </p>
        <div className="w-full max-w-md">
          <ChartContainer config={{}} className="h-[150px] min-w-full overflow-hidden">
            <AreaChart data={DATA} margin={{ top: 5, right: 0, left: 0, bottom: -5 }}>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                label="Spend (USD)"
                stroke="hsl(var(--primary))"
                fill="url(#gradient)"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.name}
                    formatter={(value) => (
                      <>
                        <strong>${value}</strong> Spend (USD)
                      </>
                    )}
                  />
                }
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </MotionCard>
  );
}
