import type { Theme } from './storage'

interface Props {
  theme: Theme
  onChange: (theme: Theme) => void
}

export function ThemeToggle({ theme, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Тема оформления"
      className="flex items-center gap-0.5 rounded-lg border border-zinc-200/80 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        aria-label="Светлая тема"
        onClick={() => onChange('light')}
        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
          theme === 'light'
            ? 'bg-white font-medium text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="3.5" />
          <path d="M10 2.5v2m0 11v2M2.5 10h2m11 0h2m-11.8 5.3 1.4-1.4m8.8-8.8 1.4-1.4m-11.6 0 1.4 1.4m8.8 8.8 1.4 1.4" />
        </svg>
        <span className="hidden sm:inline">Светлая</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        aria-label="Тёмная тема"
        onClick={() => onChange('dark')}
        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
          theme === 'dark'
            ? 'bg-white font-medium text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
          aria-hidden="true"
        >
          <path d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586Z" />
        </svg>
        <span className="hidden sm:inline">Тёмная</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'system'}
        aria-label="Системная тема"
        onClick={() => onChange('system')}
        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
          theme === 'system'
            ? 'bg-white font-medium text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
          aria-hidden="true"
        >
          <rect x="3" y="3.5" width="14" height="10" rx="2" />
          <path d="M7 16.5h6m-3-3v3" />
        </svg>
        <span className="hidden sm:inline">Авто</span>
      </button>
    </div>
  )
}
