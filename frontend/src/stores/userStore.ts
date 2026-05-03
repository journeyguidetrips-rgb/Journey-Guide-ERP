import { create } from 'zustand';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roleName: string;
  permissions: string[];
}

export interface UserState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  loadFromStorage: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  login: (user: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  loadFromStorage: () => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');

      if (storedUser && storedToken) {
        const user = JSON.parse(storedUser);
        set({ user, token: storedToken, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    }
  },

  hasPermission: (permission: string) => {
    const { user } = get();
    return user?.permissions?.includes(permission) || false;
  },

  hasRole: (role: string) => {
    const { user } = get();
    return user?.roleName?.toLowerCase() === role.toLowerCase();
  },

  hasAnyRole: (roles: string[]) => {
    const { user } = get();
    return roles.some((role) => user?.roleName?.toLowerCase() === role.toLowerCase());
  },

  hasAnyPermission: (permissions: string[]) => {
    const { user } = get();
    return permissions.some((permission) => user?.permissions?.includes(permission));
  },
}));