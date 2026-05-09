import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import { useFinance } from '../hooks/useFinance'
import { postClientPayment, postVendorPayment } from '../services/bookingService'
import { useUserStore } from '../stores/userStore'
import { TabView, PaymentForm, VendorPaymentForm, Booking } from '../types/finance'
import DashboardTab from '../components/finance/DashboardTab'
import BookingsTab from '../components/finance/BookingsTab'
import PaymentsTab from '../components/finance/PaymentsTab'
import ClientPaymentModal from '../components/finance/ClientPaymentModal'
import VendorPaymentModal from '../components/finance/VendorPaymentModal'
import BookingDetailsModal from '../components/finance/BookingDetailsModal'

const TABS: { key: TabView; label: string }[] = [
  { key: 'dashboard',        label: 'Dashboard' },
  { key: 'bookings',         label: 'Bookings' },
  { key: 'client-payments',  label: 'Client Payments' },
  { key: 'vendor-payments',  label: 'Vendor Payments' },
  { key: 'reminders',        label: 'Reminders' },
]

const DEFAULT_CLIENT_FORM: PaymentForm = {
  bookingId: '', clientName: '', paymentDate: new Date().toISOString().split('T')[0],
  paymentType: 'Advance', amount: '', paymentMode: 'UPI',
  referenceUtr: '', packageName: '', remarks: '',
}

const DEFAULT_VENDOR_FORM: VendorPaymentForm = {
  bookingId: '', clientName: '', vendorName: '',
  datePaid: new Date().toISOString().split('T')[0],
  amountPaid: '', paymentMode: 'UPI',
  referenceUtr: '', packageName: '', remarks: '',
}

