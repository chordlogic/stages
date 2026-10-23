import { useCallback, useEffect, useRef, useState } from 'react'
import { KIND_STYLES, type Selection } from './TransitionTable'
import { TENSION, voiceProgression, type Degree, type Mode } from './theory'
import { KINDS, type Transition } from './transitions'
import type { ChordStep } from './usePiano'

const MAX_LENGTH = 16
const CHORD_SECONDS = 1.1
const TAIL_SECONDS = 0.9

const PRESETS: Record<Mode, number[][]> = {
  major: [
    [0, 4, 5, 3],
    [5, 3, 0, 4],
    [1, 4, 0],
    [0, 5, 3, 4],
  ],
  minor: [
    [0, 5, 2, 6],
    [0, 3, 4, 0],
    [1, 4, 0],
    [0, 6, 5, 6],
  ],
}

interface Props {
  degrees: Degree[]
  transitions: Transition[][]
  tonicPc: number
  mode: Mode
  sequence: number[]
  onChangeSequence: (seq: number[]) => void
  loop: boolean
  onChangeLoop: (loop: boolean) => void
  play: (steps: ChordStep[], onScheduled?: () => void) => void
  stop: () => void
  onSelectTransition: (selection: Selection) => void
  /** Растёт, когда звук запущен снаружи (таблица, смена тональности): воспроизведение конструктора прекращается. */
  interrupt: number
}

const iconButton =
  'cursor-pointer rounded-md px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

