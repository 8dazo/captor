'use client';

import * as React from 'react';
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { useTheme } from '~/hooks/use-theme';

export function ThemeToggle({
  className
}: {
  className?: string;
} = {}): React.JSX.Element {
  const { resolvedTheme, setTheme } = useTheme();

  const nextTheme =
    resolvedTheme === 'dark'
      ? 'light'
      : resolvedTheme === 'light'
        ? 'system'
        : 'dark';

  const Icon =
    resolvedTheme === 'dark'
      ? MoonIcon
      : resolvedTheme === 'light'
        ? SunIcon
        : MonitorIcon;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={className}
      onClick={() => setTheme(nextTheme)}
    >
      <Icon className="size-4" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
