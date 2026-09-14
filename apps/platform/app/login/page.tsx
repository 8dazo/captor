import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '../../auth';
import { Activity, ArrowRight, ShieldCheck, Waypoints } from '../../components/icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { appGradient } from '../../lib/utils';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/projects');
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://captar.aurat.ai';

  return (
    <main className={`relative min-h-screen overflow-hidden ${appGradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(255,255,255,0.065),transparent_28%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden border-r border-white/[0.07] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
          <Link href={marketingUrl} className="flex w-fit items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black">
              <Waypoints className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Captar</span>
          </Link>

          <div className="max-w-xl py-16">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Runtime control for production AI
            </p>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.05em] xl:text-6xl">
              See every request.
              <br />
              Control every outcome.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              One operational surface for traces, spend, policies, datasets, and human evaluation.
            </p>
            <div className="mt-12 grid max-w-lg gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
              <div className="bg-[#080808] p-5">
                <Activity className="mb-8 h-5 w-5" />
                <p className="text-sm font-medium">Trace every run</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Inspect model, token, latency, and payload context.
                </p>
              </div>
              <div className="bg-[#080808] p-5">
                <ShieldCheck className="mb-8 h-5 w-5" />
                <p className="text-sm font-medium">Enforce before spend</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Apply budgets and tool policies in your runtime.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Captar</p>
        </section>

        <section className="flex min-h-screen items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-[420px]">
            <Link href={marketingUrl} className="mb-12 flex items-center gap-3 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black">
                <Waypoints className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold tracking-tight">Captar</span>
            </Link>
            <div className="mb-8">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Secure workspace
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sign in to monitor and govern your AI runtime.
              </p>
            </div>
            <Card className="bg-[#090909]/90">
              <CardHeader className="border-b border-white/[0.06] pb-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Platform access</CardTitle>
                    <CardDescription className="mt-1">
                      Enter your workspace credentials.
                    </CardDescription>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <LoginForm />
              </CardContent>
            </Card>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Protected by server-side authentication and encrypted sessions.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
