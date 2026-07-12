import { useEffect, useRef } from 'react'
import type { AudioEngine } from '../lib/audio'

interface WaveformProps {
  engine: AudioEngine
  isPlaying: boolean
  currentStep: number
}

export function Waveform({ engine, isPlaying, currentStep }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playbackRef = useRef({ isPlaying, currentStep })

  useEffect(() => {
    playbackRef.current = { isPlaying, currentStep }
  }, [currentStep, isPlaying])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let frame = 0
    let animationFrame = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(rect.width * ratio))
      canvas.height = Math.max(1, Math.round(rect.height * ratio))
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const center = height / 2
      context.clearRect(0, 0, width, height)

      const values = engine.getWaveform()
      const hasSignal = values.some((value) => Math.abs(value) > 0.002)
      const playback = playbackRef.current
      const accent = playback.currentStep % 4 === 0 ? 1 : 0.68

      const line = (blur: number, alpha: number, lineWidth: number) => {
        context.save()
        context.beginPath()
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.lineWidth = lineWidth
        context.shadowBlur = blur
        context.shadowColor = '#965cff'
        const gradient = context.createLinearGradient(0, 0, width, 0)
        gradient.addColorStop(0, `rgba(63, 225, 255, ${alpha})`)
        gradient.addColorStop(0.48, `rgba(205, 116, 255, ${alpha})`)
        gradient.addColorStop(0.7, `rgba(255, 121, 196, ${alpha})`)
        gradient.addColorStop(1, `rgba(141, 255, 190, ${alpha})`)
        context.strokeStyle = gradient

        for (let x = 0; x <= width; x += 2) {
          const index = Math.min(values.length - 1, Math.floor((x / width) * values.length))
          const live = hasSignal ? values[index] : 0
          const distance = Math.abs(x / width - 0.5)
          const envelope = Math.pow(Math.max(0, 1 - distance * 2.15), 2.2)
          const idle = Math.sin(x * 0.075 + frame * 0.07) * envelope * (playback.isPlaying ? 11 * accent : 2.2)
          const y = center + (hasSignal ? live * height * 0.43 : idle)
          if (x === 0) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.stroke()
        context.restore()
      }

      line(24, 0.22, 6)
      line(10, 0.46, 3)
      line(0, 0.94, 1.35)
      frame += 1
      animationFrame = requestAnimationFrame(draw)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    animationFrame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
    }
  }, [engine])

  return <canvas ref={canvasRef} className="waveform" aria-label="Reactive audio waveform" />
}
