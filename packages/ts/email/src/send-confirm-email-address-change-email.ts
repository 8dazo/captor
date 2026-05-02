export async function sendConfirmEmailAddressChangeEmail({
  recipient,
  name,
  confirmLink,
}: {
  recipient: string;
  name: string;
  confirmLink: string;
}): Promise<void> {
  console.log('[email stub]', 'sendConfirmEmailAddressChangeEmail', {
    recipient,
    name,
    confirmLink,
  });
}
