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
    question: `What pricing plans does ${APP_NAME} offer?`,
    answer: (
      <div>
        We offer three plans:
        <br />
        <ul className="mt-2 list-disc pl-5">
          <li>
            <strong>Free:</strong> For individuals and small teams starting with AI guardrails
          </li>
          <li>
            <strong>Pro:</strong> Advanced budget, tool, and trace features for growing teams
          </li>
          <li>
            <strong>Enterprise:</strong> Custom policy engines, volume limits, and onboarding for
            large organizations
          </li>
        </ul>
        <p className="mt-2">Each plan is designed to scale with your AI runtime needs.</p>
      </div>
    )
  },
  {
    question: "What's included in the Free plan?",
    answer: (
      <div>
        The Free plan is perfect for getting started and includes:
        <ul className="mt-2 list-disc pl-5">
          <li>Budget Guardrails for 1,000 requests/month</li>
          <li>Basic tool allowlists</li>
          <li>Access for up to 2 team members</li>
        </ul>
      </div>
    )
  },
  {
    question: 'What features are in the Pro plan?',
    answer: (
      <div>
        The Pro plan is ideal for growing teams and includes:
        <ul className="mt-2 list-disc pl-5">
          <li>Unlimited budget guardrails and tool tracking</li>
          <li>Real-time trace export</li>
          <li>Project-scoped datasets</li>
          <li>Up to 120 team members</li>
        </ul>
      </div>
    )
  },
  {
    question: 'What does the Enterprise plan offer?',
    answer: (
      <div>
        The Enterprise plan is fully customizable and includes:
        <ul className="mt-2 list-disc pl-5">
          <li>Custom volume and policy engine configuration</li>
          <li>Custom rule engine for tool guardrails</li>
          <li>Custom trace retention and export</li>
          <li>Advanced manual eval rubric scoring</li>
          <li>Unlimited team members</li>
          <li>24/7 Enterprise Support</li>
        </ul>
        <p className="mt-2">Contact us to discuss your organization's needs.</p>
      </div>
    )
  },
  {
    question: 'What happens if I upgrade or downgrade my plan?',
    answer: (
      <p>
        If you upgrade, you'll be charged a prorated amount for the remaining
        time in your billing cycle. If you downgrade, the changes will take
        effect at the end of your current billing cycle.
      </p>
    )
  },
  {
    question: 'Is there a setup fee?',
    answer: (
      <p>
        No, there are no setup fees. You can start using {APP_NAME} immediately
        after signing up.
      </p>
    )
  },
  {
    question: 'What happens if I exceed my plan limits?',
    answer: (
      <p>
        If you exceed your plan limits, you'll receive an alert and can either
        upgrade to a higher plan or adjust your usage to stay within your
        current plan.
      </p>
    )
  }
];

export function PricingFAQ(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container py-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="text-center lg:text-left">
            <h2 className="mb-2.5 text-3xl font-semibold md:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-6 hidden text-muted-foreground md:block lg:max-w-[75%]">
              Have questions about our pricing or plans?{' '}
              <Link
                href={routes.marketing.Contact}
                className="font-normal text-inherit underline hover:text-foreground"
              >
                Contact us
              </Link>{' '}
              - we're here to help you find the perfect fit for your needs.
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
