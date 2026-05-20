import { useState, useEffect, useRef } from 'react'
import { Save, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchSettings, saveSettings, OrgSettings } from '../services/settingsService'

const DEFAULT_SETTINGS: OrgSettings = {
  companyName: '',
  logoData: null,
  accountName: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
  address: '',
  phone: '',
  email: '',
  terms: '',
}

export default function Settings() {
  const [form, setForm] = useState<OrgSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    console.log("Settings component mounted");
    fetchSettings()
      .then(setForm)
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const set = (field: keyof OrgSettings, value: string | null) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 512 * 1024) {
      toast.error('Logo must be smaller than 512 KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => set('logoData', reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveSettings(form)
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading settings…
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Agency Settings</h1>

      {/* Company Info */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">Company Information</h2>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Company Name</label>
          <input
            type="text"
            value={form.companyName}
            onChange={e => set('companyName', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Journey Guide"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
          <textarea
            value={form.address}
            onChange={e => set('address', e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="123 Main Street, City, State - 000000"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="info@yourcompany.com"
            />
          </div>
        </div>
      </section>

      {/* Logo */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">Logo</h2>

        {form.logoData ? (
          <div className="flex items-center gap-4">
            <img
              src={form.logoData}
              alt="Logo preview"
              className="h-16 object-contain border border-gray-200 rounded p-1"
            />
            <button
              onClick={() => {
                set('logoData', null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
            >
              <X size={16} /> Remove
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No logo uploaded — the default template logo will be used.</p>
        )}

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <Upload size={16} />
            {form.logoData ? 'Replace Logo' : 'Upload Logo'}
          </button>
          <p className="text-xs text-gray-400 mt-1">PNG or JPG, max 512 KB</p>
        </div>
      </section>

      {/* Bank Details */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">Bank Account Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Account Name</label>
            <input
              type="text"
              value={form.accountName}
              onChange={e => set('accountName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Journey Guide"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Account Number</label>
            <input
              type="text"
              value={form.accountNumber}
              onChange={e => set('accountNumber', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="00000000000000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">IFSC Code</label>
            <input
              type="text"
              value={form.ifscCode}
              onChange={e => set('ifscCode', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ABCD0001234"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">UPI ID</label>
            <input
              type="text"
              value={form.upiId}
              onChange={e => set('upiId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="yourname@bank"
            />
          </div>
        </div>
      </section>

      {/* Terms & Conditions */}
      <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">Terms &amp; Conditions</h2>
        <p className="text-sm text-gray-500">
          These terms appear on every payment receipt. Use new lines to separate points.
          Leave blank to use the default terms.
        </p>
        <textarea
          value={form.terms}
          onChange={e => set('terms', e.target.value)}
          rows={8}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`1. This receipt is valid as proof of payment for the above-mentioned tour package only.\n2. The balance amount must be paid 15 days prior to the tour start date.\n3. All payments are non-refundable as per the cancellation policy shared at the time of booking.`}
        />
      </section>

      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <Save size={18} />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
