import { describe, expect, it } from 'vitest'
import { parseDriveLink } from './folder'

describe('parseDriveLink', () => {
  it('reads a folder link', () => {
    expect(
      parseDriveLink('https://drive.google.com/drive/folders/1AbC_def-1234567890'),
    ).toEqual({ kind: 'folder', id: '1AbC_def-1234567890' })
  })

  it('reads a file link', () => {
    expect(
      parseDriveLink('https://drive.google.com/file/d/1fileId_abc-XYZ/view'),
    ).toEqual({ kind: 'file', id: '1fileId_abc-XYZ' })
  })

  it('rejects an empty paste', () => {
    expect(parseDriveLink('  ')).toBeNull()
  })
})
