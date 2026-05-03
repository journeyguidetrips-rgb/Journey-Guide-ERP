import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, CreditCard, MapPin, Palette, Tag, Archive } from 'lucide-react'
import clsx from 'clsx'
import { useUserStore } from '../stores/userStore'

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { path: '/payments', label: 'Payments', icon: CreditCard, permission: 'view_payments' },
  { path: '/itineraries', label: 'Itineraries', icon: MapPin, permission: 'view_itineraries' },
  { path: '/watermark', label: 'Watermark', icon: Palette, permission: 'manage_watermarks' },
  { path: '/placards', label: 'Placards', icon: Tag, permission: 'manage_placards' },
  { path: '/logs', label: 'Logs', icon: Archive, permission: 'view_logs' },
]

export default function Sidebar() {
  const location = useLocation()
  const { user, hasPermission, hasAnyPermission } = useUserStore()

  // Filter menu items based on user permissions
  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true
    // Check if user has any manage_* permission for view_* items
    if (item.permission.startsWith('view_')) {
      const managePermission = item.permission.replace('view_', 'manage_')
      return hasPermission(item.permission) || hasPermission(managePermission)
    }
    return hasPermission(item.permission)
  })

  return (
    <aside className="w-64 bg-gray-900 text-white p-6 overflow-y-auto">
      <nav className="space-y-2">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Info Footer */}
      <div className="mt-8 pt-8 border-t border-gray-700">
        <div className="text-xs text-gray-400 space-y-1">
          <p>
            <span className="font-semibold">User:</span> {user?.firstName}
          </p>
          <p>
            <span className="font-semibold">Role:</span> <span className="capitalize">{user?.roleName}</span>
          </p>
        </div>
      </div>
    </aside>
  )
}