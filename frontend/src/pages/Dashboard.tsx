import { useEffect, useState } from 'react'
import { CreditCard, FileText, Image, Tag, Archive, TrendingUp } from 'lucide-react'
import axios from 'axios'
import { useUserStore } from '../stores/userStore'

interface DashboardMetrics {
  total_bookings: number;
  total_itineraries: number;
  total_selling_price: number;
  total_received: number;
  total_vendor_cost: number;
  total_paid_to_vendor: number;
}

export default function Dashboard() {
  const { token } = useUserStore()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await axios.get('/api/bookings/dashboard-summary', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (data.success) setMetrics(data.data)
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [token])

  const stats = [
    { label: 'Total Bookings',     value: metrics?.total_bookings ?? 0,                                    icon: CreditCard,  color: 'bg-blue-500' },
    { label: 'Itineraries',        value: metrics?.total_itineraries ?? 0,                                 icon: FileText,    color: 'bg-green-500' },
    { label: 'Revenue (Selling)',   value: `₹${(metrics?.total_selling_price ?? 0).toLocaleString()}`,     icon: TrendingUp,  color: 'bg-indigo-500' },
    { label: 'Received from Client',value: `₹${(metrics?.total_received ?? 0).toLocaleString()}`,          icon: Image,       color: 'bg-purple-500' },
    { label: 'Vendor Cost',         value: `₹${(metrics?.total_vendor_cost ?? 0).toLocaleString()}`,       icon: Tag,         color: 'bg-orange-500' },
    { label: 'Paid to Vendor',      value: `₹${(metrics?.total_paid_to_vendor ?? 0).toLocaleString()}`,    icon: Archive,     color: 'bg-red-500' },
  ]

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to Journey Guide ERP System</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
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
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
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