'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRightIcon } from 'lucide-react';

import { routes } from '@workspace/routes';
import { Badge } from '@workspace/ui/components/badge';
import { buttonVariants } from '@workspace/ui/components/button';
import { Separator } from '@workspace/ui/components/separator';
import { cn } from '@workspace/ui/lib/utils';

import { GridSection } from '~/components/fragments/grid-section';

function HeroPill(): React.JSX.Element {
  return (
    <motion.div
      initial={{ filter: 'blur(10px)', opacity: 0, y: -20 }}
      animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="flex items-center justify-center"
    >
      <Link href="/docs/getting-started/quickstart">
        <Badge
          variant="outline"
          className="group h-8 rounded-full px-3 text-xs font-medium shadow-sm duration-200 hover:bg-accent/50 sm:text-sm"
        >
          <div className="w-fit py-0.5 text-center text-xs text-primary sm:text-sm">
            captar@0.5.0
          </div>
          <Separator orientation="vertical" className="mx-2" />
          Runtime control without a gateway
          <ChevronRightIcon className="ml-1.5 size-3 shrink-0 text-foreground transition-transform group-hover:translate-x-0.5" />
        </Badge>
      </Link>
    </motion.div>
  );
}

function HeroTitle(): React.JSX.Element {
  return (
    <motion.div
      initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
      animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <h1 className="mt-6 text-center text-[48px] font-bold leading-[54px] tracking-[-1.2px] [font-kerning:none] sm:text-[56px] md:text-[64px] lg:text-[76px] lg:leading-[74px] lg:tracking-[-2px]">
        See every AI call.
        <br /> Control it in runtime.
      </h1>
    </motion.div>
  );
}

function HeroDescription(): React.JSX.Element {
  return (
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="mx-auto mt-3 max-w-[690px] text-balance text-center text-lg leading-[28px] text-muted-foreground sm:text-xl lg:mt-6"
    >
      Trace OpenAI-compatible workloads, enforce budgets and tool policy before execution, and keep
      your provider keys in your application.
    </motion.p>
  );
}

function HeroButtons(): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className="mx-auto flex w-full flex-col gap-2 px-7 sm:w-auto sm:flex-row sm:px-0"
    >
      <Link
        href={routes.dashboard.auth.SignUp}
        className={cn(buttonVariants({ variant: 'default' }), 'h-10 rounded-xl sm:h-9')}
      >
        Open the platform
      </Link>
      <Link
        href="/docs/getting-started/quickstart"
        className={cn(buttonVariants({ variant: 'outline' }), 'h-10 rounded-xl sm:h-9')}
      >
        Read the quickstart
      </Link>
    </motion.div>
  );
}

export function Hero(): React.JSX.Element {
  return (
    <GridSection className="overflow-x-hidden">
      <div className="mx-auto flex min-h-[620px] max-w-5xl flex-col justify-center gap-6 px-2 py-20 sm:px-1 md:min-h-[680px]">
        <div className="gap-2">
          <HeroPill />
          <HeroTitle />
        </div>
        <HeroDescription />
        <HeroButtons />
      </div>
    </GridSection>
  );
}
