import { create } from "zustand"
import { api, refreshSession, setAccessToken } from "@/lib/api"

export type AuthUser = { id: string; name: string; email: string; role: string; permissions: string[] }

type State = {
  user: AuthUser | null
  ready: boolean
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  can: (perm: string) => boolean
  canAny: (...perms: string[]) => boolean
}

export const useAuth = create<State>((set, get) => ({
  user: null,
  ready: false,
  init: async () => {
    const s = await refreshSession()
    set({ user: s?.user ?? null, ready: true })
  },
  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password })
    setAccessToken(data.accessToken)
    set({ user: data.user })
  },
  logout: async () => {
    await api.post("/auth/logout").catch(() => undefined)
    setAccessToken(null)
    set({ user: null })
  },
  can: (perm) => !!get().user && (get().user!.permissions.includes("*") || get().user!.permissions.includes(perm)),
  canAny: (...perms) => perms.some((p) => get().can(p)),
}))

window.addEventListener("auth:expired", () => useAuth.setState({ user: null }))
