'use server'

import { redirect } from 'next/navigation'
import { approveBundleNow } from '@/app/ops/dashboard/bundle-actions'
import { decideSpendAction } from '../work-actions'

export async function approveFromBrief(formData: FormData) {
  const kind = String(formData.get('kind') || '')
  if (kind === 'bundle') {
    const result = await approveBundleNow(String(formData.get('id') || ''))
    if (result.error) throw new Error(result.error)
    redirect('/ops/approvals?notice=approved')
  }
  formData.set('decision', 'approved')
  await decideSpendAction(formData)
}
