import * as React from 'react';
import Link from 'next/link';

import { routes } from '@workspace/routes';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion';

import { GridSection } from '~/components/fragments/grid-section';

const DATA = [
  {
    question: 'Is the SDK free to use?',
    answer:
      'The SDK is open source under Apache-2.0. Your own infrastructure, database, and API provider charges still apply.',
  },
  {
    question: 'Do I need a hosted plan to run a backfill?',
    answer:
      'No. Contracts, checkpoints, local receipt stores, and the CLI run without a hosted account.',
  },
  {
    question: 'What does hosted access cost?',
    answer:
      'Hosted pricing and commercial support terms are not finalized. Contact us to discuss requirements for your workload.',
  },
  {
    question: 'How should I evaluate Captor?',
    answer:
      'Start with the local quickstart and recovery demo. Then use a small, representative job to verify resource accounting, checkpoint ordering, and idempotent recovery before increasing the workload.',
  },
];

export function PricingFAQ(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container py-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="text-center lg:text-left">
            <h2 className="mb-2.5 text-3xl font-semibold md:text-5xl">Pricing questions</h2>
            <p className="mt-6 hidden text-muted-foreground md:block lg:max-w-[75%]">
              Need to discuss a real workload or deployment?{' '}
              <Link
                href={routes.marketing.Contact}
                className="font-normal text-inherit underline hover:text-foreground"
              >
                Contact us
              </Link>
              .
            </p>
          </div>
          <div className="mx-auto flex w-full max-w-xl flex-col">
            <Accordion type="single" collapsible>
              {DATA.map((faq, index) => (
                <AccordionItem key={faq.question} value={index.toString()}>
                  <AccordionTrigger className="text-left text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base leading-7 text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </GridSection>
  );
}
