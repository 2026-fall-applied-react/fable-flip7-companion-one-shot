import type { Dispatch, ReactNode } from 'react'
import { ACTION_COPIES, DECK_SIZE, NUMBER_VALUES, estimateDeck, numberCopies } from '../game/deck'
import { trackedHands } from '../game/state'
import { ACTION_IDS, MODIFIER_IDS, type GameAction, type GameState } from '../game/types'
import { ActionCard, ModifierCard, NumberCard } from './Card'
import { ACTION_INFO, cx } from './cardInfo'
import { ConfirmButton } from './ConfirmButton'

interface DeckViewProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

function Slot({ left, copies, name, children }: { left: number; copies: number; name?: string; children: ReactNode }) {
  return (
    <li className={cx('deck__slot', left === 0 && 'is-out')}>
      {children}
      <span className="deck__count">
        <strong>{left}</strong> / {copies}
      </span>
      {name && <span className="deck__name">{name}</span>}
    </li>
  )
}

export function DeckView({ state, dispatch }: DeckViewProps) {
  const deck = estimateDeck(trackedHands(state))
  const { remaining } = deck
  const firstRound = state.deckFromRound + 1
  const currentRound = state.rounds.length + 1

  return (
    <div className="stack">
      <section className="panel" aria-labelledby="deck-title">
        <div className="panel__header">
          <h2 id="deck-title">Deck tracker</h2>
          <span className="panel__meta">
            {deck.total} of {DECK_SIZE} left
          </span>
        </div>
        <p className="muted">
          Cards still in the draw pile, based on everything entered{' '}
          {firstRound === currentRound ? `in round ${currentRound}` : `since round ${firstRound}`}.
          Bust odds use these counts, so they are most accurate when every card is recorded as it is
          dealt.
        </p>

        {(deck.outOfSync || deck.total === 0) && (
          <p className="banner banner--warn" role="status">
            More cards have been recorded than the deck holds. The discards were probably shuffled
            back in — mark the reshuffle below.
          </p>
        )}

        <h3 className="deck__heading">Number cards</h3>
        <ul className="deck__grid">
          {NUMBER_VALUES.map((value) => (
            <Slot key={value} left={remaining.numbers[value]} copies={numberCopies(value)}>
              <NumberCard value={value} />
            </Slot>
          ))}
        </ul>

        <h3 className="deck__heading">Score modifiers</h3>
        <ul className="deck__grid">
          {MODIFIER_IDS.map((id) => (
            <Slot key={id} left={remaining.modifiers[id]} copies={1}>
              <ModifierCard id={id} />
            </Slot>
          ))}
        </ul>

        <h3 className="deck__heading">Action cards</h3>
        <ul className="deck__grid deck__grid--wide">
          {ACTION_IDS.map((id) => (
            <Slot key={id} left={remaining.actions[id]} copies={ACTION_COPIES} name={ACTION_INFO[id].name}>
              <ActionCard id={id} />
            </Slot>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="reshuffle-title">
        <div className="panel__header">
          <h2 id="reshuffle-title">Ran out of cards?</h2>
        </div>
        <p className="muted">
          When the draw pile runs out, the discards from earlier rounds are shuffled into a new deck.
          Cards in front of players stay where they are.
        </p>
        <div className="button-row">
          <ConfirmButton
            disabled={state.phase !== 'playing' || state.deckFromRound === state.rounds.length}
            onConfirm={() => dispatch({ type: 'reshuffle' })}
          >
            Deck was reshuffled
          </ConfirmButton>
        </div>
      </section>
    </div>
  )
}
