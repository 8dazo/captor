import * as React from 'react';
import { ActivityIcon, GaugeIcon, WrenchIcon } from 'lucide-react';

import { GridSection } from '~/components/fragments/grid-section';
import { SiteHeading } from '~/components/fragments/site-heading';

const DATA = [
  {
    icon: <GaugeIcon className="size-5 shrink-0" />,
    title: 'Runtime enforcement',
    description: 'Budget and policy decisions that happen before model and tool execution.',
  },
  {
    icon: <ActivityIcon className="size-5 shrink-0" />,
    title: 'Observability',
    description: 'Provider-aware traces, spend accounting, failures, and violation context.',
  },
  {
    icon: <WrenchIcon className="size-5 shrink-0" />,
    title: 'Developer experience',
    description: 'Keep the integration small enough to fit existing OpenAI-compatible applications.',
  },
];

export function CareersBenefits(): React.JSX.Element {
  return (
    <GridSection>
      <div className="space-y-20 pt-20">
        <div className="container">
          <SiteHeading
            badge="Careers"
            title="No public roles right now"
            description="Captar is still in an early product-building stage. We are not advertising employment terms or open positions that do not exist."
          />
        </div>
        <div className="grid divide-y border-t border-dashed md:grid-cols-3 md:divide-x md:divide-y-0">
          {DATA.map((area) => (
            <div key={area.title} className="border-dashed px-8 py-12">
              <div className="mb-7 flex size-12 items-center justify-center rounded-2xl border bg-background shadow">
                {area.icon}
              </div>
              <h3 className="mb-3 text-lg font-semibold">{area.title}</h3>
              <p className="text-muted-foreground">{area.description}</p>
            </div>
          ))}
        </div>
      </div>
    </GridSection>
  );
}
