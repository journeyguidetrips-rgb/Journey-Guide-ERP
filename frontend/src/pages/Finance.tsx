// src/pages/Finance.tsx - TOP OF FILE
import React from 'react'  // ✅ Add this
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  IndianRupee,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Building2,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { useUserStore } from '../stores/userStore'

// ================= TYPES =================
type TabView = 'dashboard' | 'bookings' | 'client-payments' | 'vendor-payments' | 'reminders'

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

interface ClientPayment {
  id: number
  booking_id: string
  client_name: string
  payment_date: string
  payment_type: 'Advance' | 'Final' | 'Refund' | 'Other'
  amount: number
  payment_mode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'
  reference_utr?: string
  package_name?: string
  running_total: number
  remarks?: string
  created_at: string
}

interface VendorPayment {
  id: number
  booking_id: string
  client_name: string
  vendor_name: string
  date_paid: string
  amount_paid: number
  payment_mode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'
  reference_utr?: string
  package_name?: string
  running_total: number
  remarks?: string
  created_at: string
}

interface DashboardMetrics {
  total_bookings: number
  total_selling_price: number
  total_received_from_client: number
  total_client_balance_due: number
  total_vendor_cost: number
  total_paid_to_vendor: number
  total_vendor_balance_due: number
  gross_profit: number
  realised_profit: number
  unrealised_profit: number
  collection_rate: number
  vendor_pay_rate: number
  fully_paid_count: number
  overdue_reminders_count: number
}

interface PaymentForm {
  bookingId: string
  clientName: string
  paymentDate: string
  paymentType: 'Advance' | 'Final' | 'Refund' | 'Other'
  amount: string
  paymentMode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'
  referenceUtr: string
  packageName: string
  remarks: string
}

interface VendorPaymentForm {
  bookingId: string
  clientName: string
  vendorName: string
  datePaid: string
  amountPaid: string
  paymentMode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'
  referenceUtr: string
  packageName: string
  remarks: string
}

interface BookingWithPayments {
  booking: Booking
  clientPayments: ClientPayment[]
  vendorPayments: VendorPayment[]
  clientBalanceDue: number
  vendorBalanceDue: number
}

// ================= UTILS =================
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getStatusStyle = (status: string) => {
  const styles: Record<string, string> = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
  }
  return `px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`
}

const getPaymentTypeStyle = (type: string) => {
  const styles: Record<string, string> = {
    Advance: 'bg-blue-100 text-blue-700',
    Final: 'bg-green-100 text-green-700',
    Refund: 'bg-red-100 text-red-700',
    Other: 'bg-gray-100 text-gray-700',
  }
  return `px-2 py-1 rounded text-xs ${styles[type] || 'bg-gray-100 text-gray-700'}`
}

// ================= SUB-COMPONENTS =================
const MetricRow: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = 'text-gray-900' }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-gray-600">{label}</span>
    <span className={`font-medium ${color}`}>{value}</span>
  </div>
)

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span className={getStatusStyle(status)}>{status}</span>
)

