import { FLIP_7_SIZE, emptyHand, hasSecondChance, isEmptyHand, isFlip7, scoreHand } from './scoring'
import type { CardRef, GameAction, GameState, Hand, Player } from './types'

export const DEFAULT_TARGET = 200
export const MAX_TARGET = 9999
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 18
export const MAX_NAME_LENGTH = 20
const UNDO_LIMIT = 100

export function initialState(): GameState {
  return {
    phase: 'setup',
    players: [],
    targetScore: DEFAULT_TARGET,
    rounds: [],
    hands: {},
    undoStack: [],
    deckFromRound: 0,
    followTurns: false,
  }
}

export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH)
}

function freshHands(players: Player[]): Record<string, Hand> {
  return Object.fromEntries(players.map((player) => [player.id, emptyHand()]))
}

/** Banked points per player, not counting the round in progress. */
export function totals(state: GameState): Record<string, number> {
  const result: Record<string, number> = {}
  for (const player of state.players) {
    result[player.id] = state.rounds.reduce((sum, round) => sum + (round.scores[player.id] ?? 0), 0)
  }
  return result
}

export function dealer(state: GameState): Player | undefined {
  return state.players[state.rounds.length % state.players.length]
}

/** Everyone sharing the highest banked total. */
export function leaders(state: GameState): Player[] {
  const scores = totals(state)
  const best = Math.max(...state.players.map((player) => scores[player.id]))
  return state.players.filter((player) => scores[player.id] === best)
}

/** The game is won by a single leader who has reached the target. */
export function winner(state: GameState): Player | null {
  const top = leaders(state)
  if (top.length !== 1) return null
  return totals(state)[top[0].id] >= state.targetScore ? top[0] : null
}

export function flip7Player(state: GameState): Player | undefined {
  return state.players.find((player) => isFlip7(state.hands[player.id]))
}

export function isRoundUntouched(state: GameState): boolean {
  return state.players.every((player) => isEmptyHand(state.hands[player.id]))
}

/** Nobody can take another card: someone flipped seven, or everyone stayed or busted. */
export function isRoundOver(state: GameState): boolean {
  if (flip7Player(state)) return true
  return state.players.every((player) => state.hands[player.id].status !== 'playing')
}

/** Hands whose cards have left the draw pile since the last shuffle. */
export function trackedHands(state: GameState): Hand[] {
  const past = state.rounds.slice(state.deckFromRound).flatMap((round) => Object.values(round.hands))
  return [...past, ...Object.values(state.hands)]
}

function dealNumber(hand: Hand, value: number): Hand {
  if (hand.status !== 'playing' || !Number.isInteger(value) || value < 0 || value > 12) return hand
  if (hand.numbers.includes(value)) {
    if (hasSecondChance(hand)) return { ...hand, discards: [...hand.discards, value] }
    return { ...hand, status: 'busted', bustCard: value }
  }
  if (hand.numbers.length >= FLIP_7_SIZE) return hand
  const numbers = [...hand.numbers, value]
  return { ...hand, numbers, status: numbers.length >= FLIP_7_SIZE ? 'stayed' : 'playing' }
}

function removeCard(hand: Hand, card: CardRef): Hand {
  switch (card.kind) {
    case 'number':
      if (!hand.numbers.includes(card.value)) return hand
      return {
        ...hand,
        numbers: hand.numbers.filter((value) => value !== card.value),
        // Taking a card back from a Flip 7 puts the player back in the round.
        status: isFlip7(hand) ? 'playing' : hand.status,
      }
    case 'modifier':
      if (!hand.modifiers.includes(card.id)) return hand
      return { ...hand, modifiers: hand.modifiers.filter((id) => id !== card.id) }
    case 'action': {
      const index = hand.actions.lastIndexOf(card.id)
      if (index === -1) return hand
      const actions = hand.actions.filter((_, i) => i !== index)
      const secondChances = actions.filter((id) => id === 'secondChance').length
      const unfrozen = card.id === 'freeze' && hand.status === 'stayed' && !isFlip7(hand)
      return {
        ...hand,
        actions,
        discards: hand.discards.slice(0, secondChances),
        status: unfrozen ? 'playing' : hand.status,
      }
    }
    case 'discard':
      if (card.index < 0 || card.index >= hand.discards.length) return hand
      return { ...hand, discards: hand.discards.filter((_, i) => i !== card.index) }
  }
}

