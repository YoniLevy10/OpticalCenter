import { Suspense } from 'react'
import { LoginForm } from './login-form'

export default function LoginPage() {
  const demoEntry =
    process.env.MAINTAINOS_FORCE_MEMORY === '1' ||
    process.env.MAINTAINOS_ALLOW_TEST_AUTH === '1' ||
    process.env.NEXT_PUBLIC_MAINTAINOS_DEMO_ENTRY === '1'

  return (
    <Suspense
      fallback={
        <div className="dvh-screen flex items-center justify-center bg-canvas">
          <p className="t-body text-ink-2">טוען…</p>
        </div>
      }
    >
      <LoginForm demoEntry={demoEntry} />
    </Suspense>
  )
}
