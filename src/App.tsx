import { useEffect, useReducer, useState } from 'react'
import { DeckView } from './components/DeckView'
import { GameOver } from './components/GameOver'
import { RoundView } from './components/RoundView'
import { Rules } from './components/Rules'
import { ScoresView } from './components/ScoresView'
import { Setup } from './components/Setup'
import { reducer } from './game/state'
import { loadState, saveState } from './game/storage'

const TABS = [
  { id: 'round', label: 'Round' },
  { id: 'scores', label: 'Scores' },
  { id: 'deck', label: 'Deck' },
  { id: 'rules', label: 'Rules' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [tab, setTab] = useState<TabId>('round')

  useEffect(() => {
    saveState(state)
  }, [state])

  function startNewGame(mode: 'rematch' | 'setup') {
    dispatch({ type: 'newGame', mode })
    setTab('round')
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="logo">
          <span className="logo__mark">
            FLIP <span className="logo__seven">7</span>
          </span>
          <span className="logo__sub">companion</span>
        </h1>
        {state.phase !== 'setup' && (
          <p className="app__meta">
            {state.phase === 'finished' ? 'Final score' : `Round ${state.rounds.length + 1}`} · first
            to {state.targetScore}
          </p>
        )}
      </header>

      {state.phase === 'setup' ? (
        <Setup state={state} dispatch={dispatch} />
      ) : (
        <>
          <nav className="tabs" aria-label="Sections">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className="tabs__tab"
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setTab(id)}
              >
                {id === 'round' && state.phase === 'finished' ? 'Result' : label}
              </button>
            ))}
          </nav>

          <main>
            {tab === 'round' &&
              (state.phase === 'finished' ? (
                <GameOver state={state} dispatch={dispatch} onNewGame={startNewGame} />
              ) : (
                <RoundView key={state.rounds.length} state={state} dispatch={dispatch} />
              ))}
            {tab === 'scores' && (
              <ScoresView
                state={state}
                dispatch={(action) => {
                  dispatch(action)
                  if (action.type === 'reopenRound') setTab('round')
                }}
                onNewGame={startNewGame}
              />
            )}
            {tab === 'deck' && <DeckView state={state} dispatch={dispatch} />}
            {tab === 'rules' && (
              <section className="panel">
                <div className="panel__header">
                  <h2>How to play</h2>
                </div>
                <Rules />
              </section>
            )}
          </main>
        </>
      )}
    </div>
  )
}
