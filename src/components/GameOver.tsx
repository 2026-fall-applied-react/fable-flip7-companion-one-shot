import type { Dispatch } from 'react'
import { totals, winner } from '../game/state'
import type { GameAction, GameState } from '../game/types'
import { Standings } from './Standings'

interface GameOverProps {
  state: GameState
  dispatch: Dispatch<GameAction>
  onNewGame: (mode: 'rematch' | 'setup') => void
}

export function GameOver({ state, dispatch, onNewGame }: GameOverProps) {
  const banked = totals(state)
  const champion = winner(state)

  return (
    <div className="stack">
      <section className="panel winner" aria-live="polite">
        <p className="winner__trophy" aria-hidden="true">
          🏆
        </p>
        <h2 className="winner__name">{champion ? `${champion.name} wins!` : 'Game over'}</h2>
        {champion && (
          <p className="muted">
            {banked[champion.id]} points after {state.rounds.length}{' '}
            {state.rounds.length === 1 ? 'round' : 'rounds'}
          </p>
        )}
        <div className="button-row button-row--center">
          <button type="button" className="btn btn--primary" onClick={() => onNewGame('rematch')}>
            Play again
          </button>
          <button type="button" className="btn" onClick={() => onNewGame('setup')}>
            Change players
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => dispatch({ type: 'reopenRound' })}>
            Fix last round
          </button>
        </div>
      </section>

      <Standings players={state.players} totals={banked} target={state.targetScore} />
    </div>
  )
}
