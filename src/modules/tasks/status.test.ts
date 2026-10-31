import { describe, expect, it } from 'vitest'
import { readTaskStatus, taskStatusMoves } from './status'

describe('readTaskStatus', () => {
  it('keeps an explicit status', () => {
    expect(readTaskStatus({ done: false, needsClarification: false, status: 'doing' })).toBe('doing')
  })

  it('derives waiting and done from the older flags', () => {
    expect(readTaskStatus({ done: true, needsClarification: false })).toBe('done')
    expect(readTaskStatus({ done: false, needsClarification: true })).toBe('waiting')
    expect(readTaskStatus({ done: false, needsClarification: false })).toBe('open')
  })
})

describe('taskStatusMoves', () => {
  it('offers a different set of buttons for each status', () => {
    expect(taskStatusMoves('open').map((row) => row.label)).toEqual(['בטיפול', 'ממתין', 'הושלם'])
    expect(taskStatusMoves('doing').map((row) => row.status)).toEqual(['done', 'waiting', 'open'])
    expect(taskStatusMoves('waiting')[0]?.label).toBe('חזרה לטיפול')
    expect(taskStatusMoves('done').map((row) => row.label)).toEqual(['פתיחה מחדש'])
  })
})
