import * as React from 'react';

import { cn } from '@workspace/ui/lib/utils';

import { GridSection } from '~/components/fragments/grid-section';
import { NumberTicker } from '~/components/fragments/number-ticket';

type Stat =
  | { type: 'number'; value: number; suffix: string; description: string }
  | { type: 'text'; value: string; description: string };

const DATA: Stat[] = [
  {
    type: 'number',
    value: 0,
    suffix: 'ms',
    description: 'Proxy latency added',
  },
  {
    type: 'number',
    value: 100,
    suffix: '%',
    description: 'Keys stay local',
  },
  {
    type: 'text',
    value: 'OpenAI',
    description: 'SDK compatible',
  },
  {
    type: 'text',
    value: 'Span-first',
    description: 'Trace model',
  },
];

export function Stats(): React.JSX.Element {
  return (
    <GridSection>
      <div className="grid grid-cols-2 divide-x divide-border lg:grid-cols-4">
        {DATA.map((stat, index) => (
          <div
            key={index}
            className={cn(
              'justify-top flex flex-col items-center border-dashed p-6 text-center lg:p-8 ',
              (index === 2 || index === 3) && 'border-t lg:border-t-0'
            )}
          >
            <p className="whitespace-nowrap text-2xl font-semibold md:text-3xl">
              {stat.type === 'number' ? (
                <>
                  <NumberTicker value={stat.value} />
                  {stat.suffix}
                </>
              ) : (
                stat.value
              )}
            </p>
            <p className="mt-2 whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
              {stat.description}
            </p>
          </div>
        ))}
      </div>
    </GridSection>
  );
}
