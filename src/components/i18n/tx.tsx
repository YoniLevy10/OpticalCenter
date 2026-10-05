'use client'

import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import { phraseChunk } from '@/lib/i18n/phrases'
import type { Locale } from '@/lib/i18n/locale'
import { useLocale, usePhrase } from '@/components/i18n/locale-provider'

export function Tx({ text }: { text: string }) {
  const p = usePhrase()
  return <>{p(text)}</>
}

export function localizeChunks(node: ReactNode, locale: Locale): ReactNode {
  return Children.map(node, (child) =>
    typeof child === 'string' ? phraseChunk(locale, child) : child,
  )
}

export function LocalText({ children }: { children: ReactNode }) {
  const { locale } = useLocale()
  return <>{localizeChunks(children, locale)}</>
}

/** Translate text inside <option> elements. Leaves other elements untouched. */
export function localizeOptions(node: ReactNode, locale: Locale): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child === 'string') return phraseChunk(locale, child)
    if (!isValidElement<{ children?: ReactNode }>(child)) return child
    if (child.type !== 'option' || child.props.children == null) return child
    return cloneElement(
      child,
      undefined,
      Children.map(child.props.children, (inner) =>
        typeof inner === 'string' ? phraseChunk(locale, inner) : inner,
      ),
    )
  })
}
