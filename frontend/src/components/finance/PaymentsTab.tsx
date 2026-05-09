import { useCallback, useRef } from 'react'
import { ClientPayment, VendorPayment } from '../../types/finance'
import { formatCurrency, formatDate, getPaymentTypeStyle } from '../../utils/formatters'

interface PaymentsTabProps {
  payments: ClientPayment[] | VendorPayment[]
  isClient: boolean
  loading: boolean
  hasMoreRef: React.MutableRefObject<boolean>
  fetchLock: React.MutableRefObject<boolean>
  onFetchMore: () => void
}

export default function PaymentsTab({
  payments,
  isClient,
  loading,
  hasMoreRef,
  fetchLock,
  onFetchMore,
}: PaymentsTabProps) {
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
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3">Booking ID</th>
            <th className="px-4 py-3">{isClient ? 'Client' : 'Vendor'}</th>
            <th className="px-4 py-3">Date</th>
            {isClient && <th className="px-4 py-3">Type</th>}
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3">Mode</th>
            <th className="px-4 py-3">UTR / Ref</th>
            <th className="px-4 py-3">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading && payments.length === 0 ? (
            <tr>
              <td colSpan={isClient ? 8 : 7} className="px-4 py-10 text-center text-gray-500">
                Loading payments...
              </td>
            </tr>
          ) : payments.length === 0 ? (
            <tr>
              <td colSpan={isClient ? 8 : 7} className="px-4 py-10 text-center text-gray-500">
                No payments recorded yet
              </td>
            </tr>
          ) : (
            payments.map((p: any, idx) => (
              <tr
                key={p.id}
                ref={idx === payments.length - 1 ? lastRowRef : null}
                className="bg-white hover:bg-gray-50 transition"
              >
                <td className="px-4 py-3 font-mono text-purple-600 font-medium">{p.booking_id}</td>
                <td className="px-4 py-3 font-medium">
                  {isClient ? p.client_name : p.vendor_name}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatDate(isClient ? p.payment_date : p.date_paid)}
                </td>
                {isClient && (
                  <td className="px-4 py-3">
                    <span className={getPaymentTypeStyle(p.payment_type)}>{p.payment_type}</span>
                  </td>
                )}
                <td className={`px-4 py-3 text-right font-medium ${isClient ? 'text-green-600' : 'text-amber-600'}`}>
                  {formatCurrency(isClient ? p.amount : p.amount_paid)}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.payment_mode}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {p.reference_utr || '-'}
                </td>
                <td
                  className="px-4 py-3 text-gray-500 truncate max-w-[140px]"
                  title={p.remarks}
                >
                  {p.remarks || '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
