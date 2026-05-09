/* eslint-disable react-refresh/only-export-components -- slots include hooks + context helpers */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

export type AppHeaderSlotSide = "left" | "right"

type HeaderSlotsContextValue = {
  leftMount: HTMLElement | null
  rightMount: HTMLElement | null
  setLeftMount: (el: HTMLElement | null) => void
  setRightMount: (el: HTMLElement | null) => void
  /** Mount node inside the app right sidebar panel (for route-specific controls). */
  rightSidebarContentMount: HTMLElement | null
  setRightSidebarContentMount: (el: HTMLElement | null) => void
  /** Mount node inside the app left sidebar panel (for route-specific controls). */
  leftSidebarContentMount: HTMLElement | null
  setLeftSidebarContentMount: (el: HTMLElement | null) => void
  leftSlotOccupied: boolean
  rightSlotOccupied: boolean
  claimSlot: (side: AppHeaderSlotSide) => void
  releaseSlot: (side: AppHeaderSlotSide) => void
}

const HeaderSlotsContext = createContext<HeaderSlotsContextValue | null>(null)

export function AppHeaderSlotsProvider({ children }: { children: ReactNode }) {
  const [leftMount, setLeftMountState] = useState<HTMLElement | null>(null)
  const [rightMount, setRightMountState] = useState<HTMLElement | null>(null)
  const [rightSidebarContentMount, setRightSidebarContentMountState] =
    useState<HTMLElement | null>(null)
  const [leftSidebarContentMount, setLeftSidebarContentMountState] =
    useState<HTMLElement | null>(null)
  const [leftClaims, setLeftClaims] = useState(0)
  const [rightClaims, setRightClaims] = useState(0)

  const setLeftMount = useCallback((el: HTMLElement | null) => {
    setLeftMountState((prev) => (prev === el ? prev : el))
  }, [])

  const setRightMount = useCallback((el: HTMLElement | null) => {
    setRightMountState((prev) => (prev === el ? prev : el))
  }, [])

  const setRightSidebarContentMount = useCallback((el: HTMLElement | null) => {
    setRightSidebarContentMountState((prev) => (prev === el ? prev : el))
  }, [])

  const setLeftSidebarContentMount = useCallback((el: HTMLElement | null) => {
    setLeftSidebarContentMountState((prev) => (prev === el ? prev : el))
  }, [])

  const claimSlot = useCallback((side: AppHeaderSlotSide) => {
    if (side === "left") setLeftClaims((c) => c + 1)
    else setRightClaims((c) => c + 1)
  }, [])

  const releaseSlot = useCallback((side: AppHeaderSlotSide) => {
    if (side === "left") setLeftClaims((c) => Math.max(0, c - 1))
    else setRightClaims((c) => Math.max(0, c - 1))
  }, [])

  const leftSlotOccupied = leftClaims > 0
  const rightSlotOccupied = rightClaims > 0

  const value = useMemo(
    () => ({
      leftMount,
      rightMount,
      setLeftMount,
      setRightMount,
      rightSidebarContentMount,
      setRightSidebarContentMount,
      leftSidebarContentMount,
      setLeftSidebarContentMount,
      leftSlotOccupied,
      rightSlotOccupied,
      claimSlot,
      releaseSlot,
    }),
    [
      leftMount,
      rightMount,
      setLeftMount,
      setRightMount,
      rightSidebarContentMount,
      setRightSidebarContentMount,
      leftSidebarContentMount,
      setLeftSidebarContentMount,
      leftSlotOccupied,
      rightSlotOccupied,
      claimSlot,
      releaseSlot,
    ]
  )

  return (
    <HeaderSlotsContext.Provider value={value}>{children}</HeaderSlotsContext.Provider>
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
  side,
  mount,
  children,
}: {
  side: AppHeaderSlotSide
  mount: HTMLElement | null
  children: ReactNode
}) {
  const { claimSlot, releaseSlot } = useAppHeaderSlots()

  useLayoutEffect(() => {
    if (!mount) return
    claimSlot(side)
    return () => releaseSlot(side)
  }, [mount, side, claimSlot, releaseSlot])

  if (!mount) return null
  return createPortal(children, mount)
}
