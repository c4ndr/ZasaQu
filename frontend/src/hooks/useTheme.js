import { useState, useEffect } from 'react'

const STORAGE_KEY = 'zasaqu-theme'

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')
  return { theme, toggle, isDark: theme === 'dark' }
}
