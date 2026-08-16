import {
  memCreateVendor,
  memGetVendor,
  memListVendors,
  memUpdateVendor,
  type MemVendor,
} from '@/lib/data/memory-store'

export type VendorPublic = Omit<MemVendor, 'hmac_secret'> & {
  has_hmac: boolean
}

function toPublic(v: MemVendor): VendorPublic {
  const { hmac_secret, ...rest } = v
  return { ...rest, has_hmac: Boolean(hmac_secret) }
}

export async function listVendors(opts?: {
  activeOnly?: boolean
}): Promise<{ vendors: VendorPublic[]; backend: 'memory' }> {
  return {
    backend: 'memory',
    vendors: memListVendors(opts?.activeOnly).map(toPublic),
  }
}

export async function createVendor(input: {
  name: string
  contact_phone?: string | null
  contact_email?: string | null
  specialties?: string
  webhook_url?: string | null
}): Promise<VendorPublic> {
  return toPublic(memCreateVendor(input))
}

export async function updateVendor(
  id: string,
  patch: {
    name?: string
    contact_phone?: string | null
    contact_email?: string | null
    specialties?: string
    active?: boolean
    webhook_url?: string | null
  },
): Promise<VendorPublic> {
  return toPublic(memUpdateVendor(id, patch))
}

export function getVendorSecret(id: string): MemVendor | undefined {
  return memGetVendor(id)
}
