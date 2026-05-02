export async function sendFeedbackEmail({
  recipient,
  appName,
  organizationName,
  name,
  email,
  category,
  message,
}: {
  recipient: string;
  appName: string;
  organizationName: string;
  name: string;
  email: string;
  category: string;
  message: string;
}): Promise<void> {
  console.log('[email stub]', 'sendFeedbackEmail', {
    recipient,
    appName,
    organizationName,
    name,
    email,
    category,
    message,
  });
}
