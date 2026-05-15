import { useState, useEffect } from 'react'
import { X, Save, History } from 'lucide-react'
import axios from 'axios'
import { ClientPayment, VendorPayment } from '../../types/finance'
import { formatCurrency, formatDate, getPaymentTypeStyle } from '../../utils/formatters'
import { useUserStore } from '../../stores/userStore'

interface PaymentDetailModalProps {
  payment: ClientPayment | VendorPayment
  isClient: boolean
  saving: boolean
  onSave: (paymentId: number, bookingId: string, data: Record<string, unknown>) => Promise<void>
  onClose: () => void
}

type ClientForm = {
  clientName: string
  paymentDate: string
  paymentType: ClientPayment['payment_type']
  amount: string
  paymentMode: ClientPayment['payment_mode']
  referenceUtr: string
  packageName: string
  remarks: string
}

type VendorForm = {
  clientName: string
  vendorName: string
  datePaid: string
  amountPaid: string
  paymentMode: VendorPayment['payment_mode']
  referenceUtr: string
  packageName: string
  remarks: string
}

export default function PaymentDetailModal({
  payment,
  isClient,
  saving,
  onSave,
  onClose,
}: PaymentDetailModalProps) {
  const { token } = useUserStore()
  const p = payment as any

  const [clientForm, setClientForm] = useState<ClientForm>({
    clientName:   p.client_name ?? '',
    paymentDate:  p.payment_date ? p.payment_date.split('T')[0] : '',
    paymentType:  p.payment_type ?? 'Advance',
    amount:       String(p.amount ?? ''),
    paymentMode:  p.payment_mode ?? 'UPI',
    referenceUtr: p.reference_utr ?? '',
    packageName:  p.package_name ?? '',
    remarks:      p.remarks ?? '',
  })

  const [vendorForm, setVendorForm] = useState<VendorForm>({
    clientName:   p.client_name ?? '',
    vendorName:   p.vendor_name ?? '',
    datePaid:     p.date_paid ? p.date_paid.split('T')[0] : '',
    amountPaid:   String(p.amount_paid ?? ''),
    paymentMode:  p.payment_mode ?? 'UPI',
    referenceUtr: p.reference_utr ?? '',
    packageName:  p.package_name ?? '',
    remarks:      p.remarks ?? '',
  })

  const setC = (patch: Partial<ClientForm>) => setClientForm(f => ({ ...f, ...patch }))
  const setV = (patch: Partial<VendorForm>) => setVendorForm(f => ({ ...f, ...patch }))

  // Last 5 payments for the same booking
  const [history, setHistory] = useState<{ clientPayments: ClientPayment[]; vendorPayments: VendorPayment[] } | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get(`/api/bookings/${p.booking_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setHistory({ clientPayments: data.clientPayments, vendorPayments: data.vendorPayments })
      } catch {
        setHistory(null)
      } finally {
        setHistoryLoading(false)
      }
    }
    fetchHistory()
  }, [p.booking_id, token])

  const handleSave = async () => {
    if (isClient) {
      await onSave(p.id, p.booking_id, {
        clientName:   clientForm.clientName,
        paymentDate:  clientForm.paymentDate,
        paymentType:  clientForm.paymentType,
        amount:       parseFloat(clientForm.amount) || 0,
        paymentMode:  clientForm.paymentMode,
        referenceUtr: clientForm.referenceUtr || null,
        packageName:  clientForm.packageName || null,
        remarks:      clientForm.remarks || null,
      })
    } else {
      await onSave(p.id, p.booking_id, {
        clientName:  vendorForm.clientName,
        vendorName:  vendorForm.vendorName,
        datePaid:    vendorForm.datePaid,
        amountPaid:  parseFloat(vendorForm.amountPaid) || 0,
        paymentMode: vendorForm.paymentMode,
        referenceUtr: vendorForm.referenceUtr || null,
        packageName:  vendorForm.packageName || null,
        remarks:      vendorForm.remarks || null,
      })
    }
  }

  const accentColor = isClient ? 'blue' : 'amber'
  const historyList = isClient ? (history?.clientPayments ?? []) : (history?.vendorPayments ?? [])
  const last5 = historyList.slice(0, 5)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Edit {isClient ? 'Client' : 'Vendor'} Payment</h2>
            <p className="text-sm text-gray-500 font-mono mt-0.5">{p.booking_id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Editable Fields */}
          {isClient ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                <input
                  type="text"
                  value={clientForm.clientName}
                  onChange={e => setC({ clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={clientForm.paymentDate}
                  onChange={e => setC({ paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Type *</label>
                <select
                  value={clientForm.paymentType}
                  onChange={e => setC({ paymentType: e.target.value as ClientForm['paymentType'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Advance">Advance</option>
                  <option value="Final">Final</option>
                  <option value="Refund">Refund</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={clientForm.amount}
                  onChange={e => setC({ amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode *</label>
                <select
                  value={clientForm.paymentMode}
                  onChange={e => setC({ paymentMode: e.target.value as ClientForm['paymentMode'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference / UTR</label>
                <input
                  type="text"
                  value={clientForm.referenceUtr}
                  onChange={e => setC({ referenceUtr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Transaction ID..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Package Name</label>
                <input
                  type="text"
                  value={clientForm.packageName}
                  onChange={e => setC({ packageName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <input
                  type="text"
                  value={clientForm.remarks}
                  onChange={e => setC({ remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                <input
                  type="text"
                  value={vendorForm.clientName}
                  onChange={e => setV({ clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendor Name *</label>
                <input
                  type="text"
                  value={vendorForm.vendorName}
                  onChange={e => setV({ vendorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date Paid *</label>
                <input
                  type="date"
                  value={vendorForm.datePaid}
                  onChange={e => setV({ datePaid: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={vendorForm.amountPaid}
                  onChange={e => setV({ amountPaid: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode *</label>
                <select
                  value={vendorForm.paymentMode}
                  onChange={e => setV({ paymentMode: e.target.value as VendorForm['paymentMode'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference / UTR</label>
                <input
                  type="text"
                  value={vendorForm.referenceUtr}
                  onChange={e => setV({ referenceUtr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                  placeholder="Transaction ID..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Package Name</label>
                <input
                  type="text"
                  value={vendorForm.packageName}
                  onChange={e => setV({ packageName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                <input
                  type="text"
                  value={vendorForm.remarks}
                  onChange={e => setV({ remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Last 5 payments for this booking */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History size={15} className="text-gray-500" />
              <h4 className="font-semibold text-gray-800 text-sm">
                Last 5 {isClient ? 'Client' : 'Vendor'} Payments — Booking {p.booking_id}
              </h4>
            </div>
            {historyLoading ? (
              <p className="text-sm text-gray-500 py-2">Loading history...</p>
            ) : last5.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No other payments recorded for this booking.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                      {isClient && <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>}
                      {!isClient && <th className="px-3 py-2 text-left font-medium text-gray-500">Vendor</th>}
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Mode</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">UTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {last5.map((hp: any) => (
                      <tr
                        key={hp.id}
                        className={`${hp.id === p.id ? `bg-${accentColor}-50` : 'bg-white'}`}
                      >
                        <td className="px-3 py-2">{formatDate(isClient ? hp.payment_date : hp.date_paid)}</td>
                        {isClient && (
                          <td className="px-3 py-2">
                            <span className={getPaymentTypeStyle(hp.payment_type)}>{hp.payment_type}</span>
                          </td>
                        )}
                        {!isClient && <td className="px-3 py-2">{hp.vendor_name}</td>}
                        <td className={`px-3 py-2 text-right font-medium ${isClient ? 'text-green-600' : 'text-amber-600'}`}>
                          {formatCurrency(isClient ? hp.amount : hp.amount_paid)}
                          {hp.id === p.id && <span className="ml-1 text-gray-400">(this)</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{hp.payment_mode}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{hp.reference_utr || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 py-2 text-white rounded-lg transition disabled:opacity-50 font-medium flex items-center justify-center gap-2 text-sm ${
              isClient ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {saving ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</>
            ) : (
              <><Save size={15} /> Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
