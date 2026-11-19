import type { CSSProperties } from 'react'
import { NUMBER_VALUES, bustRisk, type BustRisk, type DeckEstimate } from '../game/deck'
import {
  FLIP_7_BONUS,
  FLIP_7_SIZE,
  describeScore,
  hasSecondChance,
  isEmptyHand,
  isFlip7,
  scoreHand,
} from '../game/scoring'
import {
  ACTION_IDS,
  MODIFIER_IDS,
  type CardRef,
  type GameAction,
  type Hand,
  type Player,
} from '../game/types'
import { ActionCard, ModifierCard, NumberCard } from './Card'
import { ACTION_INFO, NUMBER_COLORS, cx, modifierLabel } from './cardInfo'

interface PlayerHandProps {
  player: Player
  hand: Hand
  banked: number
  deck: DeckEstimate
  isDealer: boolean
  open: boolean
  onToggle: () => void
  /** `advance` marks actions that end the player's turn. */
  onAction: (action: GameAction, advance?: boolean) => void
}

function statusLabel(hand: Hand): string | null {
  if (isFlip7(hand)) return 'Flip 7!'
  if (hand.status === 'busted') return 'Bust'
  if (hand.status === 'stayed') return hand.actions.includes('freeze') ? 'Frozen' : 'Stayed'
  return null
}

function resolvedMessage(hand: Hand, score: number): string {
  if (isFlip7(hand)) return `Flip 7! Banks ${score} points, including the +${FLIP_7_BONUS} bonus.`
  if (hand.status === 'busted') {
    return hand.bustCard === null
      ? 'Busted — no points this round.'
      : `Busted on a second ${hand.bustCard} — no points this round.`
  }
  return `${hand.actions.includes('freeze') ? 'Frozen' : 'Stayed'} — banks ${score} points.`
}

function RiskMeter({ hand, risk }: { hand: Hand; risk: BustRisk }) {
  if (hand.numbers.length === 0) {
    return <p className="risk risk--note">No number cards yet, so the next card can't bust.</p>
  }
  if (risk.protected) {
    return <p className="risk risk--note">♥ Second Chance will cancel the next duplicate.</p>
  }
  if (risk.deckSize === 0) {
    return <p className="risk risk--note">The tracked deck is empty — mark a reshuffle on the Deck tab.</p>
  }
  const percent = Math.round(risk.chance * 100)
  const level = percent < 20 ? 'low' : percent < 35 ? 'medium' : 'high'
  return (
    <div className={`risk risk--${level}`}>
      <div className="risk__label">
        <span>Bust risk on the next card</span>
        <strong>{percent}%</strong>
      </div>
      <div
        className="risk__bar"
        role="meter"
        aria-label="Bust risk"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="risk__detail">
        {risk.bustCards} of the {risk.deckSize} cards left would bust
      </p>
    </div>
  )
}

