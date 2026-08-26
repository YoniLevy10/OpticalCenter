'use client'

import { useEffect, useState } from 'react'

export function useOnline() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    function sync() {
      setOnline(navigator.onLine)
    }
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  return online
}
