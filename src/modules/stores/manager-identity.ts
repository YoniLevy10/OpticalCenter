import { phonesMatch } from '@/modules/whatsapp/classify'
import { ISRAEL_STORES } from './israel-stores'

/** The one store this phone manages. Two stores on the same phone stay unresolved. */
export function soleManagerStore(waId: string) {
  const hits = ISRAEL_STORES.filter(
    (store) => store.managerPhone && phonesMatch(waId, store.managerPhone),
  )
  return hits.length === 1 ? hits[0] : null
}
