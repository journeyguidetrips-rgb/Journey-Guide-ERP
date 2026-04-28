import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, CreditCard, MapPin, Palette, Tag, Archive } from 'lucide-react'
import clsx from 'clsx'

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/itineraries', label: 'Itineraries', icon: MapPin },
  { path: '/watermark', label: 'Watermark', icon: Palette },
  { path: '/placards', label: 'Placards', icon: Tag },
  { path: '/logs', label: 'Logs', icon: Archive },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 bg-gray-900 text-white p-6 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Journey Guide</h1>
        <p className="text-sm text-gray-400 mt-1">Travel Agency System</p>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => {
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
    </aside>
  )
}