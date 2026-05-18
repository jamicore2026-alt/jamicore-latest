import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@jamicore/db'

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [],
  session: { strategy: 'jwt' },
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },
})

export const handlers = nextAuth.handlers
export const GET = handlers.GET
export const POST = handlers.POST
export const auth: typeof nextAuth.auth = nextAuth.auth
export const signIn: typeof nextAuth.signIn = nextAuth.signIn
export const signOut: typeof nextAuth.signOut = nextAuth.signOut
