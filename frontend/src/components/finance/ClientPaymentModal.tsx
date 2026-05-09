import { CheckCircle, X } from 'lucide-react'
import { Booking, PaymentForm } from '../../types/finance'
import { formatDate } from '../../utils/formatters'

interface ClientPaymentModalProps {
  bookings: Booking[]
  form: PaymentForm
  saving: boolean
  onChange: (form: PaymentForm) => void
  onSubmit: () => void
  onClose: () => void
}

export default function ClientPaymentModal({
  bookings,
  form,
  saving,
  onChange,
  onSubmit,
  onClose,
}: ClientPaymentModalProps) {
  const set = (patch: Partial<PaymentForm>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Record Client Payment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Booking *</label>
            <select
              value={form.bookingId}
              onChange={e => {
                const b = bookings.find(x => x.booking_id === e.target.value)
                set({ bookingId: e.target.value, clientName: b?.client_name || '', packageName: b?.package_name || '' })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">Select a booking...</option>
              {bookings
                .filter(b => b.selling_price > b.received_from_client)
                .map(b => (
                  <option key={b.booking_id} value={b.booking_id}>
                    {b.booking_id} — {b.client_name} (Due: ₹{(b.selling_price - b.received_from_client).toLocaleString()})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client Name</label>
              <input
                type="text"
                value={form.clientName}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Package Name</label>
              <input
                type="text"
                value={form.packageName}
                onChange={e => set({ packageName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Date *</label>
              <input
                type="date"
                value={form.paymentDate}
                onChange={e => set({ paymentDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Type *</label>
              <select
                value={form.paymentType}
                onChange={e => set({ paymentType: e.target.value as PaymentForm['paymentType'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="Advance">Advance</option>
                <option value="Final">Final</option>
                <option value="Refund">Refund</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={e => set({ amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Mode *</label>
              <select
                value={form.paymentMode}
                onChange={e => set({ paymentMode: e.target.value as PaymentForm['paymentMode'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Reference / UTR</label>
              <input
                type="text"
                value={form.referenceUtr}
                onChange={e => set({ referenceUtr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Transaction ID, cheque number, etc."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Remarks</label>
              <textarea
                value={form.remarks}
                onChange={e => set({ remarks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {form.amount && (
            <div className="bg-blue-50 p-4 rounded-lg text-sm">
              <p className="font-medium text-blue-900">Payment Preview</p>
              <p className="text-blue-700 mt-1">
                Recording ₹{parseFloat(form.amount).toLocaleString()} from{' '}
                {form.clientName || 'Client'} via {form.paymentMode} on{' '}
                {formatDate(form.paymentDate)}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || !form.bookingId || !form.amount}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 text-sm"
          >
            {saving ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</>
            ) : (
              <><CheckCircle size={16} /> Record Payment</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
