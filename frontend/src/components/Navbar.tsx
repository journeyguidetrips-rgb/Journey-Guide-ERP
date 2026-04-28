import { User, LogOut, Settings } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
      <div className="text-lg font-semibold text-gray-800">Journey Guide ERP</div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
          <Settings size={20} className="text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
          <User size={20} className="text-gray-600" />
        </button>
        <button className="p-2 hover:bg-red-50 rounded-lg transition">
          <LogOut size={20} className="text-red-600" />
        </button>
      </div>
    </nav>
  )
}