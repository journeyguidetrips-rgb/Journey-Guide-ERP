import { User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useUserStore } from '../stores/userStore'

export default function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useUserStore()
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
      <div className="text-lg font-semibold text-gray-800">Journey Guide ERP</div>

      <div className="flex items-center gap-4">
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-600 capitalize">{user?.roleName}</p>
            </div>
            <ChevronDown size={16} className="text-gray-600" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>

              <div className="px-4 py-2 space-y-1">
                <p className="text-xs font-semibold text-gray-700 mb-2">Permissions:</p>
                <div className="flex flex-wrap gap-1">
                  {user?.permissions?.slice(0, 3).map((perm) => (
                    <span
                      key={perm}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                    >
                      {perm.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {user?.permissions && user.permissions.length > 3 && (
                    <span className="text-xs text-gray-600">
                      +{user.permissions.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="px-4 py-2 border-t border-gray-200 space-y-1">
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition">
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}