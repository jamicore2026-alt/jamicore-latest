import { describe, it, expect } from 'vitest'

export function add(a: number, b: number): number {
  return a + b
}

describe('math', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
})
