import { redirect } from 'next/navigation'

/** The queue is the home. There is no landing link-farm. */
export default function HomePage() {
  redirect('/ops/tickets')
}
