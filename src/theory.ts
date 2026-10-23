export type Mode = 'major' | 'minor'

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const

const SCALE_STEPS: Record<Mode, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // натуральный минор
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

/** Написание тоники для каждой высоты звука (индекс буквы, чтобы избежать двойных знаков). */
const TONIC_SPELLING: Record<Mode, readonly number[]> = {
  // pc: 0  1  2  3  4  5  6  7  8  9 10 11
  major: [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6],
  minor: [0, 0, 1, 2, 2, 3, 3, 4, 4, 5, 6, 6],
}

export type Quality = 'major' | 'minor' | 'dim'

export interface Degree {
  /** Индекс ступени, 0–6 */
  index: number
  /** Римская цифра: I, ii, vii° */
  roman: string
  /** Название аккорда: C, Dm, B° */
  chord: string
  /** Название тоники ступени: C, D, B♭ */
  root: string
  quality: Quality
}

function accidental(diff: number): string {
  switch (diff) {
    case -2:
      return '𝄫'
    case -1:
      return '♭'
    case 1:
      return '♯'
    case 2:
      return '𝄪'
    default:
      return ''
  }
}

function spell(letterIndex: number, pc: number): string {
  const diff = ((pc - LETTER_PC[letterIndex % 7]! + 18) % 12) - 6
  return LETTERS[letterIndex % 7]! + accidental(diff)
}

/** Названия 12 возможных тоник в выбранном ладу (для кнопок выбора тональности). */
export function tonicName(pc: number, mode: Mode): string {
  return spell(TONIC_SPELLING[mode][pc]!, pc)
}

/** Полутоны от тоники до ступени k (k может выходить за пределы октавы). */
function semitonesAt(k: number, mode: Mode): number {
  return 12 * Math.floor(k / 7) + SCALE_STEPS[mode][((k % 7) + 7) % 7]!
}

function qualityAt(k: number, mode: Mode): Quality {
  const third = semitonesAt(k + 2, mode) - semitonesAt(k, mode)
  const fifth = semitonesAt(k + 4, mode) - semitonesAt(k, mode)
  if (third === 4) return 'major'
  return fifth === 6 ? 'dim' : 'minor'
}

export function buildDegrees(tonicPc: number, mode: Mode): Degree[] {
  const tonicLetter = TONIC_SPELLING[mode][tonicPc]!
  return Array.from({ length: 7 }, (_, index) => {
    const pc = (tonicPc + semitonesAt(index, mode)) % 12
    const root = spell(tonicLetter + index, pc)
    const quality = qualityAt(index, mode)
    const numeral = quality === 'major' ? ROMAN[index]! : ROMAN[index]!.toLowerCase()
    const roman = quality === 'dim' ? `${numeral}°` : numeral
    const chord = root + (quality === 'minor' ? 'm' : quality === 'dim' ? '°' : '')
    return { index, roman, chord, root, quality }
  })
}

function tonicMidi(tonicPc: number): number {
  return tonicPc <= 6 ? 60 + tonicPc : 48 + tonicPc
}

/** MIDI-ноты трезвучия на ступени k в виде корневого положения. */
function triadMidi(k: number, tonicPc: number, mode: Mode): number[] {
  const base = tonicMidi(tonicPc)
  return [0, 2, 4].map((step) => base + semitonesAt(k + step, mode))
}

const centroid = (notes: number[]) => notes.reduce((a, b) => a + b, 0) / notes.length

/** Выбирает октаву аккорда, ближайшую к целевой «середине» — так голоса идут плавно. */
function voice(k: number, tonicPc: number, mode: Mode, target: number): number[] {
  const candidates = [-7, 0, 7].map((shift) => triadMidi(k + shift, tonicPc, mode))
  return candidates.reduce((best, c) =>
    Math.abs(centroid(c) - target) < Math.abs(centroid(best) - target) ? c : best,
  )
}

/** Ноты последовательности аккордов (с басом на октаву ниже корня): голоса ведутся плавно. */
export function voiceProgression(
  degrees: number[],
  tonicPc: number,
  mode: Mode,
): number[][] {
  const withBass = (notes: number[]) => [notes[0]! - 12, ...notes]
  let target = 63
  return degrees.map((k) => {
    const notes = voice(k, tonicPc, mode, target)
    target = centroid(notes)
    return withBass(notes)
  })
}

export interface TransitionVoicing {
  from: number[]
  to: number[]
}

/** Ноты двух аккордов перехода, включая басовый звук на октаву ниже корня. */
export function voiceTransition(
  from: number,
  to: number,
  tonicPc: number,
  mode: Mode,
): TransitionVoicing {
  const [first, second] = voiceProgression([from, to], tonicPc, mode)
  return { from: first!, to: second! }
}

/** Условная «напряжённость» ступени от 0 (покой) до 4 (сильнейшее тяготение). */
export const TENSION: Record<Mode, readonly number[]> = {
  major: [0, 2, 1, 1.5, 3.5, 0.8, 4],
  minor: [0, 3.5, 0.8, 2, 2.5, 1, 2.5],
}
