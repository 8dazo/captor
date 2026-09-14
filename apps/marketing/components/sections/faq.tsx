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
    question: `What is ${APP_NAME}?`,
    answer: `${APP_NAME} is a runtime control layer for AI applications. The TypeScript SDK wraps an OpenAI-compatible client, starts budgeted sessions, applies request and tool policy in-process, and exports runtime events to a project hook in the platform.`,
  },
  {
    question: 'Does Captar proxy my model traffic?',
    answer:
      'No. Your application continues to call the provider client directly. Captar wraps the client inside your process so policy and budget decisions happen before the provider request without routing model traffic through a Captar gateway.',
  },
  {
    question: 'Which providers can I use?',
    answer:
      'The current public SDK targets OpenAI-compatible clients. OpenAI works directly, and OpenRouter can be used through its OpenAI-compatible API with provider identity recorded as openrouter when configured on the wrapper.',
  },
  {
    question: 'How do budgets work?',
    answer:
      'A Captar session can define a maximum spend budget. Before a request, the SDK estimates and reserves cost against the session. After the response, it commits actual cost when available and releases unused reservation. A call that would exceed policy can be blocked before execution.',
  },
  {
    question: 'What does the platform store?',
    answer:
      'The control plane stores hook, session, trace, span, spend-ledger, and violation data. Prompt and response payloads follow the hook retention mode: raw, redacted, or none. Dataset rows and manual evaluation runs are stored at the project level.',
  },
  {
    question: 'Can I inspect failures and blocked calls?',
    answer:
      'Yes. Trace details include a span tree, timeline, raw events, violations, spend, token usage, provider/model context, and retained payloads. Failed and blocked runtime activity is visible through span status, trace status, events, and violation records.',
  },
  {
    question: 'What are datasets and manual evals for?',
    answer:
      'A retained trace can be exported into a project dataset, and rows can also be imported from supported file formats. Manual evals let reviewers score those rows with pass/fail decisions and weighted criteria, with run-level metrics calculated from the reviews.',
  },
  {
    question: 'Is pricing finalized?',
    answer:
      'No fixed hosted-platform pricing is being advertised right now. The public TypeScript SDK is installable from npm, and the pricing page describes the currently available product paths without inventing seat or usage limits.',
  },
];

export function FAQ(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container py-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="text-center lg:text-left">
            <h2 className="mb-2.5 text-3xl font-semibold md:text-5xl">
              Questions before you wrap a client
            </h2>
            <p className="mt-6 hidden text-muted-foreground md:block lg:max-w-[75%]">
              Need something that is not covered here? Read the{' '}
              <Link
                href={routes.marketing.Docs}
                className="font-normal underline hover:text-foreground"
              >
                docs
              </Link>{' '}
              or{' '}
              <Link
                href={routes.marketing.Contact}
                className="font-normal underline hover:text-foreground"
              >
                contact us
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
