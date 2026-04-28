import { CreditCard, FileText, Image, Tag, Archive, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const stats = [
    { label: 'Total Payments', value: '$0', icon: CreditCard, color: 'bg-blue-500' },
    { label: 'Itineraries', value: '0', icon: FileText, color: 'bg-green-500' },
    { label: 'Watermarks', value: '0', icon: Image, color: 'bg-purple-500' },
    { label: 'Placards', value: '0', icon: Tag, color: 'bg-orange-500' },
    { label: 'Archived Files', value: '0', icon: Archive, color: 'bg-red-500' },
    { label: 'Revenue', value: '$0', icon: TrendingUp, color: 'bg-indigo-500' },
  ]

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to Journey Guide ERP System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-gray-600 text-center py-8">
            No recent activity yet. Start by creating payments or itineraries.
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition">
              + New Payment
            </button>
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition">
              + New Itinerary
            </button>
            <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition">
              + Create Watermark
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}