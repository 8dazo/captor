'use client';

import { useRef, useState } from 'react';

import { Upload, X } from './icons';
import { cn } from '~/lib/utils';

interface FileUploadProps {
  accept?: string;
  onChange: (file: File | null) => void;
  id?: string;
  label?: string;
  className?: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  accept,
  onChange,
  id = 'file-upload',
  label = 'Choose file',
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function updateFile(file: File | null) {
    setSelectedFile(file);
    onChange(file);
  }

  function clearFile() {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    updateFile(null);
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={id}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
        >
          <Upload className="h-4 w-4" />
          {selectedFile ? 'Replace file' : label}
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(event) => updateFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {selectedFile ? (
          <button
            type="button"
            onClick={clearFile}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remove ${selectedFile.name}`}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        ) : null}
      </div>
      {selectedFile ? (
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="max-w-[24rem] truncate text-foreground/85">{selectedFile.name}</span>
          <span aria-hidden="true">·</span>
          <span>{formatFileSize(selectedFile.size)}</span>
          {selectedFile.type ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{selectedFile.type}</span>
            </>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No file selected.</p>
      )}
    </div>
  );
}
