'use client';

import { Upload } from 'lucide-react';
import { cn } from '~/lib/utils';

interface FileUploadProps {
  accept?: string;
  onChange: (file: File | null) => void;
  id?: string;
  label?: string;
  className?: string;
}

export function FileUpload({
  accept,
  onChange,
  id = 'file-upload',
  label = 'Choose file',
  className,
}: FileUploadProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <label
        htmlFor={id}
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Upload className="h-4 w-4" />
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onChange(file);
        }}
      />
    </div>
  );
}
