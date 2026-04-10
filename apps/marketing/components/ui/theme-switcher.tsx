'use client';

import * as React from 'react';
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { useTheme } from '~/hooks/use-theme';

const options = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon }
] as const;

export function ThemeSwitcher(): React.JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-full border bg-background p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const active = (theme ?? 'system') === option.value;

        return (
          <Button
            key={option.value}
            type="button"
            variant={active ? 'default' : 'ghost'}
            size="sm"
            className="rounded-full px-3"
            onClick={() => setTheme(option.value)}
          >
            <Icon className="mr-1 size-3.5" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
