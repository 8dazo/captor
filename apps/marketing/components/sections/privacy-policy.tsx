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
    title: 'Data We Collect',
    icon: <BookIcon className="size-4 shrink-0" />,
    content:
      'Captar collects account information (email, name), project configuration data, and telemetry from our SDK runtime (trace metadata, span attributes, spend metrics). We do not collect the contents of your AI prompt and response payloads unless you explicitly enable payload retention in your hook policy.',
  },
  {
    title: 'How We Use Your Data',
    icon: <ScaleIcon className="size-4 shrink-0" />,
    content:
      'We use your data to provide and improve the Captar platform: displaying traces, computing spend summaries, running manual evaluations, and sending you billing and operational notifications. We do not sell or share your data with third parties for advertising purposes.',
  },
  {
    title: 'Data You Control',
    icon: <AlertCircleIcon className="size-4 shrink-0" />,
    content:
      'You can export, delete, or redact your trace data, datasets, and evaluation results at any time through the platform or by contacting us. Hook policies let you control whether payloads are retained in raw, redacted, or discarded form.',
  },
];

const DATA_ACCORDION = [
  {
    title: 'SDK and Runtime Data',
    content:
      'The Captar SDK runs inside your application and transmits trace metadata, span lifecycle events, and spend metrics to our ingest endpoint. Prompt and response payloads are only transmitted when you configure payload retention in your hook policy. You can disable telemetry at any time by removing or pausing a hook.',
  },
  {
    title: 'Data Storage and Security',
    content:
      'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We use row-level security in our PostgreSQL database to isolate project data. Access credentials are stored using bcrypt hashing and never returned in API responses.',
  },
  {
    title: 'Third-Party Services',
    content:
      'We use Vercel for application hosting and Neon for our PostgreSQL database. Both are SOC 2 Type II certified. We do not use any customer data for training or improving third-party AI models.',
  },
  {
    title: 'Cookies and Analytics',
    content:
      'We use essential cookies for authentication and session management. We may use privacy-respecting analytics (no cross-site tracking) to understand how the platform is used. See our Cookie Policy for details.',
  },
  {
    title: 'Data Retention and Deletion',
    content:
      'Trace data, datasets, and evaluation results are retained for as long as your project exists. You can delete individual resources at any time. Upon account deletion, all associated data is permanently removed within 30 days.',
  },
  {
    title: 'Changes to This Policy',
    content:
      'We may update this Privacy Policy periodically. Material changes will be announced via email and a banner on the platform. Continued use after a change constitutes acceptance.',
  },
];

export function PrivacyPolicy(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container space-y-16 py-20">
        <SiteHeading
          badge="Legal"
          title="Privacy Policy"
          description="How Captar collects, uses, and protects your data. Last updated: April 2026."
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
            For privacy-related inquiries, contact us at:
            <br />
            <a href="mailto:privacy@captar.io">privacy@captar.io</a>
          </p>
        </div>
      </div>
    </GridSection>
  );
}
