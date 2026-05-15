import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUserStore } from '../stores/userStore'
import { fetchVendors, createVendor, updateVendor, deleteVendor } from '../services/vendorService'
import { Vendor, VendorContact } from '../types/vendor'

const EMPTY_CONTACT: VendorContact = {
  contact_name: '',
  designation: '',
  phone: '',
  whatsapp: '',
  email: '',
}

interface VendorForm {
  name: string
  location: string
  contacts: VendorContact[]
}

const DEFAULT_FORM: VendorForm = {
  name: '',
  location: '',
  contacts: [{ ...EMPTY_CONTACT }],
}

export default function Vendors() {
  const { token } = useUserStore()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [form, setForm] = useState<VendorForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await fetchVendors(token!)
      setVendors(data.vendors)
    } catch {
      toast.error('Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openAdd = () => {
    setEditingVendor(null)
    setForm(DEFAULT_FORM)
    setShowModal(true)
  }

  const openEdit = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setForm({
      name: vendor.name,
      location: vendor.location || '',
      contacts:
        vendor.contacts.length > 0
          ? vendor.contacts.map(c => ({ ...c }))
          : [{ ...EMPTY_CONTACT }],
    })
    setShowModal(true)
  }

  const handleDelete = async (vendor: Vendor) => {
    if (!window.confirm(`Delete vendor "${vendor.name}"? This cannot be undone.`)) return
    try {
      await deleteVendor(token!, vendor.id)
      toast.success('Vendor deleted')
      load()
    } catch {
      toast.error('Failed to delete vendor')
    }
  }

  const setContact = (idx: number, patch: Partial<VendorContact>) => {
    setForm(f => {
      const contacts = [...f.contacts]
      contacts[idx] = { ...contacts[idx], ...patch }
      return { ...f, contacts }
    })
  }

  const addContact = () =>
    setForm(f => ({ ...f, contacts: [...f.contacts, { ...EMPTY_CONTACT }] }))

  const removeContact = (idx: number) =>
    setForm(f => ({ ...f, contacts: f.contacts.filter((_, i) => i !== idx) }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Vendor name is required')
      return
    }
    const validContacts = form.contacts.filter(c => c.contact_name.trim())
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        location: form.location.trim() || undefined,
        contacts: validContacts,
      }
      if (editingVendor) {
        await updateVendor(token!, editingVendor.id, payload)
        toast.success('Vendor updated')
      } else {
        await createVendor(token!, payload)
        toast.success('Vendor added')
      }
      setShowModal(false)
      load()
    } catch {
      toast.error('Failed to save vendor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Vendors</h1>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            <Plus size={18} /> Add Vendor
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading vendors...</p>
        ) : vendors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No vendors added yet</p>
            <button onClick={openAdd} className="mt-4 text-blue-600 text-sm hover:underline">
              Add your first vendor
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {vendors.map(vendor => (
              <div key={vendor.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{vendor.name}</h2>
                    {vendor.location && (
                      <p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                        <MapPin size={13} /> {vendor.location}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(vendor)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(vendor)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {vendor.contacts.length > 0 && (
                  <div className="mt-4 grid gap-2">
                    {vendor.contacts.map(contact => (
                      <div
                        key={contact.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-gray-50 rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-gray-800">{contact.contact_name}</span>
                        {contact.designation && (
                          <span className="text-gray-500 text-xs">{contact.designation}</span>
                        )}
                        {contact.phone && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Phone size={12} /> {contact.phone}
                          </span>
                        )}
                        {contact.whatsapp && contact.whatsapp !== contact.phone && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Phone size={12} /> {contact.whatsapp} (WA)
                          </span>
                        )}
                        {contact.email && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Mail size={12} /> {contact.email}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g., Taj Hotels"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="e.g., Mumbai"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium">Contact Persons</label>
                  <button
                    type="button"
                    onClick={addContact}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus size={13} /> Add Contact
                  </button>
                </div>

                <div className="space-y-3">
                  {form.contacts.map((contact, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 relative">
                      {form.contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(idx)}
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={contact.contact_name}
                            onChange={e => setContact(idx, { contact_name: e.target.value })}
                            placeholder="Contact name"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600">
                            Designation
                          </label>
                          <input
                            type="text"
                            value={contact.designation || ''}
                            onChange={e => setContact(idx, { designation: e.target.value })}
                            placeholder="e.g., Sales Manager"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={contact.phone || ''}
                            onChange={e =>
                              setContact(idx, {
                                phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                              })
                            }
                            placeholder="XXXXXXXXXX"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-gray-600">
                            WhatsApp
                          </label>
                          <input
                            type="tel"
                            value={contact.whatsapp || ''}
                            onChange={e =>
                              setContact(idx, {
                                whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10),
                              })
                            }
                            placeholder="XXXXXXXXXX"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium mb-1 text-gray-600">
                            Email
                          </label>
                          <input
                            type="email"
                            value={contact.email || ''}
                            onChange={e => setContact(idx, { email: e.target.value })}
                            placeholder="contact@vendor.com"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium text-sm"
              >
                {saving ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
