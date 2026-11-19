import { initialState } from './state'
import {
  ACTION_IDS,
  HAND_STATUSES,
  MODIFIER_IDS,
  type CompletedRound,
  type GameState,
  type Hand,
  type Player,
} from './types'

const STORAGE_KEY = 'flip7-companion/v1'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isCardValue = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 12

const isListOf = <T>(value: unknown, allowed: readonly T[]): value is T[] =>
  Array.isArray(value) && value.every((item) => allowed.includes(item as T))

function isHand(value: unknown): value is Hand {
  return (
    isObject(value) &&
    Array.isArray(value.numbers) &&
    value.numbers.every(isCardValue) &&
    Array.isArray(value.discards) &&
    value.discards.every(isCardValue) &&
    isListOf(value.modifiers, MODIFIER_IDS) &&
    isListOf(value.actions, ACTION_IDS) &&
    HAND_STATUSES.includes(value.status as Hand['status']) &&
    (value.bustCard === null || isCardValue(value.bustCard))
  )
}

function isHandMap(value: unknown, players: Player[]): value is Record<string, Hand> {
  return isObject(value) && players.every((player) => isHand(value[player.id]))
}

function isPlayer(value: unknown): value is Player {
  return isObject(value) && typeof value.id === 'string' && typeof value.name === 'string'
}

function isRound(value: unknown, players: Player[]): value is CompletedRound {
  return (
    isObject(value) &&
    isHandMap(value.hands, players) &&
    isObject(value.scores) &&
    players.every((player) => typeof (value.scores as Record<string, unknown>)[player.id] === 'number')
  )
}

export function parseState(raw: string | null): GameState | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isObject(data)) return null

  const { phase, players, rounds, hands, undoStack, targetScore, deckFromRound, followTurns } = data
  if (phase !== 'setup' && phase !== 'playing' && phase !== 'finished') return null
  if (!Array.isArray(players) || !players.every(isPlayer)) return null
  if (!Array.isArray(rounds) || !rounds.every((round) => isRound(round, players))) return null
  if (typeof targetScore !== 'number' || !Number.isInteger(targetScore) || targetScore < 1) return null
  if (!isObject(hands) || (phase !== 'setup' && !isHandMap(hands, players))) return null
  if (phase !== 'setup' && players.length === 0) return null

  const validUndo = Array.isArray(undoStack) && undoStack.every((entry) => isHandMap(entry, players))
  const validDeckStart =
    Number.isInteger(deckFromRound) &&
    (deckFromRound as number) >= 0 &&
    (deckFromRound as number) <= rounds.length

  return {
    phase,
    players,
    targetScore,
    rounds,
    hands: hands as Record<string, Hand>,
    undoStack: validUndo ? undoStack : [],
    deckFromRound: validDeckStart ? (deckFromRound as number) : 0,
    followTurns: followTurns === true,
  }
}

export function loadState(): GameState {
  try {
    return parseState(localStorage.getItem(STORAGE_KEY)) ?? initialState()
  } catch {
    return initialState()
  }
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable (private mode, quota); the game still works in memory.
  }
}
