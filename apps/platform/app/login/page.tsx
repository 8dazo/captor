import { redirect } from 'next/navigation';

import { auth } from '../../auth';
import { appGradient } from '../../lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect('/projects');
  }

  return (
    <main className={`flex min-h-screen items-center justify-center ${appGradient} p-6`}>
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader>
          <CardTitle>Sign in to Captar</CardTitle>
          <CardDescription>Use the seeded demo credentials to access the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
