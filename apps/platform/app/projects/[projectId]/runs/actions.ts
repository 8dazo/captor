'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '../../../../auth';
import { MAX_RECEIPT_BYTES, parseReceiptFile } from '../../../../lib/execution-receipts';
import { importExecutionRuns } from '../../../../lib/execution-runs';

export async function importRunReceipts(projectId: string, form: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Sign in to import receipts.' };
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) return { error: 'Choose a receipt file.' };
  if (file.size > MAX_RECEIPT_BYTES) return { error: 'Receipt files must be 512 KB or smaller.' };
  let receipts;
  try {
    receipts = parseReceiptFile(await file.text());
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid receipt file.' };
  }
  try {
    const result = await importExecutionRuns(projectId, session.user.id, receipts);
    if (!result) return { error: 'Project not found.' };
    revalidatePath(`/projects/${projectId}/runs`);
    return {
      message: `${result.count} imported. ${receipts.length - result.count} existing run IDs skipped.`,
    };
  } catch {
    return { error: 'Could not import receipts. Please try again.' };
  }
}
