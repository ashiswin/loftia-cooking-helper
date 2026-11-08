import { useEffect, useState } from 'react'

export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (to: string) => {
    if (window.location.pathname === to) return
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { path, navigate }
}
