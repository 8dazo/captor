export async function sendWelcomeEmail({
  recipient,
  appName,
  name,
  getStartedLink,
}: {
  recipient: string;
  appName: string;
  name: string;
  getStartedLink: string;
}): Promise<void> {
  console.log('[email stub]', 'sendWelcomeEmail', { recipient, appName, name, getStartedLink });
}
