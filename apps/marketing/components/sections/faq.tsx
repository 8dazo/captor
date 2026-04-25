import * as React from 'react';
import Link from 'next/link';

import { APP_NAME } from '@workspace/common/app';
import { routes } from '@workspace/routes';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@workspace/ui/components/accordion';

import { GridSection } from '~/components/fragments/grid-section';

const DATA = [
  {
    question: `What does ${APP_NAME} do?`,
    answer: `${APP_NAME} is a runtime control layer for AI applications. It wraps your OpenAI client to enforce spend limits, tool usage rules, and execution policy inside your application runtime. It also exports traces, spend events, and violations to an optional platform layer for inspection and manual review.`
  },
  {
    question: 'How does budget reservation work?',
    answer: `Before every model call, ${APP_NAME} estimates the worst-case cost and reserves that amount from your session budget. After the call completes, it reconciles actual usage and releases the unused reserve. If a call would exceed the remaining budget, it is blocked before reaching the provider.`
  },
  {
    question: 'Is my data safe?',
    answer:
      'Your data stays local by default. Provider keys never leave your runtime. Captar supports redacted, raw, or no retention modes for payloads. When traces are exported to the platform, they travel over HTTPS and are scoped to your project.'
  },
  {
    question: 'What kind of integrations are available?',
    answer: `${APP_NAME} supports OpenAI and OpenAI-compatible providers. You wrap an existing client with a single function call. Tool tracking, budget enforcement, and trace emission all happen inside the same runtime session with no proxy or gateway required.`
  },
  {
    question: 'How easy is it to onboard my team?',
    answer:
      'The SDK is designed for minimal integration changes. If you already use OpenAI, you add a wrapper call and a session start. Most teams are running with guardrails within an hour.'
  },
  {
    question: 'What types of businesses can use this?',
    answer: `${APP_NAME} is suitable for any team building with OpenAI — from early-stage startups managing per-user budgets to enterprises enforcing tool guardrails across dozens of services.`
  },
  {
    question: 'Can I customize policies?',
    answer:
      'Absolutely. Policies can be defined locally in code, fetched remotely from the platform, or merged from both. You control allowed models, max estimated costs, output token limits, retry ceilings, tool allowlists, blocklists, and per-session tool call limits.'
  }
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
            <Accordion
              type="single"
              collapsible
            >
              {DATA.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={index.toString()}
                >
                  <AccordionTrigger className="text-left text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base">
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
