import { redirect } from 'next/navigation'

/** System status moved into settings — keep old links working. */
export default function OpsStatusPage() {
  redirect('/ops/settings')
}
