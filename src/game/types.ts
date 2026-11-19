export const MODIFIER_IDS = ['+2', '+4', '+6', '+8', '+10', 'x2'] as const
export type ModifierId = (typeof MODIFIER_IDS)[number]

export const ACTION_IDS = ['freeze', 'flipThree', 'secondChance'] as const
export type ActionId = (typeof ACTION_IDS)[number]

export const HAND_STATUSES = ['playing', 'stayed', 'busted'] as const
export type HandStatus = (typeof HAND_STATUSES)[number]

/** Everything in front of one player during a round. */
export interface Hand {
  /** Unique number cards, in the order they were dealt. */
  numbers: number[]
  modifiers: ModifierId[]
  /** Action cards played on or held by this player, including used Second Chances. */
  actions: ActionId[]
  status: HandStatus
  /** The duplicate that busted this hand, when it is known. */
  bustCard: number | null
  /** Duplicates that were cancelled by a Second Chance. */
  discards: number[]
}

export interface Player {
  id: string
  name: string
}

export interface CompletedRound {
  hands: Record<string, Hand>
  scores: Record<string, number>
}

export type Phase = 'setup' | 'playing' | 'finished'

export interface GameState {
  phase: Phase
  players: Player[]
  targetScore: number
  rounds: CompletedRound[]
  /** Hands for the round in progress, keyed by player id. */
  hands: Record<string, Hand>
  undoStack: Record<string, Hand>[]
  /** Index of the first completed round whose cards are still out of the deck. */
  deckFromRound: number
  /** Move to the next active player after each card. */
  followTurns: boolean
}

export type CardRef =
  | { kind: 'number'; value: number }
  | { kind: 'modifier'; id: ModifierId }
  | { kind: 'action'; id: ActionId }
  | { kind: 'discard'; index: number }

export type GameAction =
  | { type: 'addPlayer'; id: string; name: string }
  | { type: 'removePlayer'; id: string }
  | { type: 'renamePlayer'; id: string; name: string }
  | { type: 'movePlayer'; id: string; direction: -1 | 1 }
  | { type: 'setTarget'; target: number }
  | { type: 'startGame' }
  | { type: 'dealNumber'; playerId: string; value: number }
  | { type: 'dealModifier'; playerId: string; modifier: ModifierId }
  | { type: 'dealAction'; playerId: string; action: ActionId }
  | { type: 'removeCard'; playerId: string; card: CardRef }
  | { type: 'setStatus'; playerId: string; status: HandStatus }
  | { type: 'clearHand'; playerId: string }
  | { type: 'undo' }
  | { type: 'endRound' }
  | { type: 'reopenRound' }
  | { type: 'reshuffle' }
  | { type: 'setFollowTurns'; value: boolean }
  | { type: 'newGame'; mode: 'rematch' | 'setup' }
