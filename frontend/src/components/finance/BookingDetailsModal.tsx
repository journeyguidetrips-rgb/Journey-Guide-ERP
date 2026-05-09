import { Plus, X } from 'lucide-react'
import { BookingWithPayments } from '../../types/finance'
import { formatCurrency, formatDate, getPaymentTypeStyle } from '../../utils/formatters'
import StatusBadge from '../shared/StatusBadge'

interface BookingDetailsModalProps {
  booking: BookingWithPayments
  onClose: () => void
  onAddClientPayment: (bookingId: string, clientName: string) => void
  onAddVendorPayment: (bookingId: string, clientName: string, vendorName: string) => void
}

export default function BookingDetailsModal({
  booking: bwp,
  onClose,
  onAddClientPayment,
  onAddVendorPayment,
}: BookingDetailsModalProps) {
  const { booking, clientPayments, vendorPayments, clientBalanceDue, vendorBalanceDue } = bwp

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold">{booking.client_name}</h2>
            <p className="text-sm text-gray-500 font-mono">{booking.booking_id}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.client_status} variant="booking" />
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-xl">
              <h4 className="font-semibold text-blue-900 mb-3">Client Financials</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Selling Price</span>
                  <span className="font-medium">{formatCurrency(booking.selling_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Received</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(booking.received_from_client)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-2">
                  <span className="text-gray-600">Balance Due</span>
                  <span className={`font-semibold ${clientBalanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(clientBalanceDue)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl">
              <h4 className="font-semibold text-amber-900 mb-3">Vendor Financials</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendor Cost</span>
                  <span className="font-medium">{formatCurrency(booking.vendor_cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Paid to Vendor</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(booking.paid_to_vendor)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-amber-200 pt-2">
                  <span className="text-gray-600">Vendor Balance</span>
                  <span className={`font-semibold ${vendorBalanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(vendorBalanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900">Client Payment History</h4>
              <button
                onClick={() => onAddClientPayment(booking.booking_id, booking.client_name)}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add Payment
              </button>
            </div>
            {clientPayments.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No payments recorded yet</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mode</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">UTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientPayments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{formatDate(p.payment_date)}</td>
                        <td className="px-4 py-2">
                          <span className={getPaymentTypeStyle(p.payment_type)}>{p.payment_type}</span>
                        </td>
                        <td className="px-4 py-2 text-right text-green-600 font-medium">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-4 py-2">{p.payment_mode}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">
                          {p.reference_utr || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900">Vendor Payment History</h4>
              <button
                onClick={() => onAddVendorPayment(booking.booking_id, booking.client_name, booking.vendor_name)}
                className="text-sm text-amber-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Add Payment
              </button>
            </div>
            {vendorPayments.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No payments recorded yet</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Vendor</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mode</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">UTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vendorPayments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">{formatDate(p.date_paid)}</td>
                        <td className="px-4 py-2">{p.vendor_name}</td>
                        <td className="px-4 py-2 text-right text-amber-600 font-medium">
                          {formatCurrency(p.amount_paid)}
                        </td>
                        <td className="px-4 py-2">{p.payment_mode}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">
                          {p.reference_utr || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
