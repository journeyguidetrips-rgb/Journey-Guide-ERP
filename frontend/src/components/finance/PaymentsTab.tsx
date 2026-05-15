import { useCallback, useRef } from 'react'
import { FileDown, Pencil } from 'lucide-react'
import { ClientPayment, VendorPayment } from '../../types/finance'
import { formatCurrency, formatDate, getPaymentTypeStyle } from '../../utils/formatters'

interface PaymentsTabProps {
  payments: ClientPayment[] | VendorPayment[]
  isClient: boolean
  loading: boolean
  hasMoreRef: React.MutableRefObject<boolean>
  fetchLock: React.MutableRefObject<boolean>
  onFetchMore: () => void
  onRowClick: (payment: ClientPayment | VendorPayment) => void
  onDownloadReceipt?: (paymentId: number, bookingId: string) => void
}

export default function PaymentsTab({
  payments,
  isClient,
  loading,
  hasMoreRef,
  fetchLock,
  onFetchMore,
  onRowClick,
  onDownloadReceipt,
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

  const clientColSpan = isClient ? 9 : 8

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
            <th className="px-4 py-3 text-center">{isClient ? 'Actions' : 'Edit'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading && payments.length === 0 ? (
            <tr>
              <td colSpan={clientColSpan} className="px-4 py-10 text-center text-gray-500">
                Loading payments...
              </td>
            </tr>
          ) : payments.length === 0 ? (
            <tr>
              <td colSpan={clientColSpan} className="px-4 py-10 text-center text-gray-500">
                No payments recorded yet
              </td>
            </tr>
          ) : (
            payments.map((p: any, idx) => (
              <tr
                key={p.id}
                ref={idx === payments.length - 1 ? lastRowRef : null}
                className="bg-white hover:bg-gray-50 transition cursor-pointer"
                onClick={() => onRowClick(p)}
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
                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => onRowClick(p)}
                      title="Edit payment"
                      className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                    >
                      <Pencil size={14} />
                    </button>
                    {isClient && (
                      <button
                        onClick={() => onDownloadReceipt?.(p.id, p.booking_id)}
                        title="Download Receipt PDF"
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <FileDown size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
