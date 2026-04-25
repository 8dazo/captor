'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

import { APP_NAME } from '@workspace/common/app';
import { cn } from '@workspace/ui/lib/utils';

import { GridSection } from '~/components/fragments/grid-section';
import { Marquee } from '~/components/fragments/marquee';

const DATA = [
  {
    name: 'David Zhang',
    role: 'VP of Engineering at ScaleAI',
    img: 'https://randomuser.me/api/portraits/men/91.jpg',
    description: (
      <p>
        {APP_NAME} has revolutionized how we manage AI spend.{' '}
        <strong>
          Our team caught a 40% budget overrun before it hit production.
        </strong>{' '}
        The runtime guardrails are a game-changer for teams using OpenAI at scale.
      </p>
    )
  },
  {
    name: 'Maria Rodriguez',
    role: 'Lead Platform Engineer at Cloud Dynamics',
    img: 'https://randomuser.me/api/portraits/women/12.jpg',
    description: (
      <p>
        {APP_NAME}'s tool guardrails stopped an unauthorized external API call
        that would have leaked customer data.{' '}
        <strong>Runtime policy enforcement is non-negotiable for us now.</strong>
      </p>
    )
  },
  {
    name: 'James Wilson',
    role: 'Founder at Velocity Inc',
    img: 'https://randomuser.me/api/portraits/men/45.jpg',
    description: (
      <p>
        As a startup, we needed visibility into what our AI was doing without
        adding infrastructure overhead. {APP_NAME} delivers perfectly.{' '}
        <strong>We can trace every model call and debug issues in minutes.</strong>
      </p>
    )
  },
  {
    name: 'Sarah Kim',
    role: 'Senior ML Engineer at Digital First',
    img: 'https://randomuser.me/api/portraits/women/83.jpg',
    description: (
      <p>
        The manual eval workflow is exactly what we needed. We export strong
        traces into datasets and run rubric-scored reviews.{' '}
        <strong>Our model quality improved measurably within two sprints.</strong>
      </p>
    )
  },
  {
    name: 'Marcus Johnson',
    role: 'Engineering Manager at Revenue Pulse',
    img: 'https://randomuser.me/api/portraits/men/1.jpg',
    description: (
      <p>
        {APP_NAME}'s trace export gives us a complete picture of model behavior.
        {' '}
        <strong>
          We caught a tool-call loop that would have cost us thousands in unused
          tokens.
        </strong>{' '}
        Essential for any serious AI team.
      </p>
    )
  },
  {
    name: 'Priya Sharma',
    role: 'CTO at Scale Systems',
    img: 'https://randomuser.me/api/portraits/women/5.jpg',
    description: (
      <p>
        The integration with our existing OpenAI workflow took less than an
        hour. {APP_NAME} wraps the client transparently — no proxy, no key
        handover.{' '}
        <strong>Security team approved it on the first review.</strong>
      </p>
    )
  },
  {
    name: 'Miguel Santos',
    role: 'AI Platform Lead at Grow Corp',
    img: 'https://randomuser.me/api/portraits/men/14.jpg',
    description: (
      <p>
        We needed per-project budget isolation for different teams. {APP_NAME}
        handles this natively with session-scoped budgets and policy merging.{' '}
        <strong>Perfect for managing multi-tenant AI workloads.</strong>
      </p>
    )
  },
  {
    name: 'Lisa Thompson',
    role: 'Staff Engineer at Quantum Enterprises',
    img: 'https://randomuser.me/api/portraits/women/56.jpg',
    description: (
      <p>
        {APP_NAME}'s dataset export turned our ad-hoc prompt reviews into a
        repeatable eval pipeline.{' '}
        <strong>
          We now score every major model update against a curated dataset before
          shipping.
        </strong>
      </p>
    )
  },
  {
    name: 'Daniel Park',
    role: 'Engineering Lead at Swift Solutions',
    img: 'https://randomuser.me/api/portraits/men/18.jpg',
    description: (
      <p>
        Budget reconciliation is incredibly precise. We know exactly how much
        each session reserved, committed, and released.{' '}
        <strong>No more surprise API bills at month-end.</strong>
      </p>
    )
  },
  {
    name: 'Emma Anderson',
    role: 'Director of AI at Peak Partners',
    img: 'https://randomuser.me/api/portraits/women/73.jpg',
    description: (
      <p>
        {APP_NAME} gives us the runtime observability we were missing. Span
        trees for every request, payload retention options, and one-click
        dataset promotion.{' '}
        <strong>This is how AI infrastructure should work.</strong>
      </p>
    )
  },
  {
    name: 'Robert Chen',
    role: 'Principal Engineer at Catalyst Group',
    img: 'https://randomuser.me/api/portraits/men/25.jpg',
    description: (
      <p>
        The OpenAI-compatible wrapper means we can enforce the same guardrails
        across OpenAI, OpenRouter, and our internal model.{' '}
        <strong>One SDK, consistent policy everywhere.</strong>
      </p>
    )
  },
  {
    name: 'Maya Patel',
    role: 'VP of Platform at Apex Solutions',
    img: 'https://randomuser.me/api/portraits/women/78.jpg',
    description: (
      <p>
        We evaluated several AI governance tools. {APP_NAME} was the only one
        that enforced policy inside our runtime without requiring a proxy
        gateway.{' '}
        <strong>Latency stayed flat and security stayed tight.</strong>
      </p>
    )
  },
  {
    name: "Thomas O'Brien",
    role: 'Founder at Future Dynamics',
    img: 'https://randomuser.me/api/portraits/men/54.jpg',
    description: (
      <p>
        {APP_NAME}'s SDK-first approach means we ship guardrails with every new
        feature instead of bolting them on later.{' '}
        <strong>
          The fastest-growing AI startups need runtime control, not just
          dashboards.
        </strong>
      </p>
    )
  }
];

export function Testimonials(): React.JSX.Element {
  return (
    <GridSection hideVerticalGridLines>
      <div className="container border-x py-20 md:border-none">
        <h2 className="mb-8 text-center text-3xl font-semibold md:text-5xl lg:text-left">
          What people say
        </h2>
        <div className="relative mt-6 max-h-[640px] overflow-hidden">
          <div className="gap-4 md:columns-2 xl:columns-3 2xl:columns-4">
            {Array(Math.ceil(DATA.length / 3))
              .fill(0)
              .map((_, i) => (
                <Marquee
                  vertical
                  key={i}
                  className={cn({
                    '[--duration:60s]': i === 1,
                    '[--duration:30s]': i === 2,
                    '[--duration:70s]': i === 3
                  })}
                >
                  {DATA.slice(i * 3, (i + 1) * 3).map((testimonial, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        delay: Math.random() * 0.4,
                        duration: 1
                      }}
                      className="mb-4 flex w-full break-inside-avoid flex-col items-center justify-between gap-6 rounded-xl border bg-background p-4 dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
                    >
                      <div className="select-none text-sm font-normal text-muted-foreground">
                        {testimonial.description}
                        <div className="flex flex-row py-1">
                          <Star className="size-4 fill-yellow-500 text-yellow-500" />
                          <Star className="size-4 fill-yellow-500 text-yellow-500" />
                          <Star className="size-4 fill-yellow-500 text-yellow-500" />
                          <Star className="size-4 fill-yellow-500 text-yellow-500" />
                          <Star className="size-4 fill-yellow-500 text-yellow-500" />
                        </div>
                      </div>
                      <div className="flex w-full select-none items-center justify-start gap-5">
                        <Image
                          width={40}
                          height={40}
                          src={testimonial.img || ''}
                          alt={testimonial.name}
                          className="size-8 rounded-full ring-1 ring-border ring-offset-4"
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {testimonial.name}
                          </p>
                          <p className="text-xs font-normal text-muted-foreground">
                            {testimonial.role}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </Marquee>
              ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 w-full bg-gradient-to-t from-background from-20%" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 w-full bg-gradient-to-b from-background from-20%" />
        </div>
      </div>
    </GridSection>
  );
}
