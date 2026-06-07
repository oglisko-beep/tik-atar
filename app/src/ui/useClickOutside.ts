import { useEffect, useRef } from 'react'

export function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null)
  const cb = useRef(onOutside)
  cb.current = onOutside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb.current()
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') cb.current()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', esc)
    }
  }, [])
  return ref
}
