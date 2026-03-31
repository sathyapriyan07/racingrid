import { useEffect, useState } from 'react'

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialTheme() {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || stored === 'light') return stored
  return getSystemTheme()
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('no-theme-transition')
    // Force style recalculation so the class takes effect before toggling theme.
    void root.offsetHeight
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.remove('no-theme-transition'))
    })
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }

    if (mq.addEventListener) mq.addEventListener('change', handler)
    else mq.addListener(handler)

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler)
      else mq.removeListener(handler)
    }
  }, [])

  const toggle = () => {
    setTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return next
    })
  }

  return { theme, toggle }
}
