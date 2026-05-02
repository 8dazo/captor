export async function sendVerifyEmailAddressEmail({
  recipient,
  name,
  otp,
  verificationLink,
}: {
  recipient: string;
  name: string;
  otp: string;
  verificationLink: string;
}): Promise<void> {
  console.log('[email stub]', 'sendVerifyEmailAddressEmail', {
    recipient,
    name,
    otp,
    verificationLink,
  });
}
