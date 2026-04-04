export function summarizeEvent(event: {
  type: string;
  timestamp: string;
}): string {
  return `${event.type} @ ${event.timestamp}`;
}
