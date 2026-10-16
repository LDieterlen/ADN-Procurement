import { describe, expect, test } from 'vitest'
import { turn, turnedSize, unturn } from './installationPlan'

describe('géométrie du plan', () => {
  test('tourner le plan déplace un point avec lui (mêmes cas que ffe.installation.turn)', () => {
    expect(turn({ x: 100, y: 200 }, 0)).toEqual({ x: 100, y: 200 })
    expect(turn({ x: 100, y: 200 }, 90)).toEqual({ x: 800, y: 100 })
    expect(turn({ x: 100, y: 200 }, 180)).toEqual({ x: 900, y: 800 })
    expect(turn({ x: 100, y: 200 }, 270)).toEqual({ x: 200, y: 900 })
  })

  test('un clic sur le plan tourné revient au point du plan enregistré', () => {
    for (const rotation of [0, 90, 180, 270]) {
      expect(unturn(turn({ x: 137, y: 912 }, rotation), rotation)).toEqual({ x: 137, y: 912 })
    }
  })

  test('un quart de tour échange largeur et hauteur', () => {
    expect(turnedSize({ w: 400, h: 300 }, 90)).toEqual({ w: 300, h: 400 })
    expect(turnedSize({ w: 400, h: 300 }, 180)).toEqual({ w: 400, h: 300 })
  })
})
