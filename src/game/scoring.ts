import type { Hand } from './types'

export const FLIP_7_SIZE = 7
export const FLIP_7_BONUS = 15

export function emptyHand(): Hand {
  return { numbers: [], modifiers: [], actions: [], status: 'playing', bustCard: null, discards: [] }
}

export function isEmptyHand(hand: Hand): boolean {
  return (
    hand.status === 'playing' &&
    hand.numbers.length === 0 &&
    hand.modifiers.length === 0 &&
    hand.actions.length === 0 &&
    hand.discards.length === 0
  )
}

export function isFlip7(hand: Hand): boolean {
  return hand.status !== 'busted' && hand.numbers.length >= FLIP_7_SIZE
}

/** True while the player holds a Second Chance that has not been spent yet. */
export function hasSecondChance(hand: Hand): boolean {
  return hand.actions.filter((action) => action === 'secondChance').length > hand.discards.length
}

export interface ScoreBreakdown {
  numberSum: number
  doubled: boolean
  modifierBonus: number
  flip7Bonus: number
  total: number
}

export function scoreBreakdown(hand: Hand): ScoreBreakdown {
  const numberSum = hand.numbers.reduce((sum, value) => sum + value, 0)
  const doubled = hand.modifiers.includes('x2')
  const modifierBonus = hand.modifiers.reduce(
    (sum, modifier) => (modifier === 'x2' ? sum : sum + Number(modifier)),
    0,
  )
  const flip7Bonus = isFlip7(hand) ? FLIP_7_BONUS : 0
  const total =
    hand.status === 'busted' ? 0 : numberSum * (doubled ? 2 : 1) + modifierBonus + flip7Bonus
  return { numberSum, doubled, modifierBonus, flip7Bonus, total }
}

export function scoreHand(hand: Hand): number {
  return scoreBreakdown(hand).total
}

/** Human readable maths for a hand, e.g. "(5 + 9) × 2 + 4 bonus = 32". */
export function describeScore(hand: Hand): string {
  if (hand.status === 'busted') return 'Bust — scores 0 this round'
  if (hand.numbers.length === 0 && hand.modifiers.length === 0) return 'No cards yet'

  const { doubled, modifierBonus, flip7Bonus, total } = scoreBreakdown(hand)
  const sorted = [...hand.numbers].sort((a, b) => a - b)
  const numbers = sorted.length > 0 ? sorted.join(' + ') : '0'
  const parts = [doubled ? `(${numbers}) × 2` : numbers]
  if (modifierBonus > 0) parts.push(`${modifierBonus} bonus`)
  if (flip7Bonus > 0) parts.push(`${flip7Bonus} Flip 7`)
  return `${parts.join(' + ')} = ${total}`
}