export function ProgressionBuilder({
  degrees,
  transitions,
  tonicPc,
  mode,
  sequence,
  onChangeSequence,
  loop,
  onChangeLoop,
  play,
  stop,
  onSelectTransition,
  interrupt,
}: Props) {
  const [playing, setPlaying] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const timers = useRef<number[]>([])
  const loopRef = useRef(loop)
  loopRef.current = loop

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }, [])

  const halt = useCallback(() => {
    clearTimers()
    stop()
    setPlaying(false)
    setActiveIndex(null)
  }, [clearTimers, stop])

  // Внешний звук уже заглушил наш (piano.stop), поэтому только сбрасываем индикацию.
  useEffect(() => {
    if (interrupt === 0) return
    clearTimers()
    setPlaying(false)
    setActiveIndex(null)
  }, [interrupt, clearTimers])

  // Остановка при уходе со страницы.
  useEffect(() => clearTimers, [clearTimers])

  const run = useCallback(
    (items: number[]) => {
      if (items.length === 0) return
      clearTimers()
      setPlaying(true)
      const voicings = voiceProgression(items, tonicPc, mode)
      const steps: ChordStep[] = voicings.map((notes, i) => ({
        notes,
        at: i * CHORD_SECONDS,
        duration: CHORD_SECONDS,
      }))
      play(steps, () => {
        clearTimers()
        items.forEach((_, i) => {
          timers.current.push(window.setTimeout(() => setActiveIndex(i), i * CHORD_SECONDS * 1000))
        })
        timers.current.push(
          window.setTimeout(
            () => {
              if (loopRef.current) {
                run(items)
              } else {
                setPlaying(false)
                setActiveIndex(null)
              }
            },
            (items.length * CHORD_SECONDS + TAIL_SECONDS) * 1000,
          ),
        )
      })
    },
    [clearTimers, mode, play, tonicPc],
  )

  const edit = (next: number[]) => {
    halt()
    onChangeSequence(next)
  }

  const add = (degree: number) => {
    if (sequence.length >= MAX_LENGTH) return
    const next = [...sequence, degree]
    edit(next)
    // Короткий отклик: сразу слышно, что добавили.
    const [notes] = voiceProgression([degree], tonicPc, mode)
    play([{ notes: notes!, at: 0, duration: 1.2 }])
  }

  const remove = (position: number) => edit(sequence.filter((_, i) => i !== position))

  const move = (position: number, delta: -1 | 1) => {
    const target = position + delta
    if (target < 0 || target >= sequence.length) return
    const next = [...sequence]
    ;[next[position], next[target]] = [next[target]!, next[position]!]
    edit(next)
  }

  const label = (items: number[]) => items.map((k) => degrees[k]!.roman).join(' – ')

  // Описание: переход, ведущий в проигрываемый аккорд.
  const active = activeIndex !== null ? activeIndex : null
  const arrival =
    active !== null && active > 0
      ? {
          from: degrees[sequence[active - 1]!]!,
          to: degrees[sequence[active]!]!,
          cell: transitions[sequence[active - 1]!]![sequence[active]!]!,
        }
      : null

  const tension = TENSION[mode]
  const count = sequence.length

  return (
    <section
      aria-labelledby="builder-title"
      className="flex flex-col gap-5 border-t border-zinc-200/80 pt-8 dark:border-zinc-800"
    >
      <div className="flex flex-col gap-1">
        <h2 id="builder-title" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Конструктор
        </h2>
        <p className="max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          Соберите последовательность ступеней, прослушайте её и посмотрите, как между ними
          меняется ощущение.
        </p>
      </div>

      <div role="group" aria-label="Добавить ступень" className="flex flex-wrap gap-2">
        {degrees.map((degree) => (
          <button
            key={degree.index}
            type="button"
            disabled={count >= MAX_LENGTH}
            onClick={() => add(degree.index)}
            className="flex min-w-14 cursor-pointer flex-col items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 leading-tight text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
          >
            <span className="text-sm font-medium">{degree.roman}</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{degree.chord}</span>
          </button>
        ))}
      </div>

      <div className="flex min-h-24 flex-col justify-center rounded-xl border border-zinc-200/60 bg-zinc-50 px-4 py-4 dark:border-zinc-800/60 dark:bg-zinc-900/40">
        {count === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Пока пусто: добавьте ступени кнопками выше или возьмите готовый вариант.
          </p>
        ) : (
          <ol className="flex flex-wrap items-center gap-y-3" aria-label="Последовательность">
            {sequence.map((k, position) => {
              const degree = degrees[k]!
              const cell = position > 0 ? transitions[sequence[position - 1]!]![k]! : null
              const isActive = active === position
              return (
                <li key={`${position}-${k}`} className="flex items-center">
                  {cell && (
                    <button
                      type="button"
                      onClick={() => {
                        halt()
                        setActiveIndex(position)
                        onSelectTransition({ from: sequence[position - 1]!, to: k })
                      }}
                      aria-label={`Переход из ${degrees[sequence[position - 1]!]!.roman} в ${degree.roman}: ${cell.label}. Прослушать`}
                      className={`mx-1.5 flex max-w-28 cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs leading-tight transition-all ${
                        KIND_STYLES[cell.kind].cell
                      } ${isActive ? 'ring-2 ring-zinc-900 dark:ring-zinc-100' : ''}`}
                    >
                      <span aria-hidden>→</span>
                      <span>{cell.label}</span>
                    </button>
                  )}
                  <span
                    className={`group flex items-center rounded-lg border bg-white pl-3 transition-all dark:bg-zinc-900 ${
                      isActive
                        ? 'scale-105 border-zinc-900 shadow-sm ring-1 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100'
                        : 'border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span className="flex flex-col items-center py-1 leading-tight">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {degree.roman}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">{degree.chord}</span>
                    </span>
                    <span className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => move(position, -1)}
                        disabled={position === 0}
                        aria-label={`Сдвинуть ${degree.roman} влево`}
                        className="cursor-pointer px-1.5 text-[10px] leading-none text-zinc-400 hover:text-zinc-900 disabled:invisible dark:text-zinc-500 dark:hover:text-zinc-200"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => move(position, 1)}
                        disabled={position === count - 1}
                        aria-label={`Сдвинуть ${degree.roman} вправо`}
                        className="cursor-pointer px-1.5 text-[10px] leading-none text-zinc-400 hover:text-zinc-900 disabled:invisible dark:text-zinc-500 dark:hover:text-zinc-200"
                      >
                        ▶
                      </button>
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(position)}
                      aria-label={`Удалить ${degree.roman} (позиция ${position + 1})`}
                      className="cursor-pointer self-stretch rounded-r-lg px-2 text-zinc-300 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                      ×
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <button
          type="button"
          disabled={count === 0}
          onClick={() => (playing ? halt() : run(sequence))}
          className="min-w-32 cursor-pointer rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
        >
          {playing ? '■ Стоп' : '▶ Слушать'}
        </button>
        <label className="flex cursor-pointer items-center gap-2 px-2 text-sm text-zinc-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={loop}
            onChange={(event) => onChangeLoop(event.target.checked)}
            className="size-4 cursor-pointer accent-zinc-900 dark:accent-zinc-100"
          />
          Повтор
        </label>
        <button
          type="button"
          className={iconButton}
          disabled={count === 0}
          onClick={() => edit(sequence.slice(0, -1))}
        >
          Убрать последнюю
        </button>
        <button
          type="button"
          className={iconButton}
          disabled={count === 0}
          onClick={() => edit([])}
        >
          Очистить
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
        <span>Примеры:</span>
        {PRESETS[mode].map((preset) => (
          <button
            key={preset.join()}
            type="button"
            onClick={() => edit(preset)}
            className="cursor-pointer rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {label(preset)}
          </button>
        ))}
      </div>

      {count > 1 && (
        <figure className="flex flex-col gap-3">
          <figcaption className="text-sm text-zinc-500 dark:text-zinc-400">
            Движение ощущений
          </figcaption>
          <Curve
            items={sequence}
            transitions={transitions}
            degrees={degrees}
            tension={tension}
            active={active}
          />
          <div aria-live="polite" className="min-h-16 text-sm">
            {arrival ? (
              <div className="flex flex-col gap-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {arrival.from.roman} → {arrival.to.roman}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">
                    {KINDS[arrival.cell.kind].name}
                  </span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {arrival.cell.label}
                  </span>
                </p>
                <p className="max-w-xl leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {arrival.cell.text}
                </p>
              </div>
            ) : (
              <p className="text-zinc-400 dark:text-zinc-500">
                {playing
                  ? 'Начало: исходная точка.'
                  : 'Линия показывает условную напряжённость каждой ступени. Нажмите «Слушать» — описание будет меняться вместе со звуком.'}
              </p>
            )}
          </div>
        </figure>
      )}
    </section>
  )
}

interface CurveProps {
  items: number[]
  transitions: Transition[][]
  degrees: Degree[]
  tension: readonly number[]
  active: number | null
}

/** Линия условной напряжённости по ходу последовательности; цвет точки — характер прихода в неё. */
function Curve({ items, transitions, degrees, tension, active }: CurveProps) {
  const n = items.length
  const x = (i: number) => ((i + 0.5) / n) * 100
  const y = (k: number) => 100 - (10 + (tension[k]! / 4) * 80)
  const points = items.map((k, i) => `${x(i)},${y(k)}`).join(' ')

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-stretch gap-3">
        <div aria-hidden className="flex flex-col justify-between py-1 text-[10px] text-zinc-300 dark:text-zinc-600">
          <span>напряжение</span>
          <span>покой</span>
        </div>
        <div className="relative h-28 flex-1 rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900/30">
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              className="text-zinc-300 dark:text-zinc-700"
              strokeWidth="1.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {items.map((k, i) => {
            const kind = i > 0 ? transitions[items[i - 1]!]![k]!.kind : 'stay'
            const isActive = active === i
            return (
              <span
                key={`${i}-${k}`}
                aria-hidden
                style={{ left: `${x(i)}%`, top: `${y(k)}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-all dark:border-zinc-900 ${
                  KIND_STYLES[kind].dot
                } ${isActive ? 'size-5 ring-2 ring-zinc-900 dark:ring-zinc-100' : 'size-3.5'}`}
              />
            )
          })}
        </div>
      </div>
      <div className="flex gap-3">
        <div aria-hidden className="invisible text-[10px]">
          <span>напряжение</span>
        </div>
        <div className="flex flex-1">
          {items.map((k, i) => (
            <span
              key={`${i}-${k}`}
              className={`flex-1 text-center text-xs transition-colors ${
                active === i
                  ? 'font-medium text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              {degrees[k]!.roman}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
