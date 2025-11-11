"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  clearSession,
  getClientSessionState,
  getGuestSessionId,
  refreshSessionState,
  setSession,
  type SessionState,
  type UserSession,
} from "@/lib/session"

type SessionStatus = "initial" | "ready"

interface SessionContextValue {
  state: SessionState
  status: SessionStatus
  setAuthenticatedSession: (session: UserSession) => void
  enterGuestMode: () => void
  signOut: () => void
  refresh: () => void
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(() => ({
    mode: "guest",
    user: null,
    guestId: getGuestSessionId(),
  }))
  const [status, setStatus] = useState<SessionStatus>("initial")

  useEffect(() => {
    setState(getClientSessionState())
    setStatus("ready")
  }, [])

  const setAuthenticatedSession = useCallback((session: UserSession) => {
    setSession(session)
    setState({
      mode: "authenticated",
      user: session,
    })
    setStatus("ready")
  }, [])

  const enterGuestMode = useCallback(() => {
    clearSession()
    setState({
      mode: "guest",
      user: null,
      guestId: getGuestSessionId(),
    })
    setStatus("ready")
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setState({
      mode: "guest",
      user: null,
      guestId: getGuestSessionId(),
    })
    setStatus("ready")
  }, [])

  const refresh = useCallback(() => {
    setState(refreshSessionState())
    setStatus("ready")
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      status,
      setAuthenticatedSession,
      enterGuestMode,
      signOut,
      refresh,
    }),
    [enterGuestMode, refresh, setAuthenticatedSession, signOut, state, status]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSessionContext must be used within a SessionProvider")
  }
  return context
}


