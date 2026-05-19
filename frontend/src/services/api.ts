import axios from 'axios'
import toast from 'react-hot-toast'

/** Read a cookie value by name from document.cookie */
function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
  )
  return match ? decodeURIComponent(match[1]) : null
}

// Queue of failed requests waiting for the token refresh to complete
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = []

function processQueue(error: unknown): void {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(null)))
  failedQueue = []
}

/**
 * Single shared Axios instance for all API calls.
 * - Sends cookies automatically (withCredentials)
 * - Attaches X-CSRF-Token header on mutating requests (double-submit pattern)
 * - On 401: attempts a silent token refresh, then retries the original request
 * - On 403: shows a permission error toast
 * - On 500: shows a generic error toast
 */
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// ── Request interceptor: attach CSRF token ───────────────────────────────────
api.interceptors.request.use(config => {
  const mutating = ['post', 'put', 'delete', 'patch']
  if (mutating.includes((config.method || '').toLowerCase())) {
    const csrf = getCookie('csrf_token')
    if (csrf) config.headers['X-CSRF-Token'] = csrf
  }
  return config
})

// ── Response interceptor: refresh on 401, toast on 403/500 ──────────────────
api.interceptors.response.use(
  res => res,
  async error => {
    const originalRequest = error.config
    const status: number | undefined = error.response?.status

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until the in-flight refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => api(originalRequest))
          .catch(e => Promise.reject(e))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Use plain axios so this call bypasses the interceptor (avoids infinite loop)
        await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        processQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        // Session fully expired — hard redirect to login
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 403) {
      toast.error('You do not have permission to perform this action.')
    } else if (status === 500) {
      toast.error('Something went wrong. Please try again.')
    }

    return Promise.reject(error)
  }
)
