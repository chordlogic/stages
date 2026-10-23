import { useCallback, useEffect, useRef, useState } from 'react'
import { SplendidGrandPiano } from 'smplr'

export type AudioStatus = 'loading' | 'ready' | 'error'

type Piano = ReturnType<typeof SplendidGrandPiano>

interface Engine {
  context: AudioContext
  piano: Piano
}

let engine: Engine | null = null
const progressListeners = new Set<(ratio: number) => void>()

/** Ноты, которые реально понадобятся: диапазон баса и аккордов. Остальные подтянутся ближайшими. */
const NOTES_TO_LOAD = Array.from({ length: 24 }, (_, i) => 36 + i * 2)

function getEngine(): Engine {
  if (!engine) {
    const context = new AudioContext()
    const piano = SplendidGrandPiano(context, {
      volume: 100,
      decayTime: 0.6,
      notesToLoad: { notes: NOTES_TO_LOAD, fallback: 'nearest' },
      onLoadProgress: ({ loaded, total }) => {
        progressListeners.forEach((listener) => listener(total ? loaded / total : 0))
      },
    })
    engine = { context, piano }
  }
  return engine
}

export interface ChordStep {
  notes: number[]
  /** Начало относительно старта, сек */
  at: number
  /** Длительность, сек */
  duration: number
}

export function usePiano() {
  const [status, setStatus] = useState<AudioStatus>('loading')
  const [progress, setProgress] = useState(0)
  const playId = useRef(0)

  useEffect(() => {
    let cancelled = false
    const listener = (ratio: number) => {
      if (!cancelled) setProgress(ratio)
    }
    progressListeners.add(listener)

    getEngine()
      .piano.ready.then(() => !cancelled && setStatus('ready'))
      .catch(() => !cancelled && setStatus('error'))

    return () => {
      cancelled = true
      progressListeners.delete(listener)
    }
  }, [])

  /** `onScheduled` вызывается в момент, когда звук реально поставлен в очередь (после загрузки). */
  const play = useCallback((steps: ChordStep[], onScheduled?: () => void) => {
    const { context, piano } = getEngine()
    const id = ++playId.current

    // resume вызываем синхронно, пока жив пользовательский жест
    const resumed = context.state === 'running' ? Promise.resolve() : context.resume()

    Promise.all([resumed, piano.ready])
      .then(() => {
        // пришёл более новый клик, пока ждали загрузку — старый не играем
        if (id !== playId.current) return
        piano.stop()
        const now = context.currentTime + 0.03
        for (const step of steps) {
          step.notes.forEach((note, i) => {
            piano.start({
              note,
              velocity: i === 0 ? 62 : 78,
              time: now + step.at + i * 0.012,
              duration: step.duration,
            })
          })
        }
        onScheduled?.()
      })
      .catch(() => setStatus('error'))
  }, [])

  const stop = useCallback(() => {
    playId.current++
    engine?.piano.stop()
  }, [])

  return { status, progress, play, stop }
}
