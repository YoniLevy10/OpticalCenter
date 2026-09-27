'use client'

import { SegmentedLinks } from '@/components/ui/segmented'

type Tab = 'open' | 'resolved'

export function QueueTabs({ active }: { active: Tab }) {
  return (
    <SegmentedLinks
      fill
      className="w-full"
      activeKey={active}
      segments={[
        { key: 'open', label: 'פתוחות', href: '/ops/tickets?view=open' },
        {
          key: 'resolved',
          label: 'הסתיימו',
          href: '/ops/tickets?view=resolved',
        },
      ]}
    />
  )
}
