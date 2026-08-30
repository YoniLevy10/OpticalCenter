import type { Membership, MemberRole } from '@/lib/auth/types'
import { PILOT_OWNER, normalizeEmail } from '@/lib/auth/pilot-users'
import {
  DEMO_TECH_ID,
  MEM_COUNTRY_ID,
  MEM_ORG_ID,
} from '@/lib/data/memory-store'

const OTHER_TECH = '22222222-2222-4222-8222-222222222222'
const HQ_GLOBAL = PILOT_OWNER.id
const HQ_COUNTRY_IL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const HQ_REGION_JLM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const HQ_STORE_172 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const FR_COUNTRY_ID = '33333333-3333-3333-3333-333333333333'
const EXTERNAL = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

export type MemProfile = {
  id: string
  email: string | null
  full_name: string | null
  phone?: string | null
  locale?: string
}

type GlobalAuthMem = {
  memberships: Map<string, Membership[]>
  profiles: Map<string, MemProfile>
}

function store(): GlobalAuthMem {
  const g = globalThis as typeof globalThis & { __maintainosAuthMem?: GlobalAuthMem }
  if (!g.__maintainosAuthMem) {
    g.__maintainosAuthMem = {
      memberships: new Map(),
      profiles: new Map(),
    }
    seedDefaultMemberships(g.__maintainosAuthMem)
  } else if (!g.__maintainosAuthMem.profiles) {
    g.__maintainosAuthMem.profiles = new Map()
  }
  return g.__maintainosAuthMem
}

function ensureProfile(
  mem: GlobalAuthMem,
  id: string,
  full_name: string,
  email?: string | null,
) {
  if (!mem.profiles.has(id)) {
    mem.profiles.set(id, {
      id,
      full_name,
      email: email ?? null,
      locale: 'he',
    })
  }
}

function m(
  profile_id: string,
  role: MemberRole,
  scope: Partial<Pick<Membership, 'country_id' | 'region_id' | 'store_id'>> = {},
): Membership {
  return {
    id: crypto.randomUUID(),
    profile_id,
    organization_id: MEM_ORG_ID,
    role,
    country_id: scope.country_id ?? null,
    region_id: scope.region_id ?? null,
    store_id: scope.store_id ?? null,
  }
}

function seedDefaultMemberships(mem: GlobalAuthMem) {
  ensureProfile(mem, DEMO_TECH_ID, 'טכנאי דמו א׳', 'tech-a@demo.local')
  ensureProfile(mem, OTHER_TECH, 'טכנאי דמו ב׳', 'tech-b@demo.local')
  ensureProfile(mem, HQ_GLOBAL, PILOT_OWNER.fullName, PILOT_OWNER.email)
  ensureProfile(mem, HQ_COUNTRY_IL, 'מנהל מדינה IL', 'country-il@demo.local')
  ensureProfile(mem, HQ_REGION_JLM, 'מנהל אזור ירושלים', 'region-jlm@demo.local')
  ensureProfile(mem, HQ_STORE_172, 'מנהל חנות 172', 'store-172@demo.local')
  ensureProfile(mem, EXTERNAL, 'ספק חיצוני', 'external@demo.local')
  ensureProfile(
    mem,
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'מנהל מדינה FR',
    'country-fr@demo.local',
  )

  mem.memberships.set(DEMO_TECH_ID, [
    m(DEMO_TECH_ID, 'internal_technician', { country_id: MEM_COUNTRY_ID }),
  ])
  mem.memberships.set(OTHER_TECH, [
    m(OTHER_TECH, 'internal_technician', { country_id: MEM_COUNTRY_ID }),
  ])
  mem.memberships.set(HQ_GLOBAL, [m(HQ_GLOBAL, 'global_admin')])
  mem.memberships.set(HQ_COUNTRY_IL, [
    m(HQ_COUNTRY_IL, 'country_manager', { country_id: MEM_COUNTRY_ID }),
  ])
  mem.memberships.set(HQ_REGION_JLM, [
    m(HQ_REGION_JLM, 'regional_manager', {
      country_id: MEM_COUNTRY_ID,
      region_id: '33333333-3333-3333-3333-333333333303',
    }),
  ])
  mem.memberships.set(HQ_STORE_172, [
    m(HQ_STORE_172, 'store_manager', {
      country_id: MEM_COUNTRY_ID,
      region_id: 'ta',
      store_id: 'il-store-172',
    }),
  ])
  mem.memberships.set(EXTERNAL, [
    m(EXTERNAL, 'external_provider', { country_id: MEM_COUNTRY_ID }),
  ])
  // France country manager (for isolation tests)
  mem.memberships.set('ffffffff-ffff-4fff-8fff-ffffffffffff', [
    m('ffffffff-ffff-4fff-8fff-ffffffffffff', 'country_manager', {
      country_id: FR_COUNTRY_ID,
    }),
  ])
}

