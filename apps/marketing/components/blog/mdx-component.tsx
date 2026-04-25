'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMDXComponent } from '@content-collections/mdx/react';
import { FileIcon, FolderIcon } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@workspace/ui/components/accordion';
import {
  UnderlinedTabs,
  UnderlinedTabsContent,
  UnderlinedTabsList,
  UnderlinedTabsTrigger
} from '@workspace/ui/components/tabs';
import { cn } from '@workspace/ui/lib/utils';

import { Callout } from '~/components/blog/callout';

function resolveDocsHref(href?: string): string | undefined {
  if (
    !href ||
    href.startsWith('#') ||
    href.startsWith('/docs') ||
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:')
  ) {
    return href;
  }

  if (href.startsWith('/')) {
    return `/docs${href}`;
  }

  return href;
}

function toTabValue(label: string, index: number): string {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `tab-${index}`;
}

type CardsProps = React.PropsWithChildren<{
  className?: string;
}>;

type CardProps = React.PropsWithChildren<{
  className?: string;
  href: string;
  title: string;
}>;

type FilesProps = React.PropsWithChildren<{
  className?: string;
}>;

type FolderProps = React.PropsWithChildren<{
  className?: string;
  defaultOpen?: boolean;
  name: string;
}>;

type FileProps = {
  className?: string;
  name: string;
};

type CompatTabsProps = React.PropsWithChildren<
  React.ComponentProps<typeof UnderlinedTabs> & {
    items?: string[];
  }
>;

function Cards({ className, children }: CardsProps): React.JSX.Element {
  return (
    <div className={cn('my-8 grid gap-4 md:grid-cols-3', className)}>
      {children}
    </div>
  );
}

function Card({
  className,
  href,
  title,
  children
}: CardProps): React.JSX.Element {
  return (
    <Link
      href={resolveDocsHref(href) ?? href}
      className={cn(
        'flex h-full flex-col rounded-2xl border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:bg-muted/40',
        className
      )}
    >
      <span className="text-base font-semibold tracking-tight">{title}</span>
      <span className="mt-2 text-sm leading-6 text-muted-foreground">
        {children}
      </span>
    </Link>
  );
}

function Steps({ className, children }: CardsProps): React.JSX.Element {
  return (
    <ol className={cn('my-6 ml-6 list-decimal space-y-3', className)}>
      {children}
    </ol>
  );
}

function Step({ className, children }: CardsProps): React.JSX.Element {
  return (
    <li className={cn('pl-1 leading-7', className)}>
      {children}
    </li>
  );
}

function Files({ className, children }: FilesProps): React.JSX.Element {
  return (
    <div className={cn('my-6 rounded-xl border bg-card p-4 text-sm', className)}>
      {children}
    </div>
  );
}

function Folder({
  className,
  children,
  defaultOpen = false,
  name
}: FolderProps): React.JSX.Element {
  return (
    <details
      open={defaultOpen}
      className={cn('mt-2 first:mt-0', className)}
    >
      <summary className="flex cursor-pointer items-center gap-2 font-medium marker:text-muted-foreground">
        <FolderIcon className="size-4 text-muted-foreground" />
        <span>{name}</span>
      </summary>
      <div className="mt-2 border-l pl-4 text-muted-foreground">{children}</div>
    </details>
  );
}

function File({ className, name }: FileProps): React.JSX.Element {
  return (
    <div className={cn('mt-2 flex items-center gap-2', className)}>
      <FileIcon className="size-4 text-muted-foreground" />
      <span>{name}</span>
    </div>
  );
}

function Tabs({
  children,
  className,
  items,
  ...props
}: CompatTabsProps): React.JSX.Element {
  if (Array.isArray(items) && items.length > 0) {
    const values = items.map((item, index) => toTabValue(item, index));
    const panels = React.Children.toArray(children);

    return (
      <UnderlinedTabs
        className={cn('relative mt-6 w-full', className)}
        defaultValue={values[0]}
        {...props}
      >
        <UnderlinedTabsList className="w-full border-b">
          {items.map((item, index) => (
            <UnderlinedTabsTrigger
              key={values[index] ?? `tab-${index}`}
              value={values[index] ?? `tab-${index}`}
            >
              {item}
            </UnderlinedTabsTrigger>
          ))}
        </UnderlinedTabsList>
        {panels.map((panel, index) => (
          <UnderlinedTabsContent
            key={values[index] ?? `tab-${index}`}
            value={values[index] ?? `tab-${index}`}
            className="p-4"
          >
            {panel}
          </UnderlinedTabsContent>
        ))}
      </UnderlinedTabs>
    );
  }

  return (
    <UnderlinedTabs
      className={cn('relative mt-6 w-full', className)}
      {...props}
    >
      {children}
    </UnderlinedTabs>
  );
}

