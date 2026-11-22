import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
const SERVER_API_URL:string = 'https://kanzul-islam-server.vercel.app/api/v1'

const BASE = SERVER_API_URL as string  ?? "http://localhost:5000/api/v1"
export const API_ORIGIN = BASE.replace(/\/api\/v\d+\/?$/, "")

/** Turn a stored image path ("/uploads/x.jpg") into a full URL. */
export const assetUrl = (p?: string) => (!p ? "" : /^(https?:|data:|blob:)/.test(p) ? p : `${API_ORIGIN}${p}`)

export const api = axios.create({ baseURL: BASE, withCredentials: true })

let accessToken: string | null = null
export const setAccessToken = (t: string | null) => { accessToken = t }
export const getAccessToken = () => accessToken

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`
  return cfg
})

// On 401, try one silent refresh (httpOnly cookie) then replay the request.
type Session = { accessToken: string; user: { id: string; name: string; email: string; role: string; permissions: string[] } }
let refreshing: Promise<Session | null> | null = null
export function refreshSession(): Promise<Session | null> {
  if (!refreshing) {
    refreshing = axios
      .post<Session>(`${BASE}/auth/refresh`, {}, { withCredentials: true })
      .then((r) => { accessToken = r.data.accessToken; return r.data })
      .catch(() => { accessToken = null; return null })
      .finally(() => { refreshing = null })
  }
  return refreshing
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const isAuthCall = cfg?.url?.includes("/auth/")
    if (error.response?.status === 401 && cfg && !cfg._retry && !isAuthCall) {
      cfg._retry = true
      const s = await refreshSession()
      if (s) { cfg.headers.Authorization = `Bearer ${s.accessToken}`; return api(cfg) }
      window.dispatchEvent(new Event("auth:expired"))
    }
    return Promise.reject(error)
  },
)

export const errMsg = (e: unknown, fallback = "Something went wrong") =>
  (e as AxiosError<{ message?: string }>)?.response?.data?.message ?? (e as Error)?.message ?? fallback
