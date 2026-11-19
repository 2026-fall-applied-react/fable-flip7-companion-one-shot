import type { Player } from '../game/types'

interface StandingsProps {
  players: Player[]
  totals: Record<string, number>
  target: number
  /** Unbanked points from the round in progress. */
  pending?: Record<string, number>
}

export function Standings({ players, totals, target, pending }: StandingsProps) {
  const ranked = [...players].sort((a, b) => totals[b.id] - totals[a.id])
  const percent = (points: number) => `${Math.min(100, Math.max(0, (points / target) * 100))}%`

  return (
    <section className="panel standings" aria-labelledby="standings-title">
      <div className="panel__header">
        <h2 id="standings-title">Standings</h2>
        <span className="panel__meta">First to {target}</span>
      </div>
      <ol className="standings__list">
        {ranked.map((player) => {
          const total = totals[player.id]
          const extra = pending?.[player.id] ?? 0
          const rank = 1 + ranked.filter((other) => totals[other.id] > total).length
          return (
            <li key={player.id} className="standings__row">
              <span className="standings__rank">{rank}</span>
              <span className="standings__name">{player.name}</span>
              <span className="standings__total">
                {total}
                {extra > 0 && <span className="standings__pending"> +{extra}</span>}
              </span>
              <span className="standings__bar" aria-hidden="true">
                <span className="standings__fill standings__fill--pending" style={{ width: percent(total + extra) }} />
                <span className="standings__fill" style={{ width: percent(total) }} />
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
