import { useState } from 'react'
import { Plus, X, Pencil, Save } from 'lucide-react'
import { BookingWithPayments, Booking } from '../../types/finance'
import { formatCurrency, formatDate, getPaymentTypeStyle } from '../../utils/formatters'
import StatusBadge from '../shared/StatusBadge'

interface BookingDetailsModalProps {
  booking: BookingWithPayments
  onClose: () => void
  onAddClientPayment: (bookingId: string, clientName: string) => void
  onAddVendorPayment: (bookingId: string, clientName: string, vendorName: string) => void
  onUpdateBooking: (bookingId: string, data: Partial<Booking>) => Promise<void>
}

type EditForm = {
  client_name: string
  vendor_name: string
  phone: string
  whatsapp: string
  package_name: string
  travel_date: string
  guests: string
  selling_price: string
  vendor_cost: string
  notes: string
  client_status: Booking['client_status']
  reminder_date: string
}

function toEditForm(b: Booking): EditForm {
  return {
    client_name:   b.client_name ?? '',
    vendor_name:   b.vendor_name ?? '',
    phone:         b.phone ?? '',
    whatsapp:      b.whatsapp ?? '',
    package_name:  b.package_name ?? '',
    travel_date:   b.travel_date ? b.travel_date.split('T')[0] : '',
    guests:        String(b.guests ?? 1),
    selling_price: String(b.selling_price ?? ''),
    vendor_cost:   String(b.vendor_cost ?? ''),
    notes:         b.notes ?? '',
    client_status: b.client_status,
    reminder_date: b.reminder_date ? b.reminder_date.split('T')[0] : '',
  }
}

export default function BookingDetailsModal({
  booking: bwp,
  onClose,
  onAddClientPayment,
  onAddVendorPayment,
  onUpdateBooking,
}: BookingDetailsModalProps) {
  const { booking, clientPayments, vendorPayments, clientBalanceDue, vendorBalanceDue } = bwp

  const [editMode, setEditMode] = useState(false)
  const [form, setForm]         = useState<EditForm>(() => toEditForm(booking))
  const [saving, setSaving]     = useState(false)

  const set = (patch: Partial<EditForm>) => setForm(f => ({ ...f, ...patch }))

  const handleEdit = () => {
    setForm(toEditForm(booking))
    setEditMode(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdateBooking(booking.booking_id, {
        client_name:   form.client_name,
        vendor_name:   form.vendor_name,
        phone:         form.phone || undefined,
        whatsapp:      form.whatsapp || undefined,
        package_name:  form.package_name || undefined,
        travel_date:   form.travel_date || undefined,
        guests:        parseInt(form.guests) || 1,
        selling_price: parseFloat(form.selling_price) || 0,
        vendor_cost:   parseFloat(form.vendor_cost) || 0,
        notes:         form.notes || undefined,
        client_status: form.client_status,
        reminder_date: form.reminder_date || undefined,
      } as any)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold">
              {editMode ? 'Editing Booking' : booking.client_name}
            </h2>
            <p className="text-sm text-gray-500 font-mono">{booking.booking_id}</p>
          </div>
          <div className="flex items-center gap-2">
            {!editMode && <StatusBadge status={booking.client_status} variant="booking" />}
            {editMode ? (
              <>
                <button
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <Pencil size={14} /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg ml-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Edit Form */}
          {editMode ? (
            <div className="border border-blue-200 rounded-xl p-5 bg-blue-50/30">
              <h4 className="font-semibold text-gray-800 mb-4">Booking Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client Name *</label>
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={e => set({ client_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    value={form.vendor_name}
                    onChange={e => set({ vendor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="XXXXXXXXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={e => set({ whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="XXXXXXXXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Package Name</label>
                  <input
                    type="text"
                    value={form.package_name}
                    onChange={e => set({ package_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={form.client_status}
                    onChange={e => set({ client_status: e.target.value as EditForm['client_status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Travel Date</label>
                  <input
                    type="date"
                    value={form.travel_date}
                    onChange={e => set({ travel_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={form.guests}
                    onChange={e => set({ guests: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={form.selling_price}
                    onChange={e => set({ selling_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Cost (₹)</label>
                  <input
                    type="number"
                    value={form.vendor_cost}
                    onChange={e => set({ vendor_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reminder Date</label>
                  <input
                    type="date"
                    value={form.reminder_date}
                    onChange={e => set({ reminder_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => set({ notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* View mode: booking info summary */
            <div className="grid grid-cols-3 gap-3 text-sm bg-gray-50 rounded-xl p-4">
              <div><span className="text-gray-500">Vendor</span><p className="font-medium">{booking.vendor_name || '-'}</p></div>
              <div><span className="text-gray-500">Package</span><p className="font-medium">{booking.package_name || '-'}</p></div>
              <div><span className="text-gray-500">Guests</span><p className="font-medium">{booking.guests}</p></div>
              <div><span className="text-gray-500">Travel Date</span><p className="font-medium">{booking.travel_date ? formatDate(booking.travel_date) : '-'}</p></div>
              <div><span className="text-gray-500">Phone</span><p className="font-medium">{booking.phone || '-'}</p></div>
              <div><span className="text-gray-500">WhatsApp</span><p className="font-medium">{booking.whatsapp || '-'}</p></div>
              {booking.notes && (
                <div className="col-span-3"><span className="text-gray-500">Notes</span><p className="font-medium">{booking.notes}</p></div>
              )}
            </div>
          )}

          {/* Financials */}
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
                  <span className="font-medium text-green-600">{formatCurrency(booking.received_from_client)}</span>
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
                  <span className="font-medium text-green-600">{formatCurrency(booking.paid_to_vendor)}</span>
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

          {/* Client Payment History */}
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

          {/* Vendor Payment History */}
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
