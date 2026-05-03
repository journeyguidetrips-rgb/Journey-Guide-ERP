import { Navigate } from 'react-router-dom'
import { useUserStore } from '../stores/userStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermissions?: string[]
  requiredRoles?: string[]
  requireAny?: boolean // If true, need ANY permission/role, if false need ALL
}

export default function ProtectedRoute({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAny = false,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, hasPermission, hasAnyPermission, hasRole, hasAnyRole } =
    useUserStore()

  // Not logged in
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Check permissions if required
  if (requiredPermissions.length > 0) {
    if (requireAny) {
      if (!hasAnyPermission(requiredPermissions)) {
        return <Navigate to="/" replace />
      }
    } else {
      if (!requiredPermissions.every((p) => hasPermission(p))) {
        return <Navigate to="/" replace />
      }
    }
  }

  // Check roles if required
  if (requiredRoles.length > 0) {
    if (requireAny) {
      if (!hasAnyRole(requiredRoles)) {
        return <Navigate to="/" replace />
      }
    } else {
      if (!requiredRoles.every((r) => hasRole(r))) {
        return <Navigate to="/" replace />
      }
    }
  }

  return <>{children}</>
}