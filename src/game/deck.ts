import { hasSecondChance } from './scoring'
import { ACTION_IDS, MODIFIER_IDS, type ActionId, type Hand, type ModifierId } from './types'

export const NUMBER_VALUES = Array.from({ length: 13 }, (_, value) => value)
export const ACTION_COPIES = 3

/** The deck holds one 0, one 1, two 2s, three 3s … twelve 12s. */
export function numberCopies(value: number): number {
  return value === 0 ? 1 : value
}

export interface DeckCounts {
  /** Indexed by card value, 0–12. */
  numbers: number[]
  modifiers: Record<ModifierId, number>
  actions: Record<ActionId, number>
}

export function fullDeck(): DeckCounts {
  return {
    numbers: NUMBER_VALUES.map(numberCopies),
    modifiers: Object.fromEntries(MODIFIER_IDS.map((id) => [id, 1])) as Record<ModifierId, number>,
    actions: Object.fromEntries(ACTION_IDS.map((id) => [id, ACTION_COPIES])) as Record<
      ActionId,
      number
    >,
  }
}

export function countCards(deck: DeckCounts): number {
  const sum = (values: number[]) => values.reduce((total, count) => total + count, 0)
  return sum(deck.numbers) + sum(Object.values(deck.modifiers)) + sum(Object.values(deck.actions))
}

export const DECK_SIZE = countCards(fullDeck())

export interface DeckEstimate {
  remaining: DeckCounts
  total: number
  /** More copies of a card were recorded than the deck contains. */
  outOfSync: boolean
}

/** Works out what is left in the draw pile after removing every recorded card. */
export function estimateDeck(hands: Iterable<Hand>): DeckEstimate {
  const remaining = fullDeck()
  for (const hand of hands) {
    for (const value of hand.numbers) remaining.numbers[value] -= 1
    for (const value of hand.discards) remaining.numbers[value] -= 1
    if (hand.bustCard !== null) remaining.numbers[hand.bustCard] -= 1
    for (const id of hand.modifiers) remaining.modifiers[id] -= 1
    for (const id of hand.actions) remaining.actions[id] -= 1
  }

  let outOfSync = false
  const clamp = (count: number) => {
    if (count < 0) outOfSync = true
    return Math.max(0, count)
  }
  remaining.numbers = remaining.numbers.map(clamp)
  for (const id of MODIFIER_IDS) remaining.modifiers[id] = clamp(remaining.modifiers[id])
  for (const id of ACTION_IDS) remaining.actions[id] = clamp(remaining.actions[id])

  return { remaining, total: countCards(remaining), outOfSync }
}

export interface BustRisk {
  /** Cards left in the deck that would duplicate a number in the hand. */
  bustCards: number
  deckSize: number
  /** Chance that the next card is a duplicate, 0–1. */
  chance: number
  /** A Second Chance would absorb the duplicate. */
  protected: boolean
}

export function bustRisk(hand: Hand, deck: DeckEstimate): BustRisk {
  const bustCards = hand.numbers.reduce((sum, value) => sum + deck.remaining.numbers[value], 0)
  return {
    bustCards,
    deckSize: deck.total,
    chance: deck.total > 0 ? bustCards / deck.total : 0,
    protected: hasSecondChance(hand),
  }
}
