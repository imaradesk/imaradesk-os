import { useEffect, useState } from 'react'

// Matches Tailwind's `md` breakpoint
export const DESKTOP_QUERY = '(min-width: 768px)'

const matches = (query) => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches

/** Live boolean for a CSS media query. */
export default function useMediaQuery(query) {
  const [value, setValue] = useState(() => matches(query))

  useEffect(() => {
    if (!window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setValue(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return value
}
