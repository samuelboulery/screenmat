import { describe, expect, it } from 'vitest'
import { isCanvasMissing } from '../canvas-missing.ts'

const notFound = (message: string) => Object.assign(new Error(message), { code: 'ERR_MODULE_NOT_FOUND' })

describe('isCanvasMissing', () => {
  it('reconnaît le paquet absent', () => {
    expect(isCanvasMissing(notFound("Cannot find package '@napi-rs/canvas' imported from /x/dom-shim.js"))).toBe(true)
  })
  it('reconnaît le binaire absent', () => {
    expect(isCanvasMissing(new Error('Cannot find native binding. npm has a bug'))).toBe(true)
    expect(isCanvasMissing(new Error('Failed to load native binding'))).toBe(true)
  })
  it('ignore un autre paquet manquant importé depuis canvas', () => {
    const path = '/p/.pnpm/@napi-rs+canvas@1/node_modules/@napi-rs/canvas/index.js'
    expect(isCanvasMissing(notFound(`Cannot find package 'autre' imported from ${path}`))).toBe(false)
  })
  it('ignore ce qui n’est pas une Error', () => {
    expect(isCanvasMissing(null)).toBe(false)
    expect(isCanvasMissing('Failed to load native binding')).toBe(false)
  })
})
