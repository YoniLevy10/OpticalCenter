import { redirect } from 'next/navigation'

/** HQ home is the operational dashboard. */
export default function HomePage() {
  redirect('/ops/dashboard')
}
