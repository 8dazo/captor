import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold text-slate-100">404 — Page not found</h2>
      <p className="text-sm text-slate-400">The page you are looking for does not exist.</p>
      <Link href="/projects" className="text-cyan-400 hover:underline">
        Go to projects
      </Link>
    </div>
  );
}
