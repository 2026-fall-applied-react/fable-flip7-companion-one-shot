import { useRef, useState, type Dispatch } from 'react'
import { MAX_NAME_LENGTH, MAX_PLAYERS, MAX_TARGET, MIN_PLAYERS, cleanName } from '../game/state'
import type { GameAction, GameState } from '../game/types'
import { newId } from './cardInfo'
import { Rules } from './Rules'

interface SetupProps {
  state: GameState
  dispatch: Dispatch<GameAction>
}

export function Setup({ state, dispatch }: SetupProps) {
  const { players } = state
  const [name, setName] = useState('')
  const [target, setTarget] = useState(String(state.targetScore))
  const nameInput = useRef<HTMLInputElement>(null)

  const tableFull = players.length >= MAX_PLAYERS
  const canAdd = cleanName(name) !== '' && !tableFull
  const targetValue = Number(target)
  const targetValid =
    target.trim() !== '' && Number.isInteger(targetValue) && targetValue >= 1 && targetValue <= MAX_TARGET
  const missing = MIN_PLAYERS - players.length

  return (
    <main className="stack setup">
      <section className="panel" aria-labelledby="players-title">
        <div className="panel__header">
          <h2 id="players-title">Who's playing?</h2>
          <span className="panel__meta">
            {players.length} / {MAX_PLAYERS}
          </span>
        </div>
        <p className="muted">Add players in seating order. The first player deals round one.</p>

        {players.length > 0 && (
          <ol className="roster">
            {players.map((player, index) => (
              <li key={player.id} className="roster__row">
                <span className="roster__seat">{index + 1}</span>
                <input
                  className="input roster__name"
                  aria-label={`Name of player ${index + 1}`}
                  defaultValue={player.name}
                  maxLength={MAX_NAME_LENGTH}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                  onBlur={(event) => {
                    const cleaned = cleanName(event.target.value) || player.name
                    event.target.value = cleaned
                    if (cleaned !== player.name) {
                      dispatch({ type: 'renamePlayer', id: player.id, name: cleaned })
                    }
                  }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Move ${player.name} up`}
                  disabled={index === 0}
                  onClick={() => dispatch({ type: 'movePlayer', id: player.id, direction: -1 })}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Move ${player.name} down`}
                  disabled={index === players.length - 1}
                  onClick={() => dispatch({ type: 'movePlayer', id: player.id, direction: 1 })}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  aria-label={`Remove ${player.name}`}
                  onClick={() => dispatch({ type: 'removePlayer', id: player.id })}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}

        <form
          className="add-player"
          onSubmit={(event) => {
            event.preventDefault()
            if (!canAdd) return
            dispatch({ type: 'addPlayer', id: newId(), name })
            setName('')
            nameInput.current?.focus()
          }}
        >
          <input
            ref={nameInput}
            className="input"
            aria-label="New player name"
            placeholder={tableFull ? 'The table is full' : 'Player name'}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            disabled={tableFull}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn" disabled={!canAdd}>
            Add
          </button>
        </form>
      </section>

      <section className="panel" aria-labelledby="target-title">
        <div className="panel__header">
          <h2 id="target-title">Play to</h2>
        </div>
        <div className="target">
          <input
            className="input target__input"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_TARGET}
            step={1}
            aria-label="Target score"
            aria-invalid={!targetValid}
            value={target}
            onChange={(event) => {
              setTarget(event.target.value)
              dispatch({ type: 'setTarget', target: Number(event.target.value) })
            }}
          />
          <span className="muted">points. The standard game is 200.</span>
        </div>
        {!targetValid && <p className="error">Enter a whole number between 1 and {MAX_TARGET}.</p>}
      </section>

      <button
        type="button"
        className="btn btn--primary btn--large"
        disabled={missing > 0 || !targetValid}
        onClick={() => dispatch({ type: 'startGame' })}
      >
        {missing > 0 ? `Add ${missing} more ${missing === 1 ? 'player' : 'players'}` : 'Start game'}
      </button>

      <details className="panel details">
        <summary>How to play Flip 7</summary>
        <Rules />
      </details>
    </main>
  )
}
