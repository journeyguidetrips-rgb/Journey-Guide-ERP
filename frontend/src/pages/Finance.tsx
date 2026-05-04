import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import axios from 'axios'
import { useUserStore } from '../stores/userStore'
import toast from 'react-hot-toast'
import { 
  TrendingUp, 
  IndianRupee, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Download, 
  Search, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw  // ✅ Added missing import
} from 'lucide-react'

interface Booking {
  id: number
  booking_id: string
  client_name: string
  vendor_name: string
  phone?: string
  whatsapp?: string
  package_name?: string
  date_of_booking: string
  travel_date?: string
  guests: number
  selling_price: number
  received_from_client: number
  vendor_cost: number
  paid_to_vendor: number
  client_status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
  reminder_date?: string
  notes?: string
  created_at: string
}

interface BookingFilters {
  query: string
  vendorName: string
  status: '' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
  travelDate: string
  bookingDate: string
}

type TabView = 'dashboard' | 'bookings' | 'client-payments' | 'vendor-payments' | 'reminders'

export default function Finance() {
  const { token } = useUserStore()
  const [activeTab, setActiveTab] = useState<TabView>('dashboard')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // ✅ ADD THESE MISSING STATE VARIABLES
  const [bookingPage, setBookingPage] = useState(1)
  const [bookingHasMore, setBookingHasMore] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingFilters, setBookingFilters] = useState<BookingFilters>({
    query: '',
    vendorName: '',
    status: '',
    travelDate: '',
    bookingDate: ''
  })

  // Refs for infinite scroll
  const bookingPageRef = useRef(1)
  const bookingHasMoreRef = useRef(true)
  const bookingFetchLock = useRef(false)
  const bookingObserver = useRef<IntersectionObserver | null>(null)
  
  // ✅ FIX: Initialize with empty object, sync via useEffect below
  const bookingFiltersRef = useRef<BookingFilters>({
    query: '',
    vendorName: '',
    status: '',
    travelDate: '',
    bookingDate: ''
  })

  // Keep filtersRef in sync with state
  useEffect(() => {
    bookingFiltersRef.current = bookingFilters
  }, [bookingFilters])

  // Fetch all bookings on mount (dashboard view)
  useEffect(() => {
    const fetchFinanceData = async () => {
      if (activeTab !== 'dashboard') return
      setLoading(true)
      try {
        const response = await axios.get('/api/bookings', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setBookings(response.data.bookings || [])
      } catch (error) {
        toast.error('Failed to fetch finance data')
      } finally {
        setLoading(false)
      }
    }
    fetchFinanceData()
  }, [token, activeTab])

  // Intersection Observer for infinite scroll (bookings tab)
  const lastBookingRef = useCallback((node: HTMLTableRowElement | null) => {
    if (bookingObserver.current) {
      bookingObserver.current.disconnect()
      bookingObserver.current = null
    }

    // ✅ bookingLoading is now defined
    if (bookingLoading || !bookingHasMoreRef.current || !node) return

    bookingObserver.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !bookingFetchLock.current && bookingHasMoreRef.current) {
        fetchBookings(false)
      }
    }, { rootMargin: '150px' })

    bookingObserver.current.observe(node)
  }, [bookingLoading]) // ✅ Now valid dependency

  // Fetch bookings with pagination
  const fetchBookings = async (reset = false) => {
    if (bookingFetchLock.current) return
    bookingFetchLock.current = true

    const targetPage = reset ? 1 : bookingPageRef.current
    const setIsLoading = reset ? setLoading : setBookingLoading

    setIsLoading(true)
    try {
      const currentFilters = bookingFiltersRef.current

      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: '10',
        ...(currentFilters.query && { search: currentFilters.query }),
        ...(currentFilters.vendorName && { vendor: currentFilters.vendorName }),
        ...(currentFilters.status && { status: currentFilters.status }),
        ...(currentFilters.travelDate && { travelDate: currentFilters.travelDate }),
        ...(currentFilters.bookingDate && { bookingDate: currentFilters.bookingDate }),
      })

      const response = await axios.get(`/api/bookings?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const newItems = response.data.bookings || []
      const total = response.data.total ?? 0

      if (reset) {
        setBookings(newItems)
        bookingPageRef.current = 2
      } else {
        // Deduplicate by booking_id
        setBookings(prev => {
          const existingIds = new Set(prev.map(b => b.booking_id))
          const uniqueNew = newItems.filter(b => !existingIds.has(b.booking_id))
          return [...prev, ...uniqueNew]
        })
        bookingPageRef.current = targetPage + 1
      }

      bookingHasMoreRef.current = (targetPage * 10) < total
      setBookingHasMore(bookingHasMoreRef.current)

    } catch (error) {
      console.error('Fetch bookings error:', error)
      toast.error('Failed to fetch bookings')
    } finally {
      setIsLoading(false)
      bookingFetchLock.current = false
    }
  }

  // Filter handlers
  const handleApplyBookingFilters = () => {
    bookingFiltersRef.current = { ...bookingFilters }
    bookingFetchLock.current = false
    bookingPageRef.current = 1
    bookingHasMoreRef.current = true
    setBookingPage(1)
    setBookingHasMore(true)
    
    if (bookingObserver.current) {
      bookingObserver.current.disconnect()
      bookingObserver.current = null
    }
    
    fetchBookings(true)
  }

  const handleResetBookingFilters = () => {
    const newFilters: BookingFilters = { 
      query: '', 
      vendorName: '', 
      status: '', 
      travelDate: '', 
      bookingDate: '' 
    }
    setBookingFilters(newFilters)
    bookingFiltersRef.current = newFilters
    
    bookingFetchLock.current = false
    bookingPageRef.current = 1
    bookingHasMoreRef.current = true
    setBookingPage(1)
    setBookingHasMore(true)
    
    if (bookingObserver.current) {
      bookingObserver.current.disconnect()
      bookingObserver.current = null
    }
    
    fetchBookings(true)
  }

  // Initial fetch for bookings tab
  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings(true)
    }
    
    return () => {
      if (bookingObserver.current) {
        bookingObserver.current.disconnect()
      }
    }
  }, [activeTab])

  // Filtered bookings based on search & status (for dashboard/summary views)
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = 
        b.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.booking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter ? b.client_status === statusFilter : true
      return matchesSearch && matchesStatus
    })
  }, [bookings, searchQuery, statusFilter])

  // 💰 Calculate Dashboard Metrics
  const metrics = useMemo(() => {
    const totalSelling = bookings.reduce((sum, b) => sum + (Number(b.selling_price) || 0), 0)
    const totalReceived = bookings.reduce((sum, b) => sum + (Number(b.received_from_client) || 0), 0)
    const clientBalanceDue = totalSelling - totalReceived
    
    const totalVendorCost = bookings.reduce((sum, b) => sum + (Number(b.vendor_cost) || 0), 0)
    const totalPaidVendor = bookings.reduce((sum, b) => sum + (Number(b.paid_to_vendor) || 0), 0)
    const vendorBalanceDue = totalVendorCost - totalPaidVendor

    const grossProfit = totalSelling - totalVendorCost
    const realisedProfit = totalReceived - totalPaidVendor
    const unrealisedProfit = clientBalanceDue - vendorBalanceDue
    const netCashPosition = totalReceived - totalPaidVendor

    const collectionRate = totalSelling > 0 ? (totalReceived / totalSelling) * 100 : 0
    const vendorPayRate = totalVendorCost > 0 ? (totalPaidVendor / totalVendorCost) * 100 : 0
    const avgMargin = totalSelling > 0 ? (grossProfit / totalSelling) * 100 : 0

    const fullyPaidCount = bookings.filter(b => (Number(b.selling_price) || 0) <= (Number(b.received_from_client) || 0)).length

    const today = new Date()
    const weekFromNow = new Date(today)
    weekFromNow.setDate(today.getDate() + 7)

    const overdueReminders = bookings.filter(b => {
      if (!b.reminder_date || (Number(b.selling_price) - (Number(b.received_from_client) || 0)) <= 0) return false
      return new Date(b.reminder_date) < today
    })

    const dueThisWeek = bookings.filter(b => {
      if (!b.reminder_date || (Number(b.selling_price) - (Number(b.received_from_client) || 0)) <= 0) return false
      const rd = new Date(b.reminder_date)
      return rd >= today && rd <= weekFromNow
    })

    return {
      totalSelling, totalReceived, clientBalanceDue, collectionRate, fullyPaidCount,
      totalVendorCost, totalPaidVendor, vendorBalanceDue, vendorPayRate,
      overdueReminders: overdueReminders.length, dueThisWeek: dueThisWeek.length,
      grossProfit, realisedProfit, unrealisedProfit, netCashPosition, avgMargin
    }
  }, [bookings])

  // 📥 Export to CSV
  const exportToCSV = () => {
    const headers = ['Booking ID', 'Client', 'Selling Price', 'Received', 'Balance', 'Vendor Cost', 'Paid to Vendor', 'Vendor Balance', 'Status']
    const rows = filteredBookings.map(b => [
      b.booking_id,
      b.client_name,
      b.selling_price,
      b.received_from_client,
      (b.selling_price || 0) - (b.received_from_client || 0),
      b.vendor_cost,
      b.paid_to_vendor,
      (b.vendor_cost || 0) - (b.paid_to_vendor || 0),
      b.client_status
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    
    const link = document.createElement('a')
    link.href = encodeURI(csvContent)
    link.download = `finance_report_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('Report exported successfully')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading && activeTab === 'dashboard') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
            <p className="text-gray-500 mt-1">Client & Vendor Tracker</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-xl border-b border-gray-200 px-6 pt-2">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'bookings', label: 'All Bookings', icon: Users },
              { id: 'client-payments', label: 'Client Payments', icon: IndianRupee },
              { id: 'vendor-payments', label: 'Vendor Payments', icon: IndianRupee },
              { id: 'reminders', label: 'Reminders', icon: AlertCircle }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabView)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id 
                    ? 'border-purple-600 text-purple-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-b-xl shadow-sm p-6 min-h-[500px]">
          
          {/* ================= DASHBOARD VIEW ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Client Revenue */}
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">Client Revenue</h3>
                  <div className="space-y-3">
                    <MetricRow label="Total Clients" value={bookings.length} />
                    <MetricRow label="Total Selling Price" value={formatCurrency(metrics.totalSelling)} />
                    <MetricRow label="Received from Client" value={formatCurrency(metrics.totalReceived)} color="text-green-600" />
                    <MetricRow label="Client Balance Due" value={formatCurrency(metrics.clientBalanceDue)} color="text-red-600" />
                    <MetricRow label="Fully Paid" value={metrics.fullyPaidCount} />
                    <MetricRow label="Collection Rate" value={`${metrics.collectionRate.toFixed(1)}%`} />
                  </div>
                </div>

                {/* Vendor Costs */}
                <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">Vendor / Supplier Costs</h3>
                  <div className="space-y-3">
                    <MetricRow label="Total Vendor Cost" value={formatCurrency(metrics.totalVendorCost)} />
                    <MetricRow label="Paid to Vendors" value={formatCurrency(metrics.totalPaidVendor)} color="text-green-600" />
                    <MetricRow label="Vendor Balance Due" value={formatCurrency(metrics.vendorBalanceDue)} color="text-red-600" />
                    <MetricRow label="Vendor Pay Rate" value={`${metrics.vendorPayRate.toFixed(1)}%`} />
                    <MetricRow label="Overdue Reminders" value={metrics.overdueReminders} color="text-red-600" />
                    <MetricRow label="Due This Week" value={metrics.dueThisWeek} color="text-amber-600" />
                  </div>
                </div>

                {/* Profit & Margin */}
                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                  <h3 className="text-lg font-semibold text-green-900 mb-4">Profit & Margin Analysis</h3>
                  <div className="space-y-3">
                    <MetricRow label="Gross Profit" value={formatCurrency(metrics.grossProfit)} />
                    <MetricRow label="Profit Margin %" value={`${metrics.avgMargin.toFixed(1)}%`} />
                    <MetricRow label="Realised Profit" value={formatCurrency(metrics.realisedProfit)} color="text-green-700" />
                    <MetricRow label="Unrealised Profit" value={formatCurrency(metrics.unrealisedProfit)} color="text-gray-600" />
                    <MetricRow label="Net Cash Position" value={formatCurrency(metrics.netCashPosition)} />
                    <MetricRow label="Avg Margin / Deal" value={bookings.length > 0 ? formatCurrency(metrics.grossProfit / bookings.length) : '₹0'} />
                  </div>
                </div>
              </div>

              {/* Quick Summary Table */}
              <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Per-Client Profit Summary</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                      <tr>
                        <th className="px-4 py-3">Booking ID</th>
                        <th className="px-4 py-3">Client Name</th>
                        <th className="px-4 py-3 text-right">Selling Price</th>
                        <th className="px-4 py-3 text-right">Vendor Cost</th>
                        <th className="px-4 py-3 text-right">Gross Profit</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredBookings.slice(0, 10).map(booking => (
                        <tr key={booking.booking_id} className="bg-white hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-purple-600">{booking.booking_id}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{booking.client_name}</td>
                          <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(booking.selling_price || 0)}</td>
                          <td className="px-4 py-3 text-right text-amber-600">{formatCurrency(booking.vendor_cost || 0)}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">
                            {formatCurrency((booking.selling_price || 0) - (booking.vendor_cost || 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={booking.client_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= BOOKINGS VIEW ================= */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Search Client</label>
                    <input
                      type="text"
                      value={bookingFilters.query}
                      onChange={(e) => setBookingFilters({ ...bookingFilters, query: e.target.value })}
                      placeholder="Client name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
                    <input
                      type="text"
                      value={bookingFilters.vendorName}
                      onChange={(e) => setBookingFilters({ ...bookingFilters, vendorName: e.target.value })}
                      placeholder="Vendor name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                    <select
                      value={bookingFilters.status}
                      onChange={(e) => setBookingFilters({ ...bookingFilters, status: e.target.value as '' | 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                    >
                      <option value="">All</option>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Travel Date</label>
                    <input
                      type="date"
                      value={bookingFilters.travelDate}
                      onChange={(e) => setBookingFilters({ ...bookingFilters, travelDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleApplyBookingFilters}
                      className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                    >
                      <Search size={16} /> Search
                    </button>
                    <button
                      onClick={handleResetBookingFilters}
                      className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                    >
                      <RefreshCw size={16} /> Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Bookings Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-3">S.No</th>
                      <th className="px-4 py-3">Booking ID</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Travel Date</th>
                      <th className="px-4 py-3 text-right">Selling</th>
                      <th className="px-4 py-3 text-right">Received</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bookingLoading && bookings.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Loading bookings...</td></tr>
                    ) : bookings.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No bookings found</td></tr>
                    ) : (
                      bookings.map((booking, idx) => (
                        <tr 
                          key={booking.booking_id} 
                          ref={idx === bookings.length - 1 && bookingHasMore ? lastBookingRef : null}
                          className="bg-white hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-gray-500">{idx + 1 + (bookingPageRef.current - 1) * 10}</td>
                          <td className="px-4 py-3 font-mono text-purple-600">{booking.booking_id}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{booking.client_name}</td>
                          <td className="px-4 py-3">{formatDate(booking.travel_date)}</td>
                          <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(booking.selling_price || 0)}</td>
                          <td className="px-4 py-3 text-right text-green-600">{formatCurrency(booking.received_from_client || 0)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency((booking.selling_price || 0) - (booking.received_from_client || 0))}</td>
                          <td className="px-4 py-3">{booking.vendor_name}</td>
                          <td className="px-4 py-3 text-center"><StatusBadge status={booking.client_status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Loading & End Indicators */}
              {bookingLoading && bookings.length > 0 && (
                <div className="text-center py-4 text-gray-500">Loading more...</div>
              )}
              {!bookingHasMore && bookings.length > 0 && (
                <div className="text-center py-4 text-sm text-gray-400">✓ All bookings loaded</div>
              )}
            </div>
          )}

          {/* ================= REMINDERS VIEW ================= */}
          {activeTab === 'reminders' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-4">
                <p className="text-amber-800 font-medium">Auto-populated reminders based on client balances & reminder dates.</p>
              </div>
              <div className="grid gap-4">
                {bookings
                  .filter(b => b.reminder_date && (Number(b.selling_price) - (Number(b.received_from_client) || 0)) > 0)
                  .map(booking => {
                    const balance = (booking.selling_price || 0) - (booking.received_from_client || 0)
                    const reminderDate = new Date(booking.reminder_date!)
                    const today = new Date()
                    today.setHours(0,0,0,0)
                    const diffTime = reminderDate.getTime() - today.getTime()
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    
                    let urgency = 'bg-green-100 text-green-800'
                    let label = `Due in ${diffDays} days`
                    if (diffDays < 0) { urgency = 'bg-red-100 text-red-800'; label = `Overdue by ${Math.abs(diffDays)} days` }
                    else if (diffDays <= 3) { urgency = 'bg-amber-100 text-amber-800'; label = 'Due soon' }
                    else if (diffDays <= 7) { urgency = 'bg-yellow-100 text-yellow-800'; label = 'Due this week' }

                    return (
                      <div key={booking.booking_id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${urgency}`}>
                            <Calendar size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{booking.client_name} <span className="text-xs font-mono text-purple-600 ml-2">({booking.booking_id})</span></p>
                            <p className="text-sm text-gray-500">Balance: {formatCurrency(balance)} • Reminder: {formatDate(booking.reminder_date)}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${urgency}`}>{label}</span>
                      </div>
                    )
                  })}
                {bookings.filter(b => b.reminder_date && (Number(b.selling_price) - (Number(b.received_from_client) || 0)) > 0).length === 0 && (
                  <p className="text-center text-gray-500 py-8">No active payment reminders</p>
                )}
              </div>
            </div>
          )}

          {/* Placeholder for Payments Tabs */}
          {(activeTab === 'client-payments' || activeTab === 'vendor-payments') && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <IndianRupee size={48} className="mb-4 text-gray-400" />
              <p className="text-lg font-medium">Payment logs will appear here</p>
              <p className="text-sm mt-2">Connect to <code className="bg-gray-100 px-2 py-1 rounded">/api/bookings/:id/client-payments</code> endpoint to populate.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// Reusable Sub-components
function MetricRow({ label, value, color = 'text-gray-900' }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
    Draft: 'bg-gray-100 text-gray-600',
    Published: 'bg-purple-100 text-purple-700',
    Converted: 'bg-indigo-100 text-indigo-700'
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}