import type { Dispatch } from 'react'
import { isFlip7 } from '../game/scoring'
import { isRoundUntouched, totals } from '../game/state'
import type { GameAction, GameState } from '../game/types'
import { cx } from './cardInfo'
import { ConfirmButton } from './ConfirmButton'
import { Standings } from './Standings'

interface ScoresViewProps {
  state: GameState
  dispatch: Dispatch<GameAction>
  onNewGame: (mode: 'rematch' | 'setup') => void
}

export function ScoresView({ state, dispatch, onNewGame }: ScoresViewProps) {
  const { players, rounds } = state
  const banked = totals(state)
  const canReopen = rounds.length > 0 && (state.phase === 'finished' || isRoundUntouched(state))
  const runningAfter = (roundIndex: number, playerId: string) =>
    rounds.slice(0, roundIndex + 1).reduce((sum, round) => sum + round.scores[playerId], 0)

  return (
    <div className="stack">
      <Standings players={players} totals={banked} target={state.targetScore} />

      <section className="panel" aria-labelledby="history-title">
        <div className="panel__header">
          <h2 id="history-title">Round by round</h2>
          <span className="panel__meta">★ Flip 7</span>
        </div>
        {rounds.length === 0 ? (
          <p className="muted">No rounds scored yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="history">
              <thead>
                <tr>
                  <th scope="col">Round</th>
                  {players.map((player) => (
                    <th key={player.id} scope="col">
                      {player.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rounds.map((round, index) => (
                  <tr key={index}>
                    <th scope="row">{index + 1}</th>
                    {players.map((player) => {
                      const hand = round.hands[player.id]
                      const busted = hand.status === 'busted'
                      return (
                        <td key={player.id} className={cx(busted && 'is-bust')}>
                          <span className="history__score">
                            {busted ? 'Bust' : round.scores[player.id]}
                            {isFlip7(hand) && <span title="Flip 7 bonus"> ★</span>}
                          </span>
                          <span className="history__running">{runningAfter(index, player.id)}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  {players.map((player) => (
                    <td key={player.id}>{banked[player.id]}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="game-title">
        <div className="panel__header">
          <h2 id="game-title">Game</h2>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="btn"
            disabled={!canReopen}
            title={canReopen ? undefined : 'Clear or score the current round first'}
            onClick={() => dispatch({ type: 'reopenRound' })}
          >
            Edit last round
          </button>
          <ConfirmButton onConfirm={() => onNewGame('rematch')}>Restart with same players</ConfirmButton>
          <ConfirmButton onConfirm={() => onNewGame('setup')}>Change players</ConfirmButton>
        </div>
      </section>
    </div>
  )
}
