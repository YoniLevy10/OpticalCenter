import { beforeEach, describe, expect, it } from 'vitest'
import { memListUsers } from '@/lib/auth/memory-memberships'
import { createUser, deleteUser } from './service'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

describe('deleteUser', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
  })

  it('removes a user and refuses the signed-in account', async () => {
    const created = await createUser({
      full_name: 'לבדיקה',
      email: 'delete-me@example.com',
      role: 'store_employee',
      password: 'secret1',
    })
    expect(memListUsers().some((user) => user.id === created.id)).toBe(true)

    await expect(deleteUser(created.id, created.id)).rejects.toThrow(/מחובר/)
    expect(memListUsers().some((user) => user.id === created.id)).toBe(true)

    await deleteUser(created.id, 'someone-else')
    expect(memListUsers().some((user) => user.id === created.id)).toBe(false)
  })
})