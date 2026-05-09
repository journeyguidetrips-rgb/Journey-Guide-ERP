import { Shuffle, X } from 'lucide-react'
import { Itinerary } from '../../types/itinerary'

interface BookingFormState {
  sellingPrice: string
  vendorCost: string
  phone: string
  whatsapp: string
  travelDate: string
  guests: string
  notes: string
}

interface ConvertModalProps {
  itinerary: Itinerary
  form: BookingFormState
  onChange: (form: BookingFormState) => void
  onConfirm: () => void
  onClose: () => void
}

export default function ConvertModal({
  itinerary,
  form,
  onChange,
  onConfirm,
  onClose,
}: ConvertModalProps) {
  const set = (patch: Partial<BookingFormState>) => onChange({ ...form, ...patch })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Convert to Booking</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {itinerary.client_name} · {itinerary.vendor_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                value={form.sellingPrice}
                onChange={e => set({ sellingPrice: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vendor Cost (₹) *</label>
              <input
                type="number"
                value={form.vendorCost}
                onChange={e => set({ vendorCost: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set({ phone: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp</label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={e => set({ whatsapp: e.target.value })}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Travel Date</label>
              <input
                type="date"
                value={form.travelDate}
                onChange={e => set({ travelDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Guests</label>
              <input
                type="number"
                min="1"
                value={form.guests}
                onChange={e => set({ guests: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set({ notes: e.target.value })}
              placeholder="Special requests, preferences, etc."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="bg-purple-50 p-4 rounded-xl text-sm space-y-1">
            <p className="font-medium text-purple-900">Booking Summary</p>
            <p className="text-purple-700">
              Booking ID: <span className="font-mono">JG-XXXX (auto-generated)</span>
            </p>
            <p className="text-purple-700">
              Selling Price: ₹{form.sellingPrice ? parseFloat(form.sellingPrice).toLocaleString() : '0'}
            </p>
            <p className="text-purple-700">
              Vendor Cost: ₹{form.vendorCost ? parseFloat(form.vendorCost).toLocaleString() : '0'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!form.sellingPrice || !form.vendorCost}
            className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 text-sm"
          >
            <Shuffle size={16} /> Confirm Conversion
          </button>
        </div>
      </div>
    </div>
  )
}
