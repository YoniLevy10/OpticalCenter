import { redirect } from 'next/navigation'

/** HQ home — operational KPIs before the ticket inbox. */
export default function OpsIndexPage() {
  redirect('/ops/dashboard')
}
