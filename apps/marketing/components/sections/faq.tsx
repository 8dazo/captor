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
    question: 'What is Captor?',
    answer:
      'Captor is an execution-contract SDK for TypeScript jobs. It tracks named resources, checks limits before reserved work, records checkpoints, and validates outcome metrics.',
  },
  {
    question: 'Do I need an account or a new job runner?',
    answer:
      'No. The execution runtime works locally inside your application. Keep your scheduler, queue, database, and provider clients.',
  },
  {
    question: 'Does it automatically protect every side effect?',
    answer:
      'Only work you account for is bounded. Reserve before the side effect, then commit actual usage. The fetch and Prisma adapters cover documented operations; database transactions, idempotency, and unwrapped work remain application responsibilities.',
  },
  {
    question: 'How does recovery work?',
    answer:
      'Backfills can save completed batch checkpoints to JSONL or SQLite and skip those source items on the next run. Use stable source ordering and idempotent writes because a partial batch can be replayed. Each invocation starts a new resource budget.',
  },
  {
    question: 'What does the hosted platform do?',
    answer:
      'The execution receipt inspector accepts manual JSON or JSONL imports and shows saved usage, checkpoints, status, and outcomes. Imported receipts are snapshots; the inspector does not schedule, pause, or resume jobs.',
  },
  {
    question: 'Can I still use the AI integrations?',
    answer:
      'Yes. The existing AI client wrapping, sessions, and trace APIs remain available. Their documentation is under AI Compatibility.',
  },
  {
    question: 'Where should I start?',
    answer:
      'Run the local quickstart, then the fresh-process recovery demo. Before a production job, test a low ceiling, a mid-batch failure, and an idempotent retry against a small dataset.',
  },
];

export function FAQ(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container py-20">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="text-center lg:text-left">
            <h2 className="mb-2.5 text-3xl font-semibold md:text-5xl">
              Questions before your first run
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
