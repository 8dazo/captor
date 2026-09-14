'use client';

import { useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Loader2, Lock, Mail } from '../../components/icons';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await signIn('credentials', {
            email: formData.get('email'),
            password: formData.get('password'),
            redirect: false,
          });
          if (result?.error) {
            toast.error('Invalid email or password.');
            return;
          }
          toast.success('Signed in.');
          router.push('/projects');
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            className="pl-10"
            defaultValue={
              process.env.NODE_ENV === 'development'
                ? (process.env.CAPTAR_DEMO_USER_EMAIL ?? 'demo@captar.local')
                : ''
            }
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Enter your password"
            className="pl-10"
            defaultValue={
              process.env.NODE_ENV === 'development'
                ? (process.env.CAPTAR_DEMO_USER_PASSWORD ?? 'captar-demo')
                : ''
            }
            autoComplete="current-password"
          />
        </div>
      </div>
      <Button type="submit" className="h-11 w-full" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? 'Signing in…' : 'Continue to platform'}
      </Button>
      {process.env.NODE_ENV === 'development' ? (
        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[11px] text-muted-foreground">
          <span>Demo workspace</span>
          <span>Credentials prefilled</span>
        </div>
      ) : null}
    </form>
  );
}
