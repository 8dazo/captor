import * as React from 'react';
import { AlertCircleIcon, BookIcon, ScaleIcon } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';

import { GridSection } from '~/components/fragments/grid-section';
import { SiteHeading } from '~/components/fragments/site-heading';

const DATA_CARDS = [
  {
    title: 'Acceptance of Terms',
    icon: <BookIcon className="size-4 shrink-0" />,
    content:
      'By accessing or using Captar, you agree to these Terms of Use. If you do not agree, do not use the platform. These terms apply to all users, including those on free and paid plans.',
  },
  {
    title: 'Use of the Platform',
    icon: <ScaleIcon className="size-4 shrink-0" />,
    content:
      'You may use Captar to monitor, control, and evaluate your AI application runtimes. You are responsible for the data you send through our SDK and for ensuring your use complies with applicable laws and regulations.',
  },
  {
    title: 'Prohibited Activities',
    icon: <AlertCircleIcon className="size-4 shrink-0" />,
    content:
      'You may not use Captar to process unlawful content, attempt to compromise our infrastructure, resell access without authorization, or use the platform to violate others\u2019 intellectual property or privacy rights.',
  },
];

const DATA_ACCORDION = [
  {
    title: 'Account and Access',
    content:
      'You must provide accurate information when creating an account. You are responsible for keeping your credentials secure. We may suspend accounts that violate these terms or exhibit suspicious activity.',
  },
  {
    title: 'Your Data and Intellectual Property',
    content:
      'You retain all rights to the data you send through Captar, including trace metadata, prompt payloads, and evaluation results. We process your data solely to provide the platform services described in these terms. Captar and its logo are our trademarks.',
  },
  {
    title: 'Service Availability',
    content:
      'We strive to maintain high availability but do not guarantee uninterrupted service. We may perform scheduled maintenance with advance notice. We will not be liable for downtime caused by factors outside our control.',
  },
  {
    title: 'Limitation of Liability',
    content:
      'Captar is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of the platform.',
  },
  {
    title: 'Termination',
    content:
      'You may close your account at any time. We may suspend or terminate access for violations of these terms. Upon termination, your right to use the platform ceases immediately. Data deletion will proceed according to our Privacy Policy.',
  },
  {
    title: 'Governing Law',
    content:
      'These terms are governed by the laws of the State of Delaware, United States. Disputes will be resolved in the courts of Delaware.',
  },
  {
    title: 'Modifications',
    content:
      'We may update these terms from time to time. Material changes will be communicated via email or platform notification. Continued use after changes take effect constitutes acceptance of the updated terms.',
  },
];

export function TermsOfUse(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container space-y-16 py-20">
        <SiteHeading
          badge="Legal"
          title="Terms of Use"
          description="The rules that govern your use of Captar. Please read them carefully before using the platform."
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {DATA_CARDS.map((item, index) => (
            <Card key={index} className="border-none dark:bg-accent/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {item.icon}
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Accordion type="single" collapsible>
          {DATA_ACCORDION.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="flex items-center justify-between text-lg font-medium">
                {item.title}
              </AccordionTrigger>
              <AccordionContent className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div>
          <CardTitle className="text-lg text-primary">Contact Information</CardTitle>
          <p className="text-sm leading-relaxed">
            For legal inquiries, contact us at:
            <br />
            <a href="mailto:legal@captar.io">legal@captar.io</a>
          </p>
        </div>
      </div>
    </GridSection>
  );
}
