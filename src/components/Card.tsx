import type { CSSProperties, ReactNode } from 'react'
import type { ActionId, ModifierId } from '../game/types'
import { ACTION_INFO, NUMBER_COLORS, cx, modifierLabel } from './cardInfo'

interface FaceProps {
  className: string
  label: string
  color?: string
  /** Renders the card as a button, e.g. to remove it from a hand. */
  onClick?: () => void
  children: ReactNode
}

function Face({ className, label, color, onClick, children }: FaceProps) {
  const style = color ? ({ '--card': color } as CSSProperties) : undefined
  if (onClick) {
    return (
      <button
        type="button"
        className={cx('card', 'card--button', className)}
        style={style}
        aria-label={`Remove ${label}`}
        title={`Remove ${label}`}
        onClick={onClick}
      >
        {children}
      </button>
    )
  }
  return (
    <span className={cx('card', className)} style={style} role="img" aria-label={label} title={label}>
      {children}
    </span>
  )
}

interface CardProps {
  onClick?: () => void
  /** Greyed out and crossed through: spent, discarded or the card that caused a bust. */
  variant?: 'normal' | 'spent' | 'bust'
}

export function NumberCard({ value, onClick, variant = 'normal' }: CardProps & { value: number }) {
  const label =
    variant === 'bust'
      ? `duplicate ${value} (bust)`
      : variant === 'spent'
        ? `duplicate ${value} (cancelled by Second Chance)`
        : `${value}`
  return (
    <Face
      className={cx('card--number', variant !== 'normal' && `card--${variant}`)}
      color={NUMBER_COLORS[value]}
      label={label}
      onClick={onClick}
    >
      {value}
    </Face>
  )
}

export function ModifierCard({ id, onClick }: CardProps & { id: ModifierId }) {
  return (
    <Face className="card--modifier" label={`${modifierLabel(id)} modifier`} onClick={onClick}>
      {modifierLabel(id)}
    </Face>
  )
}

export function ActionCard({ id, onClick, variant = 'normal' }: CardProps & { id: ActionId }) {
  const info = ACTION_INFO[id]
  return (
    <Face
      className={cx(`card--${id}`, variant === 'spent' && 'card--spent')}
      label={variant === 'spent' ? `${info.name} (used)` : info.name}
      onClick={onClick}
    >
      {info.icon}
    </Face>
  )
}
