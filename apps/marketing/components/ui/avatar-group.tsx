import * as React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { cn } from '~/lib/utils';

type AvatarItem = {
  id: string;
  image?: string;
  name: string;
};

type AvatarGroupProps = {
  avatars: AvatarItem[];
  className?: string;
  max?: number;
  showOverflowCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base'
} as const;

export function AvatarGroup({
  avatars,
  className,
  max = avatars.length,
  showOverflowCount = true,
  size = 'md'
}: AvatarGroupProps): React.JSX.Element {
  const visibleAvatars = avatars.slice(0, max);
  const overflow = Math.max(0, avatars.length - visibleAvatars.length);

  return (
    <div className={cn('flex items-center', className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={avatar.id}
          className={cn(
            'border-2 border-background',
            sizeClasses[size],
            index > 0 && '-ml-2'
          )}
        >
          <AvatarImage
            src={avatar.image}
            alt={avatar.name}
          />
          <AvatarFallback>
            {avatar.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && showOverflowCount ? (
        <div
          className={cn(
            '-ml-2 flex items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-muted-foreground',
            sizeClasses[size]
          )}
        >
          +{overflow}
        </div>
      ) : null}
    </div>
  );
}
