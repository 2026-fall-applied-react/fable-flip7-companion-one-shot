import { useEffect, useState, type ReactNode } from 'react'
import { cx } from './cardInfo'

interface ConfirmButtonProps {
  className?: string
  confirmLabel?: string
  disabled?: boolean
  onConfirm: () => void
  children: ReactNode
}

/** A button that needs a second tap, for actions that throw work away. */
export function ConfirmButton({
  className,
  confirmLabel = 'Tap again to confirm',
  disabled,
  onConfirm,
  children,
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <button
      type="button"
      className={cx('btn', className, armed && 'is-armed')}
      disabled={disabled}
      onBlur={() => setArmed(false)}
      onClick={() => {
        setArmed(!armed)
        if (armed) onConfirm()
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  )
}
