import { useMemo, useState, type Dispatch } from 'react'
import { estimateDeck } from '../game/deck'
import { scoreHand } from '../game/scoring'
import {
  dealer,
  flip7Player,
  isRoundOver,
  isRoundUntouched,
  leaders,
  reducer,
  totals,
  trackedHands,
} from '../game/state'
import type { GameAction, GameState } from '../game/types'
import { cx } from './cardInfo'
import { PlayerHand } from './PlayerHand'
import { Standings } from './Standings'

interface RoundViewProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

export function RoundView({ state, dispatch }: RoundViewProps) {
  const { players, hands, rounds } = state
  const roundNumber = rounds.length + 1
  const deck = useMemo(() => estimateDeck(trackedHands(state)), [state])
  const banked = useMemo(() => totals(state), [state])
  const pending = Object.fromEntries(players.map((player) => [player.id, scoreHand(hands[player.id])]))

  // Play starts with the player after the dealer.
  const [openId, setOpenId] = useState<string | null>(
    () => players[roundNumber % players.length]?.id ?? null,
  )

  const currentDealer = dealer(state)
  const flipper = flip7Player(state)
  const over = isRoundOver(state)
  const untouched = isRoundUntouched(state)
  const top = leaders(state)
  const tiedAtTarget = top.length > 1 && banked[top[0].id] >= state.targetScore

  function handleAction(action: GameAction, advance = false) {
    dispatch(action)
    if (!state.followTurns || !advance || !('playerId' in action)) return
    const next = reducer(state, action)
    if (next === state || isRoundOver(next)) return
    const seat = players.findIndex((player) => player.id === action.playerId)
    for (let step = 1; step <= players.length; step++) {
      const candidate = players[(seat + step) % players.length]
      if (next.hands[candidate.id].status === 'playing') {
        setOpenId(candidate.id)
        return
      }
    }
  }

  return (
    <div className="round">
      <div className="round__main">
        <div className="round__intro">
          <div>
            <h2>Round {roundNumber}</h2>
            {currentDealer && <p className="muted">{currentDealer.name} deals</p>}
          </div>
          <label className="switch" title="Jump to the next active player after each card">
            <input
              type="checkbox"
              checked={state.followTurns}
              onChange={(event) => dispatch({ type: 'setFollowTurns', value: event.target.checked })}
            />
            <span>Follow turns</span>
          </label>
        </div>

        {tiedAtTarget && untouched && (
          <p className="banner banner--info" role="status">
            {top.map((player) => player.name).join(' and ')} are tied on {banked[top[0].id]}. Keep
            playing until one player leads alone.
          </p>
        )}
        {flipper ? (
          <p className="banner banner--flip7" role="status">
            <strong>{flipper.name} flipped 7!</strong> The round ends now — everyone who hasn't
            busted banks their cards.
          </p>
        ) : (
          over && (
            <p className="banner banner--info" role="status">
              Everyone has stayed or busted. Score the round when you're ready.
            </p>
          )
        )}
        {(deck.outOfSync || deck.total === 0) && (
          <p className="banner banner--warn" role="status">
            The deck tracker has run out of cards. If the discards were shuffled, mark it on the
            Deck tab to keep the odds accurate.
          </p>
        )}

        <div className="hands">
          {players.map((player) => (
            <PlayerHand
              key={player.id}
              player={player}
              hand={hands[player.id]}
              banked={banked[player.id]}
              deck={deck}
              isDealer={player.id === currentDealer?.id}
              open={openId === player.id}
              onToggle={() => setOpenId(openId === player.id ? null : player.id)}
              onAction={handleAction}
            />
          ))}
        </div>
      </div>

      <aside className="round__side">
        <Standings players={players} totals={banked} pending={pending} target={state.targetScore} />
      </aside>

      <div className="action-bar">
        <div className="action-bar__inner">
          {rounds.length > 0 && untouched ? (
            <button type="button" className="btn" onClick={() => dispatch({ type: 'reopenRound' })}>
              Edit round {rounds.length}
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              disabled={state.undoStack.length === 0}
              onClick={() => dispatch({ type: 'undo' })}
            >
              Undo
            </button>
          )}
          <button
            type="button"
            className={cx('btn', 'btn--primary', over && 'is-ready')}
            disabled={untouched}
            onClick={() => dispatch({ type: 'endRound' })}
          >
            Score round {roundNumber}
          </button>
        </div>
      </div>
    </div>
  )
}
