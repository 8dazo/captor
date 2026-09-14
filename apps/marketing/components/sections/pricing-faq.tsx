import * as React from 'react';
import Link from 'next/link';

import { APP_NAME } from '@workspace/common/app';
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
    question: `Is ${APP_NAME} publishing fixed pricing today?`,
    answer:
      'No. Fixed hosted-platform pricing, seat counts, request quotas, and support tiers are not being advertised until the commercial packaging is finalized.',
  },
  {
    question: 'What can I use today?',
    answer:
      'The public TypeScript SDK is published on npm as `captar`, and the hosted platform provides projects, hooks, trace inspection, spend and violation context, datasets, and manual evals.',
  },
  {
    question: 'Is there a Free or Pro plan?',
    answer:
      'There is no finalized Free/Pro packaging being promised on this site right now. The previous fixed limits and per-seat price were template-era claims and have been removed.',
  },
  {
    question: 'What if I want to evaluate Captar for a production workload?',
    answer: (
      <p>
        Use the current SDK and platform to validate the workflow, then{' '}
        <Link href={routes.marketing.Contact} className="underline hover:text-foreground">
          contact us
        </Link>{' '}
        if you need to discuss deployment, retention, usage, or future commercial requirements.
      </p>
    ),
  },
  {
    question: 'Will this page eventually show normal pricing?',
    answer:
      'Yes—when there are real published commercial terms to show. Until then, the page describes what is actually available instead of inventing plan details.',
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