function updateHand(state: GameState, playerId: string, update: (hand: Hand) => Hand): GameState {
  if (state.phase !== 'playing') return state
  const hand = state.hands[playerId]
  if (!hand) return state
  const next = update(hand)
  if (next === hand) return state
  return {
    ...state,
    hands: { ...state.hands, [playerId]: next },
    undoStack: [...state.undoStack, state.hands].slice(-UNDO_LIMIT),
  }
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'addPlayer': {
      const name = cleanName(action.name)
      if (state.phase !== 'setup' || !name || state.players.length >= MAX_PLAYERS) return state
      if (state.players.some((player) => player.id === action.id)) return state
      return { ...state, players: [...state.players, { id: action.id, name }] }
    }

    case 'removePlayer':
      if (state.phase !== 'setup') return state
      return { ...state, players: state.players.filter((player) => player.id !== action.id) }

    case 'renamePlayer': {
      const name = cleanName(action.name)
      if (!name) return state
      return {
        ...state,
        players: state.players.map((player) =>
          player.id === action.id ? { ...player, name } : player,
        ),
      }
    }

    case 'movePlayer': {
      if (state.phase !== 'setup') return state
      const from = state.players.findIndex((player) => player.id === action.id)
      const to = from + action.direction
      if (from === -1 || to < 0 || to >= state.players.length) return state
      const players = [...state.players]
      ;[players[from], players[to]] = [players[to], players[from]]
      return { ...state, players }
    }

    case 'setTarget':
      if (state.phase !== 'setup' || !Number.isInteger(action.target)) return state
      if (action.target < 1 || action.target > MAX_TARGET) return state
      return { ...state, targetScore: action.target }

    case 'startGame':
      if (state.phase !== 'setup' || state.players.length < MIN_PLAYERS) return state
      return {
        ...state,
        phase: 'playing',
        rounds: [],
        hands: freshHands(state.players),
        undoStack: [],
        deckFromRound: 0,
      }

    case 'dealNumber':
      return updateHand(state, action.playerId, (hand) => dealNumber(hand, action.value))

    case 'dealModifier':
      return updateHand(state, action.playerId, (hand) => {
        if (hand.status !== 'playing' || hand.modifiers.includes(action.modifier)) return hand
        return { ...hand, modifiers: [...hand.modifiers, action.modifier] }
      })

    case 'dealAction':
      return updateHand(state, action.playerId, (hand) => {
        if (hand.status !== 'playing') return hand
        if (action.action === 'secondChance' && hasSecondChance(hand)) return hand
        const actions = [...hand.actions, action.action]
        return { ...hand, actions, status: action.action === 'freeze' ? 'stayed' : hand.status }
      })

    case 'removeCard':
      return updateHand(state, action.playerId, (hand) => removeCard(hand, action.card))

    case 'setStatus':
      return updateHand(state, action.playerId, (hand) =>
        hand.status === action.status ? hand : { ...hand, status: action.status, bustCard: null },
      )

    case 'clearHand':
      return updateHand(state, action.playerId, (hand) => (isEmptyHand(hand) ? hand : emptyHand()))

    case 'undo': {
      const previous = state.undoStack.at(-1)
      if (state.phase !== 'playing' || !previous) return state
      return { ...state, hands: previous, undoStack: state.undoStack.slice(0, -1) }
    }

    case 'endRound': {
      if (state.phase !== 'playing' || isRoundUntouched(state)) return state
      const scores = Object.fromEntries(
        state.players.map((player) => [player.id, scoreHand(state.hands[player.id])]),
      )
      const next: GameState = {
        ...state,
        rounds: [...state.rounds, { hands: state.hands, scores }],
        hands: freshHands(state.players),
        undoStack: [],
      }
      return winner(next) ? { ...next, phase: 'finished' } : next
    }

    case 'reopenRound': {
      const last = state.rounds.at(-1)
      if (!last || state.phase === 'setup') return state
      if (state.phase === 'playing' && !isRoundUntouched(state)) return state
      const rounds = state.rounds.slice(0, -1)
      return {
        ...state,
        phase: 'playing',
        rounds,
        hands: last.hands,
        undoStack: [],
        deckFromRound: Math.min(state.deckFromRound, rounds.length),
      }
    }

    case 'reshuffle':
      if (state.phase !== 'playing') return state
      return { ...state, deckFromRound: state.rounds.length }

    case 'setFollowTurns':
      return { ...state, followTurns: action.value }

    case 'newGame': {
      const base = { ...initialState(), players: state.players, targetScore: state.targetScore }
      base.followTurns = state.followTurns
      if (action.mode === 'setup' || state.players.length < MIN_PLAYERS) return base
      return { ...base, phase: 'playing', hands: freshHands(state.players) }
    }
  }
}
