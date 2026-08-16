import { redirect } from 'next/navigation'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * HQ home is the operational dashboard.
 * Also forwards auth callbacks that landed on Site URL root (`/?code=` or token_hash).
 */
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

  redirect('/ops/dashboard')
}
