import { CopyButton } from './copy-button';
import { cn } from '~/lib/utils';

interface CodeBlockProps {
  children: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ children, language, className }: CodeBlockProps) {
  return (
    <div className={cn('relative rounded-xl border border-border bg-muted/50', className)}>
      {language && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">{language}</span>
          <CopyButton value={children} />
        </div>
      )}
      {!language && (
        <div className="absolute right-2 top-2">
          <CopyButton value={children} />
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-sm text-muted-foreground">
        <code>{children}</code>
      </pre>
    </div>
  );
}
