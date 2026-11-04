import { OpcLandingPage } from '@/components/marketing/opc-landing-page'
import { redirect } from 'next/navigation'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** Keep auth callbacks working while the root route serves the public landing page. */
export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const code = typeof params.code === 'string' ? params.code : null
  const tokenHash =
    typeof params.token_hash === 'string' ? params.token_hash : null
  const type = typeof params.type === 'string' ? params.type : 'magiclink'

  if (tokenHash) {
    redirect(
      `/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`,
    )
  }
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`)
  }

  return <OpcLandingPage />
}
