import type { CSSProperties } from 'react'

interface KnobProps {
  label: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (value: number) => void
}

export function Knob({ label, value, min, max, suffix, onChange }: KnobProps) {
  const progress = (value - min) / (max - min)
  const rotation = -132 + progress * 264
  const style = { '--knob-angle': `${rotation}deg` } as CSSProperties

  return (
    <label className="knob-control">
      <span className="knob-label">{label}</span>
      <span className="knob" style={style}>
        <span className="knob-indicator" />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </span>
      <output>{value}{suffix}</output>
    </label>
  )
}
