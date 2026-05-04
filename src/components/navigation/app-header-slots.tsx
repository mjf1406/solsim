import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

type HeaderSlotsContextValue = {
  leftMount: HTMLElement | null
  rightMount: HTMLElement | null
  setLeftMount: (el: HTMLElement | null) => void
  setRightMount: (el: HTMLElement | null) => void
}

const HeaderSlotsContext = createContext<HeaderSlotsContextValue | null>(null)

export function AppHeaderSlotsProvider({ children }: { children: ReactNode }) {
  const [leftMount, setLeftMountState] = useState<HTMLElement | null>(null)
  const [rightMount, setRightMountState] = useState<HTMLElement | null>(null)

  const setLeftMount = useCallback((el: HTMLElement | null) => {
    setLeftMountState((prev) => (prev === el ? prev : el))
  }, [])

  const setRightMount = useCallback((el: HTMLElement | null) => {
    setRightMountState((prev) => (prev === el ? prev : el))
  }, [])

  const value = useMemo(
    () => ({
      leftMount,
      rightMount,
      setLeftMount,
      setRightMount,
    }),
    [leftMount, rightMount, setLeftMount, setRightMount]
  )

  return (
    <HeaderSlotsContext.Provider value={value}>
      {children}
    </HeaderSlotsContext.Provider>
  )
}

export function useAppHeaderSlots() {
  const ctx = useContext(HeaderSlotsContext)
  if (!ctx) {
    throw new Error("useAppHeaderSlots must be used within AppHeaderSlotsProvider")
  }
  return ctx
}

/** Renders `children` into the app header slot while preserving React context (e.g. SidebarProvider). */
export function HeaderSlotPortal({
  mount,
  children,
}: {
  mount: HTMLElement | null
  children: ReactNode
}) {
  if (!mount) return null
  return createPortal(children, mount)
}
