import axios from 'axios'
import { create } from 'zustand'

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  roleName: string
  permissions: string[]
}

export interface UserState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean

  // Actions
  login: (user: User) => void
  logout: () => Promise<void>
  /** Clears auth state locally without calling the server (used on refresh failure). */
  clearAuth: () => void
  /** Called once on app mount — fetches /api/auth/me to rehydrate from httpOnly cookie. */
  loadFromStorage: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  // Start as loading so the app doesn't flash the login page during the /me check
  isLoading: true,
  isAuthenticated: false,

  login: (user: User) => {
    set({ user, isAuthenticated: true })
  },

  logout: async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true })
    } catch {
      // Ignore — cookies are cleared server-side; we clear client state regardless
    }
    set({ user: null, isAuthenticated: false })
  },

  clearAuth: () => {
    set({ user: null, isAuthenticated: false })
  },

  loadFromStorage: async () => {
    try {
      const { data } = await axios.get('/api/auth/me', { withCredentials: true })
      if (data.success) {
        set({ user: data.user, isAuthenticated: true, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      // No valid session cookie — user must log in
      set({ isLoading: false })
    }
  },

  hasPermission: (permission: string) => {
    const { user } = get()
    return user?.permissions?.includes(permission) || false
  },

  hasRole: (role: string) => {
    const { user } = get()
    return user?.roleName?.toLowerCase() === role.toLowerCase()
  },

  hasAnyRole: (roles: string[]) => {
    const { user } = get()
    return roles.some(role => user?.roleName?.toLowerCase() === role.toLowerCase())
  },

  hasAnyPermission: (permissions: string[]) => {
    const { user } = get()
    return permissions.some(permission => user?.permissions?.includes(permission))
  },
}))
