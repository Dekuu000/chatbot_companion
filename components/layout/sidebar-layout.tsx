"use client"

import { type ReactNode, useState, useEffect, useRef, createContext, useContext } from "react"
import { usePathname } from "next/navigation"
import ConversationSidebar from "@/components/ConversationSidebar"
import { useSessionContext } from "@/components/providers/session-provider"
import { cn } from "@/lib/utils"

interface SidebarContextValue {
  isMobileSidebarOpen: boolean
  setIsMobileSidebarOpen: (open: boolean) => void
  toggleMobileSidebar: () => void
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)

export function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarLayout")
  }
  return context
}

interface SidebarLayoutProps {
  children: ReactNode
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { state, status } = useSessionContext()
  const pathname = usePathname()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const isReady = status === "ready"
  const isAuthenticated = state.mode === "authenticated"
  const showSidebar = isReady && isAuthenticated
  const isChatPage = pathname === "/chat"

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileSidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-mobile-menu-button]')
      ) {
        setIsMobileSidebarOpen(false)
      }
    }

    if (isMobileSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      // Prevent body scroll when sidebar is open on mobile
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = ""
    }
  }, [isMobileSidebarOpen])

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [pathname])

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev)
  }

  const sidebarContextValue: SidebarContextValue = {
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    toggleMobileSidebar,
  }

  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      <div className="grid h-screen bg-bg md:grid-cols-[16rem_1fr] lg:grid-cols-[18rem_1fr] overflow-hidden">
        {/* Backdrop for mobile */}
      {showSidebar && isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      {showSidebar ? (
        <>
          {/* Desktop Sidebar */}
          <div className="hidden md:flex md:flex-col md:h-full md:min-h-0 md:overflow-hidden">
            <ConversationSidebar />
          </div>

          {/* Mobile Sidebar Overlay */}
          <div
            ref={sidebarRef}
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-bg-surface border-r border-border",
              "md:hidden",
              "transform transition-transform duration-300 ease-in-out",
              isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <ConversationSidebar onClose={() => setIsMobileSidebarOpen(false)} />
          </div>
        </>
      ) : null}

        <div className="flex flex-col overflow-hidden min-h-0">
          {isChatPage ? children : <div className="flex-1 overflow-y-auto">{children}</div>}
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
