'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function ProjectCreateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Support Agent"
        />
      </div>
      <Button
        disabled={isPending || !name.trim()}
        onClick={() => {
          startTransition(async () => {
            const response = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ name }),
            });

            if (!response.ok) {
              toast.error('Could not create project.');
              return;
            }

            const payload = (await response.json()) as {
              project: { id: string };
            };
            toast.success('Project created!');
            router.push(`/projects/${payload.project.id}`);
            router.refresh();
          });
        }}
      >
        {isPending ? 'Creating...' : 'Create project'}
      </Button>
    </div>
  );
}
