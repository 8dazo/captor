import * as React from 'react';
import { CircleCheckBigIcon } from 'lucide-react';

import { AiAdvisorCard } from '~/components/cards/ai-advisor-card';
import { BentoAnalyticsCard } from '~/components/cards/bento-analytics-card';
import { BentoCampaignsCard } from '~/components/cards/bento-campaigns-card';
import { BentoCustomersCard } from '~/components/cards/bento-customers-card';
import { BentoMagicInboxCard } from '~/components/cards/bento-magic-inbox-card';
import { BentoPipelinesCard } from '~/components/cards/bento-pipelines-card';
import { GridSection } from '~/components/fragments/grid-section';

export function Solution(): React.JSX.Element {
  return (
    <GridSection>
      <div className="bg-diagonal-lines">
        <div className="flex flex-col gap-24 bg-background py-20 lg:mx-12 lg:border-x">
          <div className="container relative space-y-10">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                What Captar actually does
              </p>
              <h2 className="mb-2.5 mt-4 text-3xl font-semibold md:text-5xl">
                Runtime enforcement in your app. Operational context in the platform.
              </h2>
              <p className="mt-1 max-w-3xl text-muted-foreground md:mt-6 md:text-lg md:leading-8">
                Wrap an OpenAI-compatible client instead of replacing it with a Captar gateway. The
                SDK starts budgeted sessions, applies call and tool policy, records spans, and exports
                events to a hook in the control plane. The platform then gives you project-level
                traces, spend, violations, datasets, and manual evaluation workflows.
              </p>
            </div>

            <div className="mx-auto xl:container xl:rounded-xl xl:bg-neutral-50 xl:p-6 dark:xl:bg-neutral-900">
              <div className="grid auto-rows-[minmax(200px,auto)] grid-cols-12 gap-6">
                <BentoCustomersCard className="col-span-12 md:col-span-6 xl:col-span-4" />
                <BentoPipelinesCard className="col-span-12 md:col-span-6 xl:col-span-8" />
                <BentoAnalyticsCard className="col-span-12 md:col-span-6 xl:col-span-4" />
                <BentoCampaignsCard className="col-span-12 md:col-span-6 xl:col-span-4" />
                <BentoMagicInboxCard className="col-span-12 md:col-span-6 xl:col-span-4" />
              </div>
            </div>

            <div className="-ml-8 w-[calc(100%+64px)] border-t border-dashed sm:-ml-20 sm:w-[calc(100%+160px)]" />

            <div className="grid gap-10 sm:container lg:grid-cols-2 lg:items-center">
              <div className="order-1 lg:order-2">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
                  One request, one chain of evidence
                </p>
                <h2 className="mb-2.5 mt-4 text-3xl font-semibold md:text-5xl">
                  Keep provider, budget, trace, and eval context connected
                </h2>
                <p className="mt-1 text-muted-foreground md:mt-6 md:leading-7">
                  A Captar trace is not a detached analytics record. It is tied to the hook, session,
                  provider, model, spend ledger, spans, retained payloads, and violations that came
                  from the runtime decision.
                </p>
                <ul className="mt-6 grid list-none gap-3 sm:grid-cols-2">
                  {[
                    'Session budget reservation',
                    'Actual-cost reconciliation',
                    'Provider-aware OpenAI-compatible wrapping',
                    'Tool call tracking and policy',
                    'Trace span tree and timeline',
                    'Violation-to-trace debugging',
                    'Trace export into datasets',
                    'Manual rubric evaluation runs',
                  ].map((feature) => (
                    <li key={feature} className="flex flex-row items-start gap-2">
                      <CircleCheckBigIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-2 md:order-1">
                <AiAdvisorCard className="w-full max-w-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </GridSection>
  );
}
