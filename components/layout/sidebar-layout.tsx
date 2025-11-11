"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"
import ConversationSidebar from "@/components/ConversationSidebar"
import { useSessionContext } from "@/components/providers/session-provider"

interface SidebarLayoutProps {
  children: ReactNode
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const { state, status } = useSessionContext()
  const pathname = usePathname()

  const isReady = status === "ready"
  const isAuthenticated = state.mode === "authenticated"
  const showSidebar = isReady && isAuthenticated
  const isChatPage = pathname === "/chat"

  return (
    <div className="grid h-screen bg-bg md:grid-cols-[16rem_1fr]">
      {showSidebar ? (
        <div className="hidden md:flex md:flex-col">
          <ConversationSidebar />
        </div>
      ) : null}

      <div className="flex flex-col overflow-hidden min-h-0">
        {isChatPage ? children : <div className="flex-1 overflow-y-auto">{children}</div>}
      </div>
    </div>
  )
}

