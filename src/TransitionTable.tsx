import type { KeyboardEvent } from 'react'
import type { Degree } from './theory'
import { KINDS, type Kind, type Transition } from './transitions'

export const KIND_STYLES: Record<Kind, { cell: string; dot: string }> = {
  home: { cell: 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100', dot: 'bg-emerald-300' },
  lift: { cell: 'bg-amber-50 text-amber-900 hover:bg-amber-100', dot: 'bg-amber-300' },
  drift: { cell: 'bg-sky-50 text-sky-900 hover:bg-sky-100', dot: 'bg-sky-300' },
  turn: { cell: 'bg-rose-50 text-rose-900 hover:bg-rose-100', dot: 'bg-rose-300' },
  stay: { cell: 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200', dot: 'bg-zinc-300' },
}

export interface Selection {
  from: number
  to: number
}

interface Props {
  degrees: Degree[]
  transitions: Transition[][]
  selection: Selection | null
  onSelect: (selection: Selection) => void
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

function HeaderLabel({ degree, active }: { degree: Degree; active: boolean }) {
  return (
    <span className="flex flex-col items-center leading-tight">
      <span className={`text-base font-medium ${active ? 'text-zinc-900' : 'text-zinc-600'}`}>
        {degree.roman}
      </span>
      <span className="text-xs font-normal text-zinc-400">{degree.chord}</span>
    </span>
  )
}

export function TransitionTable({ degrees, transitions, selection, onSelect }: Props) {
  // Навигация по сетке стрелками: фокус переходит на соседнюю кнопку.
  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const delta = ARROWS[event.key]
    const target = event.target as HTMLElement
    if (!delta || !target.dataset.row) return
    const row = Number(target.dataset.row) + delta[0]
    const col = Number(target.dataset.col) + delta[1]
    const next = event.currentTarget.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${col}"]`,
    )
    if (next) {
      event.preventDefault()
      next.focus()
    }
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <table
        className="w-full min-w-[640px] border-separate border-spacing-1"
        onKeyDown={handleKeyDown}
      >
        <caption className="sr-only">
          Таблица переходов между ступенями. Строка — откуда, столбец — куда.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-16 pb-1 text-left align-bottom text-xs font-normal text-zinc-400">
              <span className="block">откуда ↓</span>
              <span className="block">куда →</span>
            </th>
            {degrees.map((degree) => (
              <th key={degree.index} scope="col" className="pb-1 font-normal">
                <HeaderLabel degree={degree} active={selection?.to === degree.index} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {degrees.map((fromDegree, row) => (
            <tr key={fromDegree.index}>
              <th scope="row" className="pr-2 text-left font-normal">
                <HeaderLabel degree={fromDegree} active={selection?.from === row} />
              </th>
              {degrees.map((toDegree, col) => {
                const cell = transitions[row]![col]!
                const selected = selection?.from === row && selection.to === col
                return (
                  <td key={toDegree.index} className="p-0">
                    <button
                      type="button"
                      data-row={row}
                      data-col={col}
                      aria-pressed={selected}
                      aria-label={`Из ${fromDegree.roman} (${fromDegree.chord}) в ${toDegree.roman} (${toDegree.chord}): ${cell.label}`}
                      onClick={() => onSelect({ from: row, to: col })}
                      className={`h-16 w-full cursor-pointer rounded-lg px-1.5 text-center text-xs leading-snug transition-colors duration-150 ${KIND_STYLES[cell.kind].cell} ${
                        selected ? 'ring-2 ring-zinc-900 ring-offset-1' : ''
                      }`}
                    >
                      {cell.label}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
      {(Object.keys(KINDS) as Kind[]).map((kind) => (
        <li key={kind} className="flex items-center gap-2">
          <span aria-hidden className={`size-2.5 rounded-full ${KIND_STYLES[kind].dot}`} />
          <span>
            <span className="text-zinc-700">{KINDS[kind].name}</span> — {KINDS[kind].hint}
          </span>
        </li>
      ))}
    </ul>
  )
}
