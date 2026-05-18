export {}

declare module '@auth/core/types' {
  interface User {
    role?: string
  }
  interface Session {
    user: User & {
      id: string
      role?: string
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string
    role?: string
  }
}
