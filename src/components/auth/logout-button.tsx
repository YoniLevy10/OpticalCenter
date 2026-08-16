'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LogoutButton({
  className,
  variant = 'ghost',
  size = 'sm',
  label = 'התנתקות',
}: {
  className?: string
  variant?: 'ghost' | 'secondary'
  size?: 'sm' | 'md' | 'touch'
  label?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onLogout() {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      /* navigate anyway */
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={busy}
      onClick={onLogout}
      className={cn(className)}
    >
      {busy ? 'מתנתק…' : label}
    </Button>
  )
}