export const DEMO_ACTORS = {
  techA: DEMO_TECH_ID,
  techB: OTHER_TECH,
  globalAdmin: HQ_GLOBAL,
  countryIl: HQ_COUNTRY_IL,
  regionJlm: HQ_REGION_JLM,
  store172: HQ_STORE_172,
  external: EXTERNAL,
  countryFr: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
} as const

export function memListMemberships(profileId: string): Membership[] {
  return [...(store().memberships.get(profileId) ?? [])]
}

export function memSetMemberships(profileId: string, rows: Membership[]) {
  store().memberships.set(profileId, rows)
}

export function memGetProfile(profileId: string): MemProfile | null {
  return store().profiles.get(profileId) ?? null
}

export function memFindProfileByEmail(email: string): MemProfile | null {
  const key = normalizeEmail(email)
  for (const profile of store().profiles.values()) {
    if (profile.email && normalizeEmail(profile.email) === key) return profile
  }
  return null
}

export function memUpsertProfile(profile: MemProfile): MemProfile {
  const next: MemProfile = {
    id: profile.id,
    email: profile.email ?? null,
    full_name: profile.full_name ?? null,
    phone: profile.phone ?? null,
    locale: profile.locale ?? 'he',
  }
  store().profiles.set(profile.id, next)
  return next
}

export function memAddMembership(
  profileId: string,
  role: MemberRole,
  scope: Partial<Pick<Membership, 'country_id' | 'region_id' | 'store_id' | 'organization_id'>> = {},
): Membership {
  const row: Membership = {
    id: crypto.randomUUID(),
    profile_id: profileId,
    organization_id: scope.organization_id ?? MEM_ORG_ID,
    role,
    country_id: scope.country_id ?? null,
    region_id: scope.region_id ?? null,
    store_id: scope.store_id ?? null,
  }
  const existing = memListMemberships(profileId)
  memSetMemberships(profileId, [...existing, row])
  return row
}

export function memUpdateMembership(
  membershipId: string,
  patch: Partial<Pick<Membership, 'role' | 'country_id' | 'region_id' | 'store_id'>>,
): Membership | null {
  const mem = store()
  for (const [profileId, rows] of mem.memberships) {
    const idx = rows.findIndex((r) => r.id === membershipId)
    if (idx < 0) continue
    const next = { ...rows[idx], ...patch }
    const copy = [...rows]
    copy[idx] = next
    mem.memberships.set(profileId, copy)
    return next
  }
  return null
}

export type MemUserRow = MemProfile & { memberships: Membership[] }

export function memListUsers(): MemUserRow[] {
  const mem = store()
  const ids = new Set<string>([
    ...mem.profiles.keys(),
    ...mem.memberships.keys(),
  ])
  return [...ids].map((id) => {
    const profile = mem.profiles.get(id) ?? {
      id,
      email: null,
      full_name: null,
    }
    return {
      ...profile,
      memberships: memListMemberships(id),
    }
  })
}
