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
    question: `What does ${APP_NAME} do?`,
    answer: `${APP_NAME} wraps your OpenAI client with budget limits, tool allowlists, and execution rules—inside your runtime. It also exports traces and violations to a dashboard for manual review.`,
  },
  {
    question: 'How does budget reservation work?',
    answer: `Before each model call, ${APP_NAME} estimates the worst-case cost and reserves it against your session budget. After the call, it reconciles actual spend and releases the unused reserve. If a call would exceed your remaining budget, it is blocked before reaching the provider.`,
  },
  {
    question: 'Is my data safe?',
    answer:
      'Your data stays local by default. Provider keys never leave your runtime. Captar supports redacted, raw, or no retention for payloads. Traces are optionally exported over HTTPS and scoped to your project.',
  },
  {
    question: 'What kind of integrations are available?',
    answer: `${APP_NAME} supports OpenAI and OpenAI-compatible APIs. You wrap an existing client with a single function call. Budget tracking, tool enforcement, and trace export all happen in the same runtime—no proxy or gateway required.`,
  },
  {
    question: 'How easy is it to onboard my team?',
    answer:
      'If you already use OpenAI, the change is a single wrapper call and a session start. Most teams are running with guardrails in under an hour.',
  },
  {
    question: 'What types of businesses can use this?',
    answer: `${APP_NAME} is built for any team using OpenAI—from a startup managing per‑user budgets to an enterprise enforcing guardrails across dozens of services.`,
  },
  {
    question: 'Can I customize policies?',
    answer:
      'Policies can be defined locally in code, fetched remotely from the platform, or merged from both. You set allowed models, estimated cost ceilings, token limits, retry rules, tool allowlists and blocklists, and per‑session tool call limits.',
  },
];

export function FAQ(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container py-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="text-center lg:text-left">
            <h2 className="mb-2.5 text-3xl font-semibold md:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-6 hidden text-muted-foreground md:block lg:max-w-[75%]">
              Haven't found what you're looking for? Try{' '}
              <Link
                href={routes.marketing.Contact}
                className="font-normal text-inherit underline hover:text-foreground"
              >
                contacting
              </Link>{' '}
              us, we are glad to help.
            </p>
          </div>
          <div className="mx-auto flex w-full max-w-xl flex-col">
            <Accordion type="single" collapsible>
              {DATA.map((faq, index) => (
                <AccordionItem key={index} value={index.toString()}>
                  <AccordionTrigger className="text-left text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </GridSection>
  );
}
