import type { Membership, MemberRole } from '@/lib/auth/types'
import {
  DEMO_TECH_ID,
  MEM_COUNTRY_ID,
  MEM_ORG_ID,
} from '@/lib/data/memory-store'

const OTHER_TECH = '22222222-2222-4222-8222-222222222222'
const HQ_GLOBAL = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const HQ_COUNTRY_IL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const HQ_REGION_JLM = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const HQ_STORE_172 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const FR_COUNTRY_ID = '33333333-3333-3333-3333-333333333333'
const EXTERNAL = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

type GlobalAuthMem = {
  memberships: Map<string, Membership[]>
}

function store(): GlobalAuthMem {
  const g = globalThis as typeof globalThis & { __maintainosAuthMem?: GlobalAuthMem }
  if (!g.__maintainosAuthMem) {
    g.__maintainosAuthMem = { memberships: new Map() }
    seedDefaultMemberships(g.__maintainosAuthMem)
  }
  return g.__maintainosAuthMem
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
      store_id: 'demo-172',
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
