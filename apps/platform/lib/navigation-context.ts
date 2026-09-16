export type NavigationResource =
  | { type: 'trace'; id: string }
  | { type: 'hook'; id: string };

export function getNavigationResource(pathname: string): NavigationResource | null {
  const traceMatch = pathname.match(/^\/traces\/([^/]+)(?:\/|$)/);
  if (traceMatch?.[1]) {
    return { type: 'trace', id: decodeURIComponent(traceMatch[1]) };
  }

  const hookMatch = pathname.match(/^\/hooks\/([^/]+)(?:\/|$)/);
  if (hookMatch?.[1]) {
    return { type: 'hook', id: decodeURIComponent(hookMatch[1]) };
  }

  return null;
}
