import { useMemo, useState } from 'react'
import { ProgressionBuilder } from './ProgressionBuilder'
import { Legend, TransitionTable, KIND_STYLES, type Selection } from './TransitionTable'
import { buildDegrees, tonicName, voiceTransition, type Mode } from './theory'
import { KINDS, TRANSITIONS } from './transitions'
import { usePiano } from './usePiano'

const MODES: { id: Mode; label: string }[] = [
  { id: 'major', label: 'Мажор' },
  { id: 'minor', label: 'Минор' },
]

const TONIC_PCS = Array.from({ length: 12 }, (_, i) => i)

const segment = (active: boolean) =>
  `cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors ${
    active ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
  }`

export default function App() {
  const [tonicPc, setTonicPc] = useState(0)
  const [mode, setMode] = useState<Mode>('major')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [interrupt, setInterrupt] = useState(0)
  const { status, progress, play, stop } = usePiano()

  const degrees = useMemo(() => buildDegrees(tonicPc, mode), [tonicPc, mode])
  const transitions = TRANSITIONS[mode]

  const playTransition = ({ from, to }: Selection, nextTonic = tonicPc, nextMode = mode) => {
    const voicing = voiceTransition(from, to, nextTonic, nextMode)
    play([
      { notes: voicing.from, at: 0, duration: 0.9 },
      { notes: voicing.to, at: 0.9, duration: 1.8 },
    ])
  }

  const selectFromBuilder = (next: Selection) => {
    setSelection(next)
    playTransition(next)
  }

  const select = (next: Selection) => {
    setInterrupt((n) => n + 1)
    selectFromBuilder(next)
  }

  // Смена тональности или лада сохраняет выбранную клетку и играет её заново.
  const changeTonic = (pc: number) => {
    setInterrupt((n) => n + 1)
    setTonicPc(pc)
    if (selection) playTransition(selection, pc, mode)
  }

  const changeMode = (next: Mode) => {
    if (next === mode) return
    setInterrupt((n) => n + 1)
    setMode(next)
    if (selection) playTransition(selection, tonicPc, next)
  }

  const current = selection
    ? {
        from: degrees[selection.from]!,
        to: degrees[selection.to]!,
        cell: transitions[selection.from]![selection.to]!,
      }
    : null

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-8 px-4 py-10 sm:py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Ступени</h1>
        <p className="max-w-xl text-sm text-zinc-500">
          Как ощущается переход от одного аккорда лада к другому. Нажмите на клетку, чтобы
          услышать его.
        </p>
      </header>

      <section aria-label="Настройки" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div role="group" aria-label="Лад" className="flex gap-1 rounded-lg bg-zinc-50 p-1">
            {MODES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => changeMode(id)}
                className={segment(mode === id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Тональность"
            className="flex flex-wrap gap-1 rounded-lg bg-zinc-50 p-1"
          >
            {TONIC_PCS.map((pc) => (
              <button
                key={pc}
                type="button"
                aria-pressed={tonicPc === pc}
                onClick={() => changeTonic(pc)}
                className={`${segment(tonicPc === pc)} min-w-10 text-center`}
              >
                {tonicName(pc, mode)}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-400" role="status">
          {status === 'loading' && `Загрузка звуков… ${Math.round(progress * 100)}%`}
          {status === 'error' && 'Не удалось загрузить звуки. Проверьте подключение к интернету.'}
          {status === 'ready' &&
            `Тональность: ${degrees[0]!.root} ${mode === 'major' ? 'мажор' : 'минор'}${
              mode === 'minor' ? ' (натуральный)' : ''
            }`}
        </p>
      </section>

      <TransitionTable
        degrees={degrees}
        transitions={transitions}
        selection={selection}
        onSelect={select}
      />

      <section
        aria-live="polite"
        aria-label="Описание перехода"
        className="min-h-32 rounded-xl border border-zinc-100 px-5 py-4"
      >
        {current ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-lg font-medium">
                {current.from.roman} → {current.to.roman}
              </span>
              <span className="text-sm text-zinc-400">
                {current.from.chord} → {current.to.chord}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span
                  aria-hidden
                  className={`size-2 rounded-full ${KIND_STYLES[current.cell.kind].dot}`}
                />
                {KINDS[current.cell.kind].name}
              </span>
            </div>
            <p className="text-base font-medium text-zinc-800">{current.cell.label}</p>
            <p className="max-w-xl text-sm leading-relaxed text-zinc-500">{current.cell.text}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Выберите клетку таблицы, чтобы увидеть описание.</p>
        )}
      </section>

      <ProgressionBuilder
        degrees={degrees}
        transitions={transitions}
        tonicPc={tonicPc}
        mode={mode}
        play={play}
        stop={stop}
        onSelectTransition={selectFromBuilder}
        interrupt={interrupt}
      />

      <footer className="mt-auto flex flex-col gap-3 pt-2">
        <Legend />
        <p className="text-xs text-zinc-400">
          Минор — натуральный, поэтому доминанта v звучит мягко. Ощущения субъективны и зависят от
          контекста.
        </p>
      </footer>
    </main>
  )
}
