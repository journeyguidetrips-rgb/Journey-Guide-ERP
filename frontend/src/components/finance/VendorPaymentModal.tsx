import { CheckCircle, X } from 'lucide-react'
import { Booking, VendorPaymentForm } from '../../types/finance'
import { formatCurrency, formatDate } from '../../utils/formatters'

interface VendorPaymentModalProps {
  bookings: Booking[]
  form: VendorPaymentForm
  saving: boolean
  onChange: (form: VendorPaymentForm) => void
  onSubmit: () => void
  onClose: () => void
}

export default function VendorPaymentModal({
  bookings,
  form,
  saving,
  onChange,
  onSubmit,
  onClose,
}: VendorPaymentModalProps) {
  const set = (patch: Partial<VendorPaymentForm>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Record Vendor Payment</h2>
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
                set({
                  bookingId: e.target.value,
                  clientName: b?.client_name || '',
                  vendorName: b?.vendor_name || '',
                  packageName: b?.package_name || '',
                })
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white text-sm"
              required
            >
              <option value="">Select a booking...</option>
              {bookings
                .filter(b => b.vendor_cost > b.paid_to_vendor)
                .map(b => (
                  <option key={b.booking_id} value={b.booking_id}>
                    {b.booking_id} — {b.vendor_name} (Due: {formatCurrency(b.vendor_cost - b.paid_to_vendor)})
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
              <label className="block text-sm font-medium mb-1">Vendor Name *</label>
              <input
                type="text"
                value={form.vendorName}
                onChange={e => set({ vendorName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g., Taj Hotels"
                required
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
              <label className="block text-sm font-medium mb-1">Date Paid *</label>
              <input
                type="date"
                value={form.datePaid}
                onChange={e => set({ datePaid: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount Paid (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amountPaid}
                onChange={e => set({ amountPaid: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Mode *</label>
              <select
                value={form.paymentMode}
                onChange={e => set({ paymentMode: e.target.value as VendorPaymentForm['paymentMode'] })}
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

          {form.amountPaid && (
            <div className="bg-amber-50 p-4 rounded-lg text-sm">
              <p className="font-medium text-amber-900">Payment Preview</p>
              <p className="text-amber-700 mt-1">
                Paying ₹{parseFloat(form.amountPaid).toLocaleString()} to{' '}
                {form.vendorName || 'Vendor'} via {form.paymentMode} on{' '}
                {formatDate(form.datePaid)}
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
            disabled={saving || !form.bookingId || !form.amountPaid || !form.vendorName}
            className="flex-1 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 text-sm"
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
