"use client"

import { useMemo, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"
import { SidebarLayout } from "./sidebar-layout"
import { useSessionContext } from "@/components/providers/session-provider"

function matchesAny(pathname: string, candidates: string[]): boolean {
  return candidates.some((candidate) => {
    if (candidate === pathname) return true
    if (candidate.endsWith("/*")) {
      const prefix = candidate.slice(0, -1)
      return pathname.startsWith(prefix)
    }
    return false
  })
}

function PublicHeader({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-bg-surface/60">
        <div className="container flex h-16 items-center justify-between px-4 py-2 sm:px-6 lg:px-8 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="hidden text-lg font-semibold text-text-primary sm:inline">Career Explorer</span>
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/"
  const router = useRouter()
  const { state, status, signOut } = useSessionContext()

  const routeMeta = useMemo(() => {
    const publicRoutes = ["/", "/login", "/signup"]
    const guestRoutes = ["/chat", "/chat/*", "/onboarding", "/onboarding/*"]

    const isPublic = matchesAny(pathname, publicRoutes)
    const guestAllowed = isPublic || matchesAny(pathname, guestRoutes)
    const requiresAuth = !guestAllowed
    const shouldUseSidebar = !isPublic

    return {
      isPublic,
      guestAllowed,
      requiresAuth,
      shouldUseSidebar,
    }
  }, [pathname])

  const isReady = status === "ready"
  const isGuest = state.mode === "guest"
  const isAuthenticated = state.mode === "authenticated"
  const displayName = state.user?.name || state.user?.email

  const handleLogout = () => {
    signOut()
    router.push("/login")
  }

  if (!isReady) {
    return <div className="min-h-screen bg-bg" aria-busy="true" aria-label="Loading layout" />
  }

  if (isGuest && routeMeta.requiresAuth) {
    return (
      <PublicHeader>
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-bg-surface p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary mb-2">Unlock personalized coaching</p>
          <h1 className="text-2xl font-semibold text-text-primary mb-3">Sign in to access this workspace</h1>
          <p className="text-sm text-text-secondary mb-6">
            This area includes saved plans, resume insights, and interview trackers. Log in to sync your progress across
            devices, or continue in guest mode via the chat experience.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl border border-border px-6 py-3 text-sm font-semibold text-text-primary transition hover:bg-muted"
            >
              Create a free account
            </Link>
          </div>
        </div>
      </PublicHeader>
    )
  }

  const showGuestHeader = isGuest && routeMeta.shouldUseSidebar

  if (routeMeta.shouldUseSidebar && !showGuestHeader) {
    if (pathname === "/chat") {
      return <SidebarLayout>{children}</SidebarLayout>
    }

    return (
      <SidebarLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
      </SidebarLayout>
    )
  }

  if (showGuestHeader) {
    return (
      <div className="min-h-screen bg-bg">
        <header className="sticky top-0 z-40 w-full border-b border-border bg-bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-bg-surface/60">
          <div className="container grid h-16 gap-2 px-4 py-3 sm:h-auto sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-10 sm:items-center">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted sm:-ml-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-base font-semibold text-text-primary">Career Explorer</span>
              </Link>
              <div className="flex flex-col gap-1 text-xs sm:text-sm">
                <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Guest mode
                </span>
                <span className="text-text-secondary">
                  History won’t be saved in guest mode. Sign in to sync progress, unlock resume feedback, and track your streak.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <Link
                href="/login"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl border border-primary text-sm font-semibold text-primary transition-colors hover:bg-primary/10 h-10 px-4"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 h-10 px-4"
              >
                Create account
              </Link>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-bg-surface/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="hidden text-lg font-semibold text-text-primary sm:inline">Career Explorer</span>
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-sm text-text-secondary">Signed in as {displayName}</span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-text-primary h-11 px-6"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-text-primary h-11 px-6"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}








