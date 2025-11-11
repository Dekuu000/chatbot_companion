import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.AUTH_GOOGLE_ENABLED === 'true'
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          }),
        ]
      : []),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.provider = account.provider
        token.name = profile.name
        ;(token as any).picture = (profile as any).picture
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        ;(session as any).provider = (token as any).provider
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

