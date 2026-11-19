import { describe, expect, it } from 'vitest'
import { DECK_SIZE, bustRisk, estimateDeck } from './deck'
import { describeScore, emptyHand, hasSecondChance, scoreHand } from './scoring'
import { initialState, reducer, totals, trackedHands, winner } from './state'
import { parseState } from './storage'
import type { GameAction, GameState, Hand } from './types'

const hand = (overrides: Partial<Hand>): Hand => ({ ...emptyHand(), ...overrides })

const play = (state: GameState, ...actions: GameAction[]) => actions.reduce(reducer, state)

function newGame(target = 200): GameState {
  return play(
    initialState(),
    { type: 'addPlayer', id: 'a', name: '  Ann ' },
    { type: 'addPlayer', id: 'b', name: 'Bob' },
    { type: 'setTarget', target },
    { type: 'startGame' },
  )
}

const deal = (playerId: string, ...values: number[]): GameAction[] =>
  values.map((value) => ({ type: 'dealNumber', playerId, value }))

describe('scoring', () => {
  it('doubles the numbers before adding bonus cards', () => {
    const scored = hand({ numbers: [5, 9], modifiers: ['+4', 'x2'] })
    expect(scoreHand(scored)).toBe(32)
    expect(describeScore(scored)).toBe('(5 + 9) × 2 + 4 bonus = 32')
  })

  it('adds 15 for seven unique numbers', () => {
    expect(scoreHand(hand({ numbers: [0, 1, 2, 3, 4, 5, 6], status: 'stayed' }))).toBe(36)
  })

  it('scores nothing for a bust, whatever the cards', () => {
    expect(scoreHand(hand({ numbers: [12, 11], modifiers: ['+10'], status: 'busted' }))).toBe(0)
  })

  it('still counts bonus cards when there are no numbers', () => {
    expect(scoreHand(hand({ modifiers: ['x2', '+6'], status: 'stayed' }))).toBe(6)
  })
})

describe('deck', () => {
  it('has 94 cards', () => {
    expect(DECK_SIZE).toBe(94)
  })

  it('counts every recorded card, including duplicates', () => {
    const deck = estimateDeck([
      hand({ numbers: [12, 7], discards: [7], actions: ['secondChance'] }),
      hand({ numbers: [12], bustCard: 12, status: 'busted', modifiers: ['x2'] }),
    ])
    expect(deck.remaining.numbers[12]).toBe(9)
    expect(deck.remaining.numbers[7]).toBe(5)
    expect(deck.remaining.modifiers.x2).toBe(0)
    expect(deck.remaining.actions.secondChance).toBe(2)
    expect(deck.total).toBe(94 - 7)
    expect(deck.outOfSync).toBe(false)
  })

  it('flags impossible counts instead of going negative', () => {
    const deck = estimateDeck([hand({ numbers: [1] }), hand({ numbers: [1] })])
    expect(deck.remaining.numbers[1]).toBe(0)
    expect(deck.outOfSync).toBe(true)
  })

  it('works out the chance of a duplicate from what is left', () => {
    const mine = hand({ numbers: [12, 0] })
    const risk = bustRisk(mine, estimateDeck([mine]))
    expect(risk.bustCards).toBe(11)
    expect(risk.deckSize).toBe(92)
    expect(risk.chance).toBeCloseTo(11 / 92)
    expect(risk.protected).toBe(false)
  })
})

describe('playing a round', () => {
  it('busts on a duplicate number', () => {
    const state = play(newGame(), ...deal('a', 8, 8))
    expect(state.hands.a).toMatchObject({ numbers: [8], status: 'busted', bustCard: 8 })
    expect(play(state, ...deal('a', 3)).hands.a.numbers).toEqual([8])
  })

  it('spends a Second Chance on the first duplicate only', () => {
    const shielded = play(
      newGame(),
      ...deal('a', 8),
      { type: 'dealAction', playerId: 'a', action: 'secondChance' },
      ...deal('a', 8),
    )
    expect(shielded.hands.a).toMatchObject({ numbers: [8], discards: [8], status: 'playing' })
    expect(hasSecondChance(shielded.hands.a)).toBe(false)
    expect(play(shielded, ...deal('a', 8)).hands.a.status).toBe('busted')
  })

  it('will not give a player two live Second Chances', () => {
    const action: GameAction = { type: 'dealAction', playerId: 'a', action: 'secondChance' }
    expect(play(newGame(), action, action).hands.a.actions).toEqual(['secondChance'])
  })

  it('ends a hand on Freeze and on the seventh number', () => {
    const state = play(
      newGame(),
      { type: 'dealAction', playerId: 'a', action: 'freeze' },
      ...deal('b', 1, 2, 3, 4, 5, 6, 7, 9),
    )
    expect(state.hands.a.status).toBe('stayed')
    expect(state.hands.b).toMatchObject({ numbers: [1, 2, 3, 4, 5, 6, 7], status: 'stayed' })
  })

  it('puts a player back in play when the card that ended their hand is removed', () => {
    const state = play(
      newGame(),
      { type: 'dealAction', playerId: 'a', action: 'freeze' },
      { type: 'removeCard', playerId: 'a', card: { kind: 'action', id: 'freeze' } },
      ...deal('b', 1, 2, 3, 4, 5, 6, 7),
      { type: 'removeCard', playerId: 'b', card: { kind: 'number', value: 7 } },
    )
    expect(state.hands.a.status).toBe('playing')
    expect(state.hands.b).toMatchObject({ numbers: [1, 2, 3, 4, 5, 6], status: 'playing' })
  })

  it('restores a spent Second Chance when it is removed along with its duplicate', () => {
    const state = play(
      newGame(),
      ...deal('a', 4),
      { type: 'dealAction', playerId: 'a', action: 'secondChance' },
      ...deal('a', 4),
      { type: 'removeCard', playerId: 'a', card: { kind: 'action', id: 'secondChance' } },
    )
    expect(state.hands.a).toMatchObject({ numbers: [4], actions: [], discards: [] })
  })

  it('undoes one step at a time', () => {
    const state = play(newGame(), ...deal('a', 8, 8), { type: 'undo' })
    expect(state.hands.a).toMatchObject({ numbers: [8], status: 'playing', bustCard: null })
    expect(play(state, { type: 'undo' }, { type: 'undo' }).hands.a.numbers).toEqual([])
  })
})

