import type { ActionId, ModifierId } from '../game/types'

/** One colour per number card, indexed by value. */
export const NUMBER_COLORS = [
  '#5b6b82',
  '#9a7250',
  '#a8830f',
  '#d94f25',
  '#0f8a80',
  '#2f8a4f',
  '#7d4cc4',
  '#cf1f3a',
  '#5d8f0c',
  '#c96a0a',
  '#cf3a72',
  '#2f74b8',
  '#4a4e69',
]

export const ACTION_INFO: Record<ActionId, { name: string; icon: string; hint: string }> = {
  freeze: { name: 'Freeze', icon: '❄', hint: 'Banks their points and ends their round' },
  flipThree: { name: 'Flip Three', icon: '3×', hint: 'Must take the next three cards' },
  secondChance: { name: 'Second Chance', icon: '♥', hint: 'Cancels their next duplicate' },
}

export function modifierLabel(id: ModifierId): string {
  return id === 'x2' ? '×2' : id
}

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10)
}