export function PlayerHand({
  player,
  hand,
  banked,
  deck,
  isDealer,
  open,
  onToggle,
  onAction,
}: PlayerHandProps) {
  const playerId = player.id
  const panelId = `hand-${playerId}`
  const score = scoreHand(hand)
  const status = statusLabel(hand)
  const shielded = hasSecondChance(hand)
  const full = hand.numbers.length >= FLIP_7_SIZE
  const sortedNumbers = [...hand.numbers].sort((a, b) => a - b)
  const hasCards =
    hand.numbers.length + hand.modifiers.length + hand.actions.length + hand.discards.length > 0 ||
    hand.bustCard !== null

  const remove = (card: CardRef) =>
    open ? () => onAction({ type: 'removeCard', playerId, card }) : undefined

  // Second Chances are spent oldest first, one per cancelled duplicate.
  const isSpent = (index: number) =>
    hand.actions[index] === 'secondChance' &&
    hand.actions.slice(0, index).filter((id) => id === 'secondChance').length < hand.discards.length

  return (
    <section
      className={cx(
        'hand',
        `hand--${hand.status}`,
        isFlip7(hand) && 'hand--flip7',
        open && 'is-open',
      )}
    >
      <h3 className="hand__heading">
        <button
          type="button"
          className="hand__header"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={onToggle}
        >
          <span className="hand__identity">
            <span className="hand__name">{player.name}</span>
            {isDealer && <span className="badge badge--dealer">Dealer</span>}
            {status && <span className={`badge badge--${hand.status}`}>{status}</span>}
          </span>
          <span className="hand__points">
            <span className="hand__score">{hand.status === 'busted' ? '0' : `+${score}`}</span>
            <span className="hand__banked">{banked} banked</span>
          </span>
        </button>
      </h3>

      {hasCards && (
        <div className="hand__cards">
          {sortedNumbers.map((value) => (
            <NumberCard key={`n${value}`} value={value} onClick={remove({ kind: 'number', value })} />
          ))}
          {MODIFIER_IDS.filter((id) => hand.modifiers.includes(id)).map((id) => (
            <ModifierCard key={id} id={id} onClick={remove({ kind: 'modifier', id })} />
          ))}
          {hand.actions.map((id, index) => (
            <ActionCard
              key={`a${index}`}
              id={id}
              variant={isSpent(index) ? 'spent' : 'normal'}
              onClick={remove({ kind: 'action', id })}
            />
          ))}
          {hand.discards.map((value, index) => (
            <NumberCard
              key={`d${index}`}
              value={value}
              variant="spent"
              onClick={remove({ kind: 'discard', index })}
            />
          ))}
          {hand.bustCard !== null && <NumberCard value={hand.bustCard} variant="bust" />}
        </div>
      )}

      {open && (
        <div id={panelId} className="hand__body">
          {hand.status === 'playing' ? (
            <>
              <RiskMeter hand={hand} risk={bustRisk(hand, deck)} />

              <div className="keypad" role="group" aria-label={`Deal a card to ${player.name}`}>
                <div className="keypad__numbers">
                  {NUMBER_VALUES.map((value) => {
                    const held = hand.numbers.includes(value)
                    const left = deck.remaining.numbers[value]
                    const note = held ? (shielded ? 'saved' : 'bust') : `${left} left`
                    return (
                      <button
                        key={value}
                        type="button"
                        className={cx('key', 'key--number', held && 'is-held', !held && left === 0 && 'is-out')}
                        style={{ '--card': NUMBER_COLORS[value] } as CSSProperties}
                        disabled={full && !held}
                        aria-label={
                          held
                            ? `Deal another ${value}: ${shielded ? 'uses Second Chance' : 'busts'}`
                            : `Deal ${value}, ${left} left in the deck`
                        }
                        onClick={() => onAction({ type: 'dealNumber', playerId, value }, true)}
                      >
                        <span className="key__value">{value}</span>
                        <span className="key__note">{note}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="keypad__row">
                  {MODIFIER_IDS.map((modifier) => (
                    <button
                      key={modifier}
                      type="button"
                      className={cx(
                        'key',
                        'key--modifier',
                        deck.remaining.modifiers[modifier] === 0 && 'is-out',
                      )}
                      disabled={hand.modifiers.includes(modifier)}
                      aria-label={`Deal ${modifierLabel(modifier)} modifier`}
                      onClick={() => onAction({ type: 'dealModifier', playerId, modifier }, true)}
                    >
                      {modifierLabel(modifier)}
                    </button>
                  ))}
                </div>

                <div className="keypad__row keypad__row--actions">
                  {ACTION_IDS.map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={cx(
                        'key',
                        `key--${action}`,
                        deck.remaining.actions[action] === 0 && 'is-out',
                      )}
                      disabled={action === 'secondChance' && shielded}
                      title={ACTION_INFO[action].hint}
                      onClick={() =>
                        onAction({ type: 'dealAction', playerId, action }, action !== 'flipThree')
                      }
                    >
                      <span aria-hidden="true">{ACTION_INFO[action].icon}</span> {ACTION_INFO[action].name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hand__controls">
                <button
                  type="button"
                  className="btn btn--stay"
                  onClick={() => onAction({ type: 'setStatus', playerId, status: 'stayed' }, true)}
                >
                  Stay · bank {score}
                </button>
                <button
                  type="button"
                  className="btn btn--bust"
                  onClick={() => onAction({ type: 'setStatus', playerId, status: 'busted' }, true)}
                >
                  Bust
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={isEmptyHand(hand)}
                  onClick={() => onAction({ type: 'clearHand', playerId })}
                >
                  Clear
                </button>
              </div>
            </>
          ) : (
            <div className="hand__resolved">
              <p>{resolvedMessage(hand, score)}</p>
              <button
                type="button"
                className="btn"
                onClick={() => onAction({ type: 'setStatus', playerId, status: 'playing' })}
              >
                Put back in play
              </button>
            </div>
          )}

          <p className="hand__math">
            {describeScore(hand)}
            {hasCards && <span className="hand__tip"> · Tap a card above to remove it</span>}
          </p>
        </div>
      )}
    </section>
  )
}