export default function Finance() {
  const { token } = useUserStore()

  const {
    dashboardMetrics, dashboardLoading, loadDashboard,
    bookings, bookingsLoading,
    clientPayments, vendorPayments, paymentsLoading,
    selectedBooking, setSelectedBooking,
    hasMoreRef, fetchLock,
    loadBookings, loadClientPayments, loadVendorPayments,
    loadBookingDetails,
  } = useFinance()

  const [activeTab, setActiveTab]               = useState<TabView>('dashboard')
  const [saving, setSaving]                     = useState(false)
  const [searchQuery, setSearchQuery]           = useState('')
  const [statusFilter, setStatusFilter]         = useState('')
  const [dateFilter, setDateFilter]             = useState('')
  const [showClientModal, setShowClientModal]   = useState(false)
  const [showVendorModal, setShowVendorModal]   = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [clientForm, setClientForm]             = useState<PaymentForm>(DEFAULT_CLIENT_FORM)
  const [vendorForm, setVendorForm]             = useState<VendorPaymentForm>(DEFAULT_VENDOR_FORM)

  useEffect(() => {
    switch (activeTab) {
      case 'dashboard':        loadDashboard();          break
      case 'bookings':         loadBookings(true);       break
      case 'client-payments':  loadClientPayments(true); break
      case 'vendor-payments':  loadVendorPayments(true); break
    }
  }, [activeTab])

  const handleRowClick = useCallback(async (bookingId: string) => {
    const result = await loadBookingDetails(bookingId)
    if (result) setShowDetailsModal(true)
  }, [loadBookingDetails])

  const handleAddClientPayment = useCallback((booking: Booking) => {
    setClientForm(prev => ({
      ...prev,
      bookingId: booking.booking_id,
      clientName: booking.client_name,
      packageName: booking.package_name || '',
    }))
    setShowClientModal(true)
  }, [])

  const handleAddVendorPayment = useCallback((booking: Booking) => {
    setVendorForm(prev => ({
      ...prev,
      bookingId: booking.booking_id,
      clientName: booking.client_name,
      vendorName: booking.vendor_name,
      packageName: booking.package_name || '',
    }))
    setShowVendorModal(true)
  }, [])

  const handleSubmitClientPayment = async () => {
    if (!clientForm.bookingId || !clientForm.amount) {
      toast.error('Please fill required fields')
      return
    }
    setSaving(true)
    try {
      await postClientPayment(token!, clientForm.bookingId, {
        ...clientForm,
        amount: parseFloat(clientForm.amount),
      })
      toast.success('Client payment recorded!')
      setShowClientModal(false)
      setClientForm(DEFAULT_CLIENT_FORM)
      loadBookings(true)
      if (selectedBooking?.booking.booking_id === clientForm.bookingId) {
        loadBookingDetails(clientForm.bookingId)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add payment')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitVendorPayment = async () => {
    if (!vendorForm.bookingId || !vendorForm.amountPaid || !vendorForm.vendorName) {
      toast.error('Please fill required fields')
      return
    }
    setSaving(true)
    try {
      await postVendorPayment(token!, vendorForm.bookingId, {
        ...vendorForm,
        amountPaid: parseFloat(vendorForm.amountPaid),
      })
      toast.success('Vendor payment recorded!')
      setShowVendorModal(false)
      setVendorForm(DEFAULT_VENDOR_FORM)
      loadBookings(true)
      if (selectedBooking?.booking.booking_id === vendorForm.bookingId) {
        loadBookingDetails(vendorForm.bookingId)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add payment')
    } finally {
      setSaving(false)
    }
  }

  const exportToCSV = (type: 'bookings' | 'client' | 'vendor') => {
    const rows = {
      bookings: {
        data: bookings,
        headers: ['Booking ID', 'Client', 'Vendor', 'Selling', 'Received', 'Balance', 'Status'],
        map: (b: any) => [b.booking_id, b.client_name, b.vendor_name, b.selling_price, b.received_from_client, b.selling_price - b.received_from_client, b.client_status],
      },
      client: {
        data: clientPayments,
        headers: ['Booking ID', 'Client', 'Date', 'Type', 'Amount', 'Mode', 'UTR'],
        map: (p: any) => [p.booking_id, p.client_name, p.payment_date, p.payment_type, p.amount, p.payment_mode, p.reference_utr],
      },
      vendor: {
        data: vendorPayments,
        headers: ['Booking ID', 'Client', 'Vendor', 'Date', 'Amount', 'Mode', 'UTR'],
        map: (p: any) => [p.booking_id, p.client_name, p.vendor_name, p.date_paid, p.amount_paid, p.payment_mode, p.reference_utr],
      },
    }[type]

    const csv = [rows.headers.join(','), ...rows.data.map((r: any) => rows.map(r).join(','))].join('\n')
    const link = document.createElement('a')
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    link.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success('Report exported')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
            <p className="text-gray-500 mt-1">Client & Vendor Payment Tracker</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => exportToCSV('bookings')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm text-sm"
            >
              <Download size={15} /> Export Bookings
            </button>
            <button
              onClick={() => exportToCSV('client')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition shadow-sm text-sm"
            >
              <Download size={15} /> Export Payments
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 shadow-sm overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <DashboardTab metrics={dashboardMetrics} loading={dashboardLoading} />
        )}

        {activeTab === 'bookings' && (
          <BookingsTab
            bookings={bookings}
            loading={bookingsLoading}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            dateFilter={dateFilter}
            hasMoreRef={hasMoreRef}
            fetchLock={fetchLock}
            onSearchChange={setSearchQuery}
            onStatusChange={setStatusFilter}
            onDateChange={setDateFilter}
            onApplyFilters={() => { fetchLock.current = false; loadBookings(true) }}
            onResetFilters={() => { setSearchQuery(''); setStatusFilter(''); setDateFilter(''); fetchLock.current = false; loadBookings(true) }}
            onFetchMore={() => loadBookings(false)}
            onRowClick={handleRowClick}
            onAddClientPayment={handleAddClientPayment}
            onAddVendorPayment={handleAddVendorPayment}
          />
        )}

        {activeTab === 'client-payments' && (
          <PaymentsTab
            payments={clientPayments}
            isClient={true}
            loading={paymentsLoading}
            hasMoreRef={hasMoreRef}
            fetchLock={fetchLock}
            onFetchMore={() => loadClientPayments(false)}
          />
        )}

        {activeTab === 'vendor-payments' && (
          <PaymentsTab
            payments={vendorPayments}
            isClient={false}
            loading={paymentsLoading}
            hasMoreRef={hasMoreRef}
            fetchLock={fetchLock}
            onFetchMore={() => loadVendorPayments(false)}
          />
        )}

        {activeTab === 'reminders' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Upcoming Reminders</h2>
            {bookings.filter(b => b.reminder_date).length === 0 ? (
              <p className="text-gray-500 text-sm">No reminders set</p>
            ) : (
              <div className="space-y-3">
                {bookings
                  .filter(b => b.reminder_date)
                  .sort((a, b) => new Date(a.reminder_date!).getTime() - new Date(b.reminder_date!).getTime())
                  .map(b => (
                    <div key={b.booking_id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                      <div>
                        <p className="font-medium text-gray-900">{b.client_name}</p>
                        <p className="text-sm text-gray-500 font-mono">{b.booking_id}</p>
                      </div>
                      <p className="text-sm text-yellow-700 font-medium">{b.reminder_date}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showClientModal && (
        <ClientPaymentModal
          bookings={bookings}
          form={clientForm}
          saving={saving}
          onChange={setClientForm}
          onSubmit={handleSubmitClientPayment}
          onClose={() => setShowClientModal(false)}
        />
      )}

      {showVendorModal && (
        <VendorPaymentModal
          bookings={bookings}
          form={vendorForm}
          saving={saving}
          onChange={setVendorForm}
          onSubmit={handleSubmitVendorPayment}
          onClose={() => setShowVendorModal(false)}
        />
      )}

      {showDetailsModal && selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => { setShowDetailsModal(false); setSelectedBooking(null) }}
          onAddClientPayment={(bookingId, clientName) => {
            setClientForm(prev => ({ ...prev, bookingId, clientName }))
            setShowClientModal(true)
          }}
          onAddVendorPayment={(bookingId, clientName, vendorName) => {
            setVendorForm(prev => ({ ...prev, bookingId, clientName, vendorName }))
            setShowVendorModal(true)
          }}
        />
      )}
    </div>
  )
}
