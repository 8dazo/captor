import * as React from 'react';
import { BookIcon, CookieIcon, ScaleIcon } from 'lucide-react';

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
    title: 'What Are Cookies?',
    icon: <CookieIcon className="size-4 shrink-0" />,
    content:
      'Cookies are small text files stored on your device. Captar uses them to keep you signed in, remember your preferences, and understand how the platform is used.',
  },
  {
    title: 'Cookies We Use',
    icon: <BookIcon className="size-4 shrink-0" />,
    content:
      'We use essential cookies for authentication and session management. We may use analytics cookies (e.g., Vercel Analytics) that respect Do Not Track and do not share data with third-party ad networks.',
  },
  {
    title: 'Managing Cookies',
    icon: <ScaleIcon className="size-4 shrink-0" />,
    content:
      'You can control cookies through your browser settings. Disabling essential cookies may affect your ability to sign in and use the platform. Analytics cookies can be disabled without impacting core functionality.',
  },
];

const DATA_ACCORDION = [
  {
    title: 'Essential Cookies',
    content:
      'These are required for the platform to function: they maintain your session, authenticate your requests, and protect against CSRF. You cannot opt out of essential cookies.',
  },
  {
    title: 'Analytics Cookies',
    content:
      'We use privacy-respecting analytics to understand how the platform is used. These cookies collect aggregated, anonymized data. We do not use cross-site tracking or share analytics data with advertisers.',
  },
  {
    title: 'Third-Party Cookies',
    content:
      'We do not set third-party advertising cookies. Our hosting provider (Vercel) may set performance-related cookies for CDN optimization. These are covered by Vercel\u2019s privacy policy.',
  },
  {
    title: 'How to Disable Cookies',
    content:
      'You can disable cookies in your browser settings. For Chrome, go to Settings \u2192 Privacy and Security \u2192 Cookies. For Firefox, go to Settings \u2192 Privacy & Security. For Safari, go to Preferences \u2192 Privacy.',
  },
  {
    title: 'Changes to This Policy',
    content:
      'We may update this Cookie Policy periodically. Changes will be posted on this page with an updated revision date.',
  },
];

export function CookiePolicy(): React.JSX.Element {
  return (
    <GridSection>
      <div className="container space-y-16 py-20">
        <SiteHeading
          badge="Legal"
          title="Cookie Policy"
          description="How Captar uses cookies and similar technologies. Last updated: April 2026."
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
            For questions about our cookie practices, contact us at:
            <br />
            <a href="mailto:privacy@captar.io">privacy@captar.io</a>
          </p>
        </div>
      </div>
    </GridSection>
  );
}
