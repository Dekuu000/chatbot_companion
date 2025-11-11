'use client'

import { SessionProvider } from '@/components/providers/session-provider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}