describe('scoring rounds', () => {
  it('ignores an untouched round', () => {
    const state = newGame()
    expect(reducer(state, { type: 'endRound' })).toBe(state)
  })

  it('banks every hand that has not busted and starts a fresh round', () => {
    const state = play(newGame(), ...deal('a', 10, 12), ...deal('b', 5, 5), { type: 'endRound' })
    expect(totals(state)).toEqual({ a: 22, b: 0 })
    expect(state.rounds).toHaveLength(1)
    expect(state.hands.a.numbers).toEqual([])
    expect(state.phase).toBe('playing')
  })

  it('finishes when one player leads on or past the target', () => {
    const state = play(newGame(20), ...deal('a', 10, 12), ...deal('b', 5), { type: 'endRound' })
    expect(state.phase).toBe('finished')
    expect(winner(state)?.name).toBe('Ann')
  })

  it('keeps playing while the leaders are tied', () => {
    const state = play(newGame(20), ...deal('a', 10, 12), ...deal('b', 12, 10), { type: 'endRound' })
    expect(state.phase).toBe('playing')
    expect(winner(state)).toBeNull()
  })

  it('reopens the last round for corrections', () => {
    const finished = play(newGame(20), ...deal('a', 10, 12), { type: 'endRound' })
    const reopened = reducer(finished, { type: 'reopenRound' })
    expect(reopened.phase).toBe('playing')
    expect(reopened.rounds).toHaveLength(0)
    expect(reopened.hands.a.numbers).toEqual([10, 12])
  })

  it('refuses to reopen over a round that is in progress', () => {
    const state = play(newGame(), ...deal('a', 1), { type: 'endRound' }, ...deal('b', 2))
    expect(reducer(state, { type: 'reopenRound' })).toBe(state)
  })

  it('keeps earlier rounds out of the deck until it is reshuffled', () => {
    const state = play(newGame(), ...deal('a', 12), { type: 'endRound' }, ...deal('b', 12))
    expect(estimateDeck(trackedHands(state)).remaining.numbers[12]).toBe(10)

    const reshuffled = reducer(state, { type: 'reshuffle' })
    expect(estimateDeck(trackedHands(reshuffled)).remaining.numbers[12]).toBe(11)
  })

  it('starts a rematch with the same players and a clean sheet', () => {
    const state = play(newGame(20), ...deal('a', 10, 12), { type: 'endRound' }, { type: 'newGame', mode: 'rematch' })
    expect(state).toMatchObject({ phase: 'playing', rounds: [], targetScore: 20 })
    expect(state.players.map((player) => player.name)).toEqual(['Ann', 'Bob'])
  })
})

describe('saved games', () => {
  it('round-trips a game in progress', () => {
    const state = play(newGame(), ...deal('a', 3, 3), { type: 'endRound' }, ...deal('b', 9))
    expect(parseState(JSON.stringify(state))).toEqual(state)
  })

  it('rejects anything that is not a valid game', () => {
    const state = newGame()
    expect(parseState(null)).toBeNull()
    expect(parseState('{not json')).toBeNull()
    expect(parseState('[]')).toBeNull()
    expect(parseState(JSON.stringify({ ...state, hands: { a: state.hands.a } }))).toBeNull()
    expect(
      parseState(JSON.stringify({ ...state, hands: { ...state.hands, a: { ...state.hands.a, numbers: [13] } } })),
    ).toBeNull()
  })
})
