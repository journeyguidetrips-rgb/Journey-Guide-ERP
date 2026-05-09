import { useCallback, useRef } from 'react'
import { Search, RefreshCw, Plus } from 'lucide-react'
import { Booking } from '../../types/finance'
import { formatCurrency, formatDate, getStatusStyle } from '../../utils/formatters'
import StatusBadge from '../shared/StatusBadge'

interface BookingsTabProps {
  bookings: Booking[]
  loading: boolean
  searchQuery: string
  statusFilter: string
  dateFilter: string
  hasMoreRef: React.MutableRefObject<boolean>
  fetchLock: React.MutableRefObject<boolean>
  onSearchChange: (v: string) => void
  onStatusChange: (v: string) => void
  onDateChange: (v: string) => void
  onApplyFilters: () => void
  onResetFilters: () => void
  onFetchMore: () => void
  onRowClick: (bookingId: string) => void
  onAddClientPayment: (booking: Booking) => void
  onAddVendorPayment: (booking: Booking) => void
}

export default function BookingsTab({
  bookings,
  loading,
  searchQuery,
  statusFilter,
  dateFilter,
  hasMoreRef,
  fetchLock,
  onSearchChange,
  onStatusChange,
  onDateChange,
  onApplyFilters,
  onResetFilters,
  onFetchMore,
  onRowClick,
  onAddClientPayment,
  onAddVendorPayment,
}: BookingsTabProps) {
  const observer = useRef<IntersectionObserver | null>(null)

  const lastRowRef = useCallback((node: HTMLTableRowElement | null) => {
    observer.current?.disconnect()
    if (!node || loading || !hasMoreRef.current) return
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !fetchLock.current) onFetchMore()
    }, { rootMargin: '150px' })
    observer.current.observe(node)
  }, [loading, hasMoreRef, fetchLock, onFetchMore])

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search Client</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Client or booking ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => onStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-sm"
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
              value={dateFilter}
              onChange={e => onDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onApplyFilters}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
            >
              <Search size={14} /> Search
            </button>
            <button
              onClick={onResetFilters}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Selling</th>
              <th className="px-4 py-3 text-right">Received</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && bookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                  Loading bookings...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                  No bookings found
                </td>
              </tr>
            ) : (
              bookings.map((b, idx) => {
                const balance = b.selling_price - b.received_from_client
                return (
                  <tr
                    key={b.booking_id}
                    ref={idx === bookings.length - 1 ? lastRowRef : null}
                    className="bg-white hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => onRowClick(b.booking_id)}
                  >
                    <td className="px-4 py-3 font-mono text-purple-600 font-medium">
                      {b.booking_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{b.client_name}</td>
                    <td className="px-4 py-3 text-gray-600">{b.vendor_name}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(b.date_of_booking)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(b.selling_price)}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">
                      {formatCurrency(b.received_from_client)}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(balance)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.client_status} variant="booking" />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => onAddClientPayment(b)}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                        >
                          <Plus size={12} className="inline" /> Client
                        </button>
                        <button
                          onClick={() => onAddVendorPayment(b)}
                          className="px-2 py-1 text-xs bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition"
                        >
                          <Plus size={12} className="inline" /> Vendor
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
