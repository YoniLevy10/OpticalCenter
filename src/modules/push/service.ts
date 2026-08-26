import { createSystemClient } from '@/lib/supabase/system'
import {
  memDeletePushSubscription,
  memListPushSubscriptions,
  memUpsertPushSubscription,
  supabaseReady,
  type MemPushSubscription,
} from '@/lib/data/memory-store'

export async function listPushSubscriptions(profileId: string): Promise<{
  subscriptions: Pick<MemPushSubscription, 'id' | 'endpoint' | 'created_at'>[]
  backend: 'memory' | 'supabase'
}> {
  if (!(await supabaseReady())) {
    return {
      backend: 'memory',
      subscriptions: memListPushSubscriptions(profileId).map((s) => ({
        id: s.id,
        endpoint: s.endpoint,
        created_at: s.created_at,
      })),
    }
  }

  const supabase = createSystemClient('push_list')
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, created_at')
    .eq('profile_id', profileId)

  if (error) throw new Error(error.message)
  return { backend: 'supabase', subscriptions: data ?? [] }
}

export async function upsertPushSubscription(input: {
  profile_id: string
  endpoint: string
  p256dh: string
  auth: string
}): Promise<MemPushSubscription> {
  if (!(await supabaseReady())) {
    return memUpsertPushSubscription(input)
  }

  const supabase = createSystemClient('push_upsert')
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        profile_id: input.profile_id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
      },
      { onConflict: 'endpoint' },
    )
    .select('id, profile_id, endpoint, p256dh, auth, created_at')
    .single()

  if (error) throw new Error(error.message)
  return data as MemPushSubscription
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  if (!(await supabaseReady())) {
    memDeletePushSubscription(endpoint)
    return
  }

  const supabase = createSystemClient('push_delete')
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)

  if (error) throw new Error(error.message)
}