// ================= MAIN COMPONENT =================
export default function Finance() {
  const { token } = useUserStore()

  // Tab & UI State
  const [activeTab, setActiveTab] = useState<TabView>('dashboard')
  const [saving, setSaving] = useState(false)

  // Data State
  const [bookings, setBookings] = useState<Booking[]>([])
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([])
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([])
  const [selectedBooking, setSelectedBooking] = useState<BookingWithPayments | null>(null)
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null)

  // Loading States - SEPARATE for each tab
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  // Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<string>('')

  // Pagination State
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const fetchLock = useRef(false)
  const observer = useRef<IntersectionObserver | null>(null)

  // Modal State
  const [showClientPaymentModal, setShowClientPaymentModal] = useState(false)
  const [showVendorPaymentModal, setShowVendorPaymentModal] = useState(false)
  const [showBookingDetails, setShowBookingDetails] = useState(false)

  // Form State
  const [clientPaymentForm, setClientPaymentForm] = useState<PaymentForm>({
    bookingId: '', clientName: '', paymentDate: new Date().toISOString().split('T')[0],
    paymentType: 'Advance', amount: '', paymentMode: 'UPI',
    referenceUtr: '', packageName: '', remarks: ''
  })
  const [vendorPaymentForm, setVendorPaymentForm] = useState<VendorPaymentForm>({
    bookingId: '', clientName: '', vendorName: '', datePaid: new Date().toISOString().split('T')[0],
    amountPaid: '', paymentMode: 'UPI', referenceUtr: '', packageName: '', remarks: ''
  })

  // ================= API CALLS =================
  const api = useMemo(() => axios.create({
    baseURL: import.meta.env.DEV ? 'http://localhost:5000/api' : '/api',
    headers: { 'Content-Type': 'application/json' },
  }), [])

  // ✅ FIXED: Dashboard metrics fetch with proper loading
  const fetchDashboardMetrics = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const { data } = await api.get('/bookings/dashboard-summary', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) setDashboardMetrics(data.data)
    } catch (error) {
      console.error('Fetch metrics error:', error)
      toast.error('Failed to load dashboard metrics')
    } finally {
      setDashboardLoading(false) // ✅ This was missing!
    }
  }, [api, token])

  // Generic fetch for paginated lists
  const fetchList = useCallback(async (endpoint: string, reset: boolean, setter: React.Dispatch<React.SetStateAction<any[]>>, pageSetter?: React.Dispatch<React.SetStateAction<number>>, setLoadingFn?: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (fetchLock.current) return
    fetchLock.current = true
    
    const targetPage = reset ? 1 : pageRef.current
    const setIsLoading = setLoadingFn || ((v: boolean) => {}) // Optional loading setter
    
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: targetPage.toString(), limit: '20' })
      const { data } = await api.get(`${endpoint}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const newItems = data.payments || data.bookings || []
      const total = data.total ?? 0

      if (reset) {
        setter(newItems)
        pageRef.current = 2
        pageSetter?.(2)
      } else {
        setter(prev => {
          const ids = new Set(prev.map((i: any) => i.id))
          return [...prev, ...newItems.filter((i: any) => !ids.has(i.id))]
        })
        pageRef.current = targetPage + 1
        pageSetter?.(prev => prev + 1)
      }
      hasMoreRef.current = (targetPage * 20) < total
    } catch (error) {
      console.error(`Fetch ${endpoint} error:`, error)
      toast.error(`Failed to fetch ${endpoint}`)
    } finally {
      setIsLoading(false)
      fetchLock.current = false
    }
  }, [api, token])

  const fetchBookings = useCallback((reset = false) => 
    fetchList('/bookings', reset, setBookings, undefined, setBookingsLoading), [fetchList])

  const fetchClientPayments = useCallback((reset = false) => 
    fetchList('/bookings/client-payments', reset, setClientPayments, undefined, setPaymentsLoading), [fetchList])

  const fetchVendorPayments = useCallback((reset = false) => 
    fetchList('/bookings/vendor-payments', reset, setVendorPayments, undefined, setPaymentsLoading), [fetchList])

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      const { data } = await api.get(`/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSelectedBooking(data)
      setShowBookingDetails(true)
    } catch {
      toast.error('Failed to fetch booking details')
    }
  }

  // ================= HANDLERS =================
  const handleAddClientPayment = async () => {
    if (!clientPaymentForm.bookingId || !clientPaymentForm.amount) {
      toast.error('Please fill required fields')
      return
    }
    setSaving(true)
    try {
      await api.post(`/bookings/${clientPaymentForm.bookingId}/client-payments`, {
        ...clientPaymentForm, amount: parseFloat(clientPaymentForm.amount)
      }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('✅ Client payment recorded!')
      setShowClientPaymentModal(false)
      setClientPaymentForm(prev => ({ ...prev, bookingId: '', amount: '' }))
      if (selectedBooking?.booking.booking_id === clientPaymentForm.bookingId) {
        fetchBookingDetails(clientPaymentForm.bookingId)
      }
      fetchBookings(true)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add payment')
    } finally {
      setSaving(false)
    }
  }

  const handleAddVendorPayment = async () => {
    if (!vendorPaymentForm.bookingId || !vendorPaymentForm.amountPaid) {
      toast.error('Please fill required fields')
      return
    }
    setSaving(true)
    try {
      await api.post(`/bookings/${vendorPaymentForm.bookingId}/vendor-payments`, {
        ...vendorPaymentForm, amountPaid: parseFloat(vendorPaymentForm.amountPaid)
      }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('✅ Vendor payment recorded!')
      setShowVendorPaymentModal(false)
      setVendorPaymentForm(prev => ({ ...prev, bookingId: '', amountPaid: '' }))
      if (selectedBooking?.booking.booking_id === vendorPaymentForm.bookingId) {
        fetchBookingDetails(vendorPaymentForm.bookingId)
      }
      fetchBookings(true)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add payment')
    } finally {
      setSaving(false)
    }
  }

  const exportToCSV = (type: 'bookings' | 'client' | 'vendor') => {
    const data = type === 'bookings' ? bookings : type === 'client' ? clientPayments : vendorPayments
    const headers = {
      bookings: ['Booking ID', 'Client', 'Selling', 'Received', 'Balance', 'Vendor', 'Status'],
      client: ['Booking ID', 'Client', 'Date', 'Type', 'Amount', 'Mode', 'UTR'],
      vendor: ['Booking ID', 'Client', 'Vendor', 'Date', 'Amount', 'Mode', 'UTR'],
    }[type]
    const rows = data.map((item: any) => {
      if (type === 'bookings') return [item.booking_id, item.client_name, item.selling_price, item.received_from_client, (item.selling_price - item.received_from_client), item.vendor_name, item.client_status]
      if (type === 'client') return [item.booking_id, item.client_name, item.payment_date, item.payment_type, item.amount, item.payment_mode, item.reference_utr]
      return [item.booking_id, item.client_name, item.vendor_name, item.date_paid, item.amount_paid, item.payment_mode, item.reference_utr]
    })
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const link = document.createElement('a')
    link.href = `text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    link.download = `payments_${type}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('Report exported')
  }

  const handleApplyFilters = () => {
    fetchLock.current = false
    pageRef.current = 1
    hasMoreRef.current = true
    fetchBookings(true)
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setDateFilter('')
    fetchLock.current = false
    pageRef.current = 1
    hasMoreRef.current = true
    fetchBookings(true)
  }

  // ================= EFFECTS =================
  // ✅ FIXED: Single effect that handles all tab data fetching with proper loading
  useEffect(() => {
    const loadData = async () => {
      switch (activeTab) {
        case 'dashboard':
          await fetchDashboardMetrics()
          break
        case 'bookings':
          await fetchBookings(true)
          break
        case 'client-payments':
          await fetchClientPayments(true)
          break
        case 'vendor-payments':
          await fetchVendorPayments(true)
          break
        case 'reminders':
          // Uses bookings data, already loaded
          break
      }
    }
    loadData()
  }, [activeTab, fetchDashboardMetrics, fetchBookings, fetchClientPayments, fetchVendorPayments])

  // Cleanup observer on unmount
  useEffect(() => {
    return () => { observer.current?.disconnect() }
  }, [])

  // Infinite scroll observer
  const lastItemRef = useCallback((node: HTMLTableRowElement | null) => {
    observer.current?.disconnect()
    if (!node || (activeTab === 'bookings' ? bookingsLoading : paymentsLoading) || !hasMoreRef.current) return
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !fetchLock.current) {
        if (activeTab === 'bookings') fetchBookings()
        if (activeTab === 'client-payments') fetchClientPayments()
        if (activeTab === 'vendor-payments') fetchVendorPayments()
      }
    }, { rootMargin: '150px' })
    observer.current.observe(node)
  }, [activeTab, bookingsLoading, paymentsLoading, fetchBookings, fetchClientPayments, fetchVendorPayments])

  // ================= RENDER HELPERS =================
  const renderMetricsCard = (title: string, icon: React.ElementType, color: string, children: React.ReactNode) => (
    <div className={`bg-${color}-50 p-6 rounded-xl border border-${color}-100`}>
      <h3 className={`text-lg font-semibold text-${color}-900 mb-4 flex items-center gap-2`}>
        {React.createElement(icon, { size: 18 })} {title}
      </h3>
      {activeTab === 'dashboard' && dashboardLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />)}
        </div>
      ) : children}
    </div>
  )

  const renderPaymentTable = (payments: any[], isClient: boolean, isLoading: boolean) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-medium">
          <tr>
            <th className="px-4 py-3">Booking ID</th>
            <th className="px-4 py-3">{isClient ? 'Client' : 'Vendor'}</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">{isClient ? 'Type' : 'Vendor'}</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3">Mode</th>
            <th className="px-4 py-3">UTR</th>
            <th className="px-4 py-3">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {isLoading && payments.length === 0 ? (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading payments...</td></tr>
          ) : payments.length === 0 ? (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No payments recorded</td></tr>
          ) : payments.map((p, idx) => (
            <tr key={p.id} ref={idx === payments.length - 1 ? lastItemRef : null} className="bg-white hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-purple-600">{p.booking_id}</td>
              <td className="px-4 py-3 font-medium">{isClient ? p.client_name : p.vendor_name}</td>
              <td className="px-4 py-3">{formatDate(isClient ? p.payment_date : p.date_paid)}</td>
              <td className="px-4 py-3">
                {isClient ? <span className={getPaymentTypeStyle(p.payment_type)}>{p.payment_type}</span> : p.vendor_name}
              </td>
              <td className={`px-4 py-3 text-right font-medium ${isClient ? 'text-green-600' : 'text-amber-600'}`}>
                {formatCurrency(isClient ? p.amount : p.amount_paid)}
              </td>
              <td className="px-4 py-3">{p.payment_mode}</td>
              <td className="px-4 py-3 font-mono text-xs">{p.reference_utr || '-'}</td>
              <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]" title={p.remarks}>{p.remarks || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // ✅ FIXED: Loading check uses tab-specific loading states
  const isLoading = useMemo(() => {
    if (activeTab === 'dashboard') return dashboardLoading
    if (activeTab === 'bookings') return bookingsLoading
    if (activeTab === 'client-payments' || activeTab === 'vendor-payments') return paymentsLoading
    return false
  }, [activeTab, dashboardLoading, bookingsLoading, paymentsLoading])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    )
  }

  // ================= MAIN RENDER =================
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
            <p className="text-gray-500 mt-1">Client & Vendor Payment Tracker</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => exportToCSV('bookings')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm">
              <Download size={16} /> Export Bookings
            </button>
            <button onClick={() => exportToCSV('client')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm">
              <Download size={16} /> Export Payments
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-xl border-b border-gray-200 px-6 pt-2">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'bookings', label: 'All Bookings', icon: Building2 },
              { id: 'client-payments', label: 'Client Payments', icon: User },
              { id: 'vendor-payments', label: 'Vendor Payments', icon: CreditCard },
              { id: 'reminders', label: 'Reminders', icon: Clock }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabView)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {React.createElement(tab.icon, { size: 18 })} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-xl shadow-sm p-6 min-h-[500px]">
          
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && dashboardMetrics && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderMetricsCard('Client Revenue', User, 'blue', (
                  <>
                    <MetricRow label="Total Bookings" value={dashboardMetrics.total_bookings} />
                    <MetricRow label="Total Selling Price" value={formatCurrency(dashboardMetrics.total_selling_price)} />
                    <MetricRow label="Received from Client" value={formatCurrency(dashboardMetrics.total_received_from_client)} color="text-green-600" />
                    <MetricRow label="Client Balance Due" value={formatCurrency(dashboardMetrics.total_client_balance_due)} color="text-red-600" />
                    <MetricRow label="Fully Paid" value={dashboardMetrics.fully_paid_count} />
                    <MetricRow label="Collection Rate" value={`${Number(dashboardMetrics.collection_rate || 0).toFixed(1)}%`} />
                  </>
                ))}
                {renderMetricsCard('Vendor Costs', CreditCard, 'amber', (
                  <>
                    <MetricRow label="Total Vendor Cost" value={formatCurrency(dashboardMetrics.total_vendor_cost)} />
                    <MetricRow label="Paid to Vendors" value={formatCurrency(dashboardMetrics.total_paid_to_vendor)} color="text-green-600" />
                    <MetricRow label="Vendor Balance Due" value={formatCurrency(dashboardMetrics.total_vendor_balance_due)} color="text-red-600" />
                    <MetricRow label="Vendor Pay Rate" value={`${Number(dashboardMetrics.vendor_pay_rate || 0).toFixed(1)}%`} />
                    <MetricRow label="Overdue Reminders" value={dashboardMetrics.overdue_reminders_count} color="text-red-600" />
                  </>
                ))}
                {renderMetricsCard('Profit Analysis', TrendingUp, 'green', (
                  <>
                    <MetricRow label="Gross Profit" value={formatCurrency(dashboardMetrics.gross_profit)} />
                    <MetricRow label="Profit Margin %" value={`${(Number(dashboardMetrics.gross_profit || 0) / Number(dashboardMetrics.total_selling_price || 1) * 100).toFixed(1)}%`} />
                    <MetricRow label="Realised Profit" value={formatCurrency(dashboardMetrics.realised_profit)} color="text-green-700" />
                    <MetricRow label="Unrealised Profit" value={formatCurrency(dashboardMetrics.unrealised_profit)} color="text-gray-600" />
                    <MetricRow label="Net Cash Position" value={formatCurrency((dashboardMetrics.total_received_from_client || 0) - (dashboardMetrics.total_paid_to_vendor || 0))} />
                  </>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowClientPaymentModal(true)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium">
                  <Plus size={18} /> Add Client Payment
                </button>
                <button onClick={() => setShowVendorPaymentModal(true)} className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition font-medium">
                  <Plus size={18} /> Add Vendor Payment
                </button>
              </div>
            </div>
          )}

          {/* BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Client, vendor, or booking ID..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                    </div>
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white">
                      <option value="">All</option>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Booking Date</label>
                    <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleApplyFilters} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"><Filter size={16} /> Apply</button>
                    <button onClick={handleResetFilters} className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"><RefreshCw size={16} /> Reset</button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-3">Booking ID</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Travel Date</th>
                      <th className="px-4 py-3 text-right">Selling</th>
                      <th className="px-4 py-3 text-right">Received</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bookings.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No bookings found</td></tr>
                    ) : bookings.map((booking, idx) => (
                      <tr key={booking.booking_id} ref={idx === bookings.length - 1 ? lastItemRef : null} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-purple-600">{booking.booking_id}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{booking.client_name}</td>
                        <td className="px-4 py-3">{formatDate(booking.travel_date)}</td>
                        <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(booking.selling_price)}</td>
                        <td className="px-4 py-3 text-right text-green-600">{formatCurrency(booking.received_from_client)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatCurrency(booking.selling_price - booking.received_from_client)}</td>
                        <td className="px-4 py-3">{booking.vendor_name}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={booking.client_status} /></td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => fetchBookingDetails(booking.booking_id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View Details"><Search size={16} /></button>
                            <button onClick={() => { setClientPaymentForm(prev => ({ ...prev, bookingId: booking.booking_id, clientName: booking.client_name })); setShowClientPaymentModal(true) }} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Add Client Payment"><IndianRupee size={16} /></button>
                            <button onClick={() => { setVendorPaymentForm(prev => ({ ...prev, bookingId: booking.booking_id, clientName: booking.client_name, vendorName: booking.vendor_name })); setShowVendorPaymentModal(true) }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Add Vendor Payment"><CreditCard size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bookingsLoading && <div className="text-center py-4 text-gray-500">Loading more...</div>}
              {!hasMoreRef.current && bookings.length > 0 && <div className="text-center py-4 text-sm text-gray-400">✓ All bookings loaded</div>}
            </div>
          )}

          {/* CLIENT PAYMENTS */}
          {activeTab === 'client-payments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Client Payment Log</h3>
                <div className="flex gap-2">
                  <button onClick={() => exportToCSV('client')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"><Download size={14} /> Export</button>
                  <button onClick={() => setShowClientPaymentModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"><Plus size={16} /> Add Payment</button>
                </div>
              </div>
              {renderPaymentTable(clientPayments, true, paymentsLoading)}
            </div>
          )}

          {/* VENDOR PAYMENTS */}
          {activeTab === 'vendor-payments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Vendor Payment Log</h3>
                <div className="flex gap-2">
                  <button onClick={() => exportToCSV('vendor')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"><Download size={14} /> Export</button>
                  <button onClick={() => setShowVendorPaymentModal(true)} className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition text-sm"><Plus size={16} /> Add Payment</button>
                </div>
              </div>
              {renderPaymentTable(vendorPayments, false, paymentsLoading)}
            </div>
          )}

          {/* REMINDERS */}
          {activeTab === 'reminders' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-amber-800 font-medium flex items-center gap-2"><AlertCircle size={18} /> Auto-populated reminders based on client balances & reminder dates.</p>
              </div>
              <div className="grid gap-4">
                {bookings.filter(b => b.reminder_date && (b.selling_price - b.received_from_client) > 0).map(booking => {
                  const balance = booking.selling_price - booking.received_from_client
                  const reminderDate = new Date(booking.reminder_date!)
                  const today = new Date(); today.setHours(0,0,0,0)
                  const diffDays = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  const [urgency, label] = diffDays < 0 ? ['bg-red-100 text-red-800', `Overdue by ${Math.abs(diffDays)} days`] : diffDays <= 3 ? ['bg-amber-100 text-amber-800', 'Due soon'] : diffDays <= 7 ? ['bg-yellow-100 text-yellow-800', 'Due this week'] : ['bg-green-100 text-green-800', `Due in ${diffDays} days`]
                  return (
                    <div key={booking.booking_id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${urgency}`}><Calendar size={18} /></div>
                        <div>
                          <p className="font-semibold text-gray-900">{booking.client_name} <span className="text-xs font-mono text-purple-600 ml-2">({booking.booking_id})</span></p>
                          <p className="text-sm text-gray-500">Balance: {formatCurrency(balance)} • Reminder: {formatDate(booking.reminder_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${urgency}`}>{label}</span>
                        <button onClick={() => { setClientPaymentForm(prev => ({ ...prev, bookingId: booking.booking_id, clientName: booking.client_name })); setShowClientPaymentModal(true) }} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Record Payment"><IndianRupee size={18} /></button>
                      </div>
                    </div>
                  )
                })}
                {bookings.filter(b => b.reminder_date && (b.selling_price - b.received_from_client) > 0).length === 0 && (
                  <div className="text-center py-8 text-gray-500">No active payment reminders</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ================= MODALS (Same as before, omitted for brevity) ================= */}
      {/* Client Payment Modal */}
      {showClientPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Record Client Payment</h2>
              <button onClick={() => setShowClientPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Booking *</label>
                <select value={clientPaymentForm.bookingId} onChange={e => {
                  const b = bookings.find(x => x.booking_id === e.target.value)
                  setClientPaymentForm(prev => ({ ...prev, bookingId: e.target.value, clientName: b?.client_name || '', packageName: b?.package_name || '' }))
                }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" required>
                  <option value="">Select a booking...</option>
                  {bookings.filter(b => b.selling_price > b.received_from_client).map(b => (
                    <option key={b.booking_id} value={b.booking_id}>{b.booking_id} — {b.client_name} (Balance: {formatCurrency(b.selling_price - b.received_from_client)})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Client Name</label><input type="text" value={clientPaymentForm.clientName} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" /></div>
                <div><label className="block text-sm font-medium mb-1">Package Name</label><input type="text" value={clientPaymentForm.packageName} onChange={e => setClientPaymentForm(prev => ({ ...prev, packageName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Payment Date *</label><input type="date" value={clientPaymentForm.paymentDate} onChange={e => setClientPaymentForm(prev => ({ ...prev, paymentDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
                <div><label className="block text-sm font-medium mb-1">Payment Type *</label><select value={clientPaymentForm.paymentType} onChange={e => setClientPaymentForm(prev => ({ ...prev, paymentType: e.target.value as PaymentForm['paymentType'] }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"><option value="Advance">Advance</option><option value="Final">Final</option><option value="Refund">Refund</option><option value="Other">Other</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Amount (₹) *</label><input type="number" step="0.01" min="0" value={clientPaymentForm.amount} onChange={e => setClientPaymentForm(prev => ({ ...prev, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0.00" required /></div>
                <div><label className="block text-sm font-medium mb-1">Payment Mode *</label><select value={clientPaymentForm.paymentMode} onChange={e => setClientPaymentForm(prev => ({ ...prev, paymentMode: e.target.value as PaymentForm['paymentMode'] }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"><option value="UPI">UPI</option><option value="Bank Transfer">Bank Transfer</option><option value="Cash">Cash</option><option value="Card">Card</option><option value="Cheque">Cheque</option></select></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Reference / UTR</label><input type="text" value={clientPaymentForm.referenceUtr} onChange={e => setClientPaymentForm(prev => ({ ...prev, referenceUtr: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Transaction ID, cheque number, etc." /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Remarks</label><textarea value={clientPaymentForm.remarks} onChange={e => setClientPaymentForm(prev => ({ ...prev, remarks: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="Additional notes..." /></div>
              </div>
              {clientPaymentForm.amount && <div className="bg-blue-50 p-4 rounded-lg text-sm"><p className="font-medium text-blue-900">Payment Preview</p><p className="text-blue-700">Recording ₹{parseFloat(clientPaymentForm.amount).toLocaleString()} from {clientPaymentForm.clientName || 'Client'} via {clientPaymentForm.paymentMode} on {formatDate(clientPaymentForm.paymentDate)}</p></div>}
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowClientPaymentModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">Cancel</button>
              <button onClick={handleAddClientPayment} disabled={saving || !clientPaymentForm.bookingId || !clientPaymentForm.amount} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2">{saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</> : <><CheckCircle size={18} /> Record Payment</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Payment Modal */}
      {showVendorPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Record Vendor Payment</h2>
              <button onClick={() => setShowVendorPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Booking *</label>
                <select value={vendorPaymentForm.bookingId} onChange={e => {
                  const b = bookings.find(x => x.booking_id === e.target.value)
                  setVendorPaymentForm(prev => ({ ...prev, bookingId: e.target.value, clientName: b?.client_name || '', vendorName: b?.vendor_name || '', packageName: b?.package_name || '' }))
                }} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white" required>
                  <option value="">Select a booking...</option>
                  {bookings.filter(b => b.vendor_cost > b.paid_to_vendor).map(b => (
                    <option key={b.booking_id} value={b.booking_id}>{b.booking_id} — {b.vendor_name} (Due: {formatCurrency(b.vendor_cost - b.paid_to_vendor)})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Client Name</label><input type="text" value={vendorPaymentForm.clientName} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" /></div>
                <div><label className="block text-sm font-medium mb-1">Vendor Name *</label><input type="text" value={vendorPaymentForm.vendorName} onChange={e => setVendorPaymentForm(prev => ({ ...prev, vendorName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Taj Hotels" required /></div>
                <div><label className="block text-sm font-medium mb-1">Package Name</label><input type="text" value={vendorPaymentForm.packageName} onChange={e => setVendorPaymentForm(prev => ({ ...prev, packageName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Date Paid *</label><input type="date" value={vendorPaymentForm.datePaid} onChange={e => setVendorPaymentForm(prev => ({ ...prev, datePaid: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
                <div><label className="block text-sm font-medium mb-1">Amount Paid (₹) *</label><input type="number" step="0.01" min="0" value={vendorPaymentForm.amountPaid} onChange={e => setVendorPaymentForm(prev => ({ ...prev, amountPaid: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="0.00" required /></div>
                <div><label className="block text-sm font-medium mb-1">Payment Mode *</label><select value={vendorPaymentForm.paymentMode} onChange={e => setVendorPaymentForm(prev => ({ ...prev, paymentMode: e.target.value as VendorPaymentForm['paymentMode'] }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"><option value="UPI">UPI</option><option value="Bank Transfer">Bank Transfer</option><option value="Cash">Cash</option><option value="Card">Card</option><option value="Cheque">Cheque</option></select></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Reference / UTR</label><input type="text" value={vendorPaymentForm.referenceUtr} onChange={e => setVendorPaymentForm(prev => ({ ...prev, referenceUtr: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Transaction ID, cheque number, etc." /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Remarks</label><textarea value={vendorPaymentForm.remarks} onChange={e => setVendorPaymentForm(prev => ({ ...prev, remarks: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="Additional notes..." /></div>
              </div>
              {vendorPaymentForm.amountPaid && <div className="bg-amber-50 p-4 rounded-lg text-sm"><p className="font-medium text-amber-900">Payment Preview</p><p className="text-amber-700">Paying ₹{parseFloat(vendorPaymentForm.amountPaid).toLocaleString()} to {vendorPaymentForm.vendorName || 'Vendor'} via {vendorPaymentForm.paymentMode} on {formatDate(vendorPaymentForm.datePaid)}</p></div>}
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowVendorPaymentModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">Cancel</button>
              <button onClick={handleAddVendorPayment} disabled={saving || !vendorPaymentForm.bookingId || !vendorPaymentForm.amountPaid || !vendorPaymentForm.vendorName} className="flex-1 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2">{saving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</> : <><CheckCircle size={18} /> Record Payment</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingDetails && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <div><h2 className="text-xl font-bold">{selectedBooking.booking.client_name}</h2><p className="text-sm text-gray-500 font-mono">{selectedBooking.booking.booking_id}</p></div>
              <button onClick={() => setShowBookingDetails(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">Client Financials</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Selling Price</span><span className="font-medium">{formatCurrency(selectedBooking.booking.selling_price)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Received</span><span className="font-medium text-green-600">{formatCurrency(selectedBooking.booking.received_from_client)}</span></div>
                    <div className="flex justify-between border-t pt-2"><span className="text-gray-600">Balance Due</span><span className="font-medium text-red-600">{formatCurrency(selectedBooking.clientBalanceDue)}</span></div>
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-900 mb-3">Vendor Financials</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Vendor Cost</span><span className="font-medium">{formatCurrency(selectedBooking.booking.vendor_cost)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Paid to Vendor</span><span className="font-medium text-green-600">{formatCurrency(selectedBooking.booking.paid_to_vendor)}</span></div>
                    <div className="flex justify-between border-t pt-2"><span className="text-gray-600">Vendor Balance</span><span className="font-medium text-red-600">{formatCurrency(selectedBooking.vendorBalanceDue)}</span></div>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Client Payment History</h4>
                  <button onClick={() => { setClientPaymentForm(prev => ({ ...prev, bookingId: selectedBooking.booking.booking_id, clientName: selectedBooking.booking.client_name })); setShowClientPaymentModal(true) }} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Plus size={14} /> Add Payment</button>
                </div>
                {selectedBooking.clientPayments.length === 0 ? <p className="text-gray-500 text-sm py-4">No payments recorded yet</p> : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-left">Mode</th><th className="px-4 py-2 text-left">UTR</th></tr></thead>
                      <tbody className="divide-y">{selectedBooking.clientPayments.map(p => (<tr key={p.id}><td className="px-4 py-2">{formatDate(p.payment_date)}</td><td className="px-4 py-2"><span className={getPaymentTypeStyle(p.payment_type)}>{p.payment_type}</span></td><td className="px-4 py-2 text-right text-green-600 font-medium">{formatCurrency(p.amount)}</td><td className="px-4 py-2">{p.payment_mode}</td><td className="px-4 py-2 font-mono text-xs">{p.reference_utr || '-'}</td></tr>))}</tbody>
                    </table>
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Vendor Payment History</h4>
                  <button onClick={() => { setVendorPaymentForm(prev => ({ ...prev, bookingId: selectedBooking.booking.booking_id, clientName: selectedBooking.booking.client_name, vendorName: selectedBooking.booking.vendor_name })); setShowVendorPaymentModal(true) }} className="text-sm text-amber-600 hover:underline flex items-center gap-1"><Plus size={14} /> Add Payment</button>
                </div>
                {selectedBooking.vendorPayments.length === 0 ? <p className="text-gray-500 text-sm py-4">No payments recorded yet</p> : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Vendor</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-left">Mode</th><th className="px-4 py-2 text-left">UTR</th></tr></thead>
                      <tbody className="divide-y">{selectedBooking.vendorPayments.map(p => (<tr key={p.id}><td className="px-4 py-2">{formatDate(p.date_paid)}</td><td className="px-4 py-2">{p.vendor_name}</td><td className="px-4 py-2 text-right text-amber-600 font-medium">{formatCurrency(p.amount_paid)}</td><td className="px-4 py-2">{p.payment_mode}</td><td className="px-4 py-2 font-mono text-xs">{p.reference_utr || '-'}</td></tr>))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}