import { redirect } from 'next/navigation'

/**
 * Overview is demoted. "What needs my attention right now" is answered by the
 * attention strip inside the inbox, where the answer is one click from the work.
 */
export default function OpsIndexPage() {
  redirect('/ops/tickets')
}
