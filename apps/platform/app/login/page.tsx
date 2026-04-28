import { redirect } from 'next/navigation';

import { signIn, auth } from '../../auth';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect('/projects');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to Captar</CardTitle>
          <CardDescription>Use the seeded demo credentials to access the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData) => {
              'use server';
              await signIn('credentials', {
                email: formData.get('email'),
                password: formData.get('password'),
                redirectTo: '/projects',
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                defaultValue={
                  process.env.NODE_ENV === 'development'
                    ? (process.env.CAPTAR_DEMO_USER_EMAIL ?? 'demo@captar.local')
                    : ''
                }
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue={
                  process.env.NODE_ENV === 'development'
                    ? (process.env.CAPTAR_DEMO_USER_PASSWORD ?? 'captar-demo')
                    : ''
                }
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