function Tab({ children }: React.PropsWithChildren): React.JSX.Element {
  return <>{children}</>;
}

const components = {
  h1: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className={cn(
        'font-heading mt-2 scroll-m-24 text-4xl font-bold',
        className
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className={cn(
        'font-heading mb-4 mt-12 scroll-m-24 text-2xl font-semibold leading-8 tracking-tight',
        className
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      className={cn(
        'font-heading mt-8 scroll-m-24 text-xl font-semibold tracking-tight',
        className
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4
      className={cn(
        'font-heading mt-8 scroll-m-24 text-lg font-semibold tracking-tight',
        className
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h5
      className={cn(
        'mt-8 scroll-m-24 text-base font-semibold tracking-tight',
        className
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h6
      className={cn(
        'mt-8 scroll-m-24 text-sm font-semibold tracking-tight',
        className
      )}
      {...props}
    />
  ),
  a: ({
    className,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className={cn(
        'font-medium text-primary underline underline-offset-4',
        className
      )}
      href={resolveDocsHref(href)}
      {...props}
    />
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className={cn('mt-6 leading-7', className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className={cn('my-6 ml-6 list-disc', className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className={cn('my-6 ml-6 list-decimal', className)}
      {...props}
    />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <li
      className={cn('mt-2', className)}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      className={cn('mt-6 border-l-2 pl-6 italic', className)}
      {...props}
    />
  ),
  img: ({
    className,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img
      className={cn('rounded-md', className)}
      alt={alt}
      {...props}
    />
  ),
  hr: ({ ...props }: React.HTMLAttributes<HTMLHRElement>) => (
    <hr
      className="my-4 md:my-8"
      {...props}
    />
  ),
  table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-y-auto rounded-none">
      <table
        className={cn('w-full overflow-hidden rounded-none', className)}
        {...props}
      />
    </div>
  ),
  tr: ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
      className={cn('m-0 border-t p-0', className)}
      {...props}
    />
  ),
  th: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className={cn(
        'border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right',
        className
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className={cn(
        'border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right',
        className
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <pre
      className={cn(
        'relative mt-4 max-w-[calc(100svw-64px)] overflow-x-auto rounded bg-muted px-1 py-2 font-mono text-sm',
        className
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className={cn(
        'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
        className
      )}
      {...props}
    />
  ),
  Accordion,
  AccordionContent: ({
    className,
    ...props
  }: React.ComponentProps<typeof AccordionContent>) => (
    <AccordionContent
      className={cn('[&>p]:m-0', className)}
      {...props}
    />
  ),
  AccordionItem,
  AccordionTrigger,
  Callout,
  Card,
  Cards,
  File,
  Files,
  Folder,
  Image,
  Step,
  Steps,
  Tab,
  Tabs,
  TabsList: ({
    className,
    ...props
  }: React.ComponentProps<typeof UnderlinedTabsList>) => (
    <UnderlinedTabsList
      className={cn('w-full border-b', className)}
      {...props}
    />
  ),
  TabsTrigger: ({
    className,
    ...props
  }: React.ComponentProps<typeof UnderlinedTabsTrigger>) => (
    <UnderlinedTabsTrigger
      className={cn('', className)}
      {...props}
    />
  ),
  TabsContent: ({
    className,
    ...props
  }: React.ComponentProps<typeof UnderlinedTabsContent>) => (
    <UnderlinedTabsContent
      className={cn('p-4', className)}
      {...props}
    />
  ),
  Link: ({
    className,
    href,
    ...props
  }: React.ComponentProps<typeof Link>) => (
    <Link
      className={cn('font-medium underline underline-offset-4', className)}
      href={typeof href === 'string' ? (resolveDocsHref(href) ?? href) : href}
      {...props}
    />
  ),
  LinkedCard: ({
    className,
    href,
    ...props
  }: React.ComponentProps<typeof Link>) => (
    <Link
      className={cn(
        'flex w-full flex-col items-center rounded-xl border bg-card p-6 text-card-foreground shadow transition-colors hover:bg-muted/50 sm:p-10',
        className
      )}
      href={typeof href === 'string' ? (resolveDocsHref(href) ?? href) : href}
      {...props}
    />
  )
};

type MdxProps = {
  code: string;
};

export function Mdx({ code }: MdxProps) {
  const Component = useMDXComponent(code);
  return (
    <div className="mdx">
      <Component components={components} />
    </div>
  );
}
