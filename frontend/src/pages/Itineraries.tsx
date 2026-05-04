// src/components/Itineraries.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Upload, Edit2, Trash2, Download, X, Search, RefreshCw, Undo2, Shuffle } from 'lucide-react'
import { useUserStore } from '../stores/userStore'
import { 
  ConvertToBookingRequest,
  ConvertToBookingResponse,
  ApiErrorResponse,
} from '../../../backend/src/types/booking'

interface SearchFilters {
  query: string;
  vendorName: string;
  status: '' | 'Draft' | 'Published' | 'Converted';
  date: string;
}

interface Itinerary {
  id: string
  vendor_name: string
  client_name: string
  source_content: string
  content: string
  html_content: string
  status: 'Draft' | 'Published' | 'Converted'
  created_at: string
}

export default function Itineraries() {
  const { user, token } = useUserStore()
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [sourceContent, setSourceContent] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [clientName, setClientName] = useState('')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    vendorName: '',
    status: '',
    date: ''
  })

  const [showConvertModal, setShowConvertModal] = useState(false)
  const [convertingItinerary, setConvertingItinerary] = useState<Itinerary | null>(null)
  const [bookingForm, setBookingForm] = useState({
    sellingPrice: '',
    vendorCost: '',
    phone: '',
    whatsapp: '',
    travelDate: '',
    guests: '1',
    notes: ''
  })

  const currentPageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const fetchLock = useRef(false)
  const observer = useRef<IntersectionObserver | null>(null)
  const filtersRef = useRef(filters)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  const lastItineraryRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) {
      observer.current.disconnect()
      observer.current = null
    }
  
    if (loadingMore || !hasMoreRef.current || !node) return
  
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !fetchLock.current && hasMoreRef.current) {
        fetchItineraries(false)
      }
    }, { rootMargin: '150px' })
  
    observer.current.observe(node)
  }, [loadingMore])

  const fetchItineraries = async (reset = false) => {
    if (fetchLock.current) return
    fetchLock.current = true
  
    const targetPage = reset ? 1 : currentPageRef.current
    const setIsLoading = reset ? setLoading : setLoadingMore
  
    setIsLoading(true)
    try {
      const currentFilters = filtersRef.current
      
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: '10',
        ...(currentFilters.query && { search: currentFilters.query }),
        ...(currentFilters.vendorName && { vendor: currentFilters.vendorName }),
        ...(currentFilters.status && { status: currentFilters.status }),
        ...(currentFilters.date && { date: currentFilters.date }),
      })
  
      const response = await axios.get(`/api/itineraries?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
  
      const newItems = response.data.itineraries || []
      const total = response.data.total ?? 0
  
      if (reset) {
        setItineraries(newItems)
        currentPageRef.current = 2
      } else {
        setItineraries(prev => {
          const existingIds = new Set(prev.map(i => i.id))
          const uniqueNew = newItems.filter(i => !existingIds.has(i.id))
          return [...prev, ...uniqueNew]
        })
        currentPageRef.current = targetPage + 1
      }
  
      hasMoreRef.current = (targetPage * 10) < total
      setHasMore(hasMoreRef.current)
  
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to fetch itineraries')
    } finally {
      setIsLoading(false)
      fetchLock.current = false
    }
  }

  const handleApplyFilters = () => {
    filtersRef.current = { ...filters }
    fetchLock.current = false
    currentPageRef.current = 1
    hasMoreRef.current = true
    setPage(1)
    setHasMore(true)
    
    if (observer.current) {
      observer.current.disconnect()
      observer.current = null
    }
    
    fetchItineraries(true)
  }
  
  const handleResetFilters = () => {
    const newFilters = { query: '', vendorName: '', status: '' as const, date: '' }
    setFilters(newFilters)
    filtersRef.current = newFilters
    
    fetchLock.current = false
    currentPageRef.current = 1
    hasMoreRef.current = true
    setPage(1)
    setHasMore(true)
    
    if (observer.current) {
      observer.current.disconnect()
      observer.current = null
    }
    
    fetchItineraries(true)
  }

  useEffect(() => {
    fetchItineraries(true)
    
    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !vendorName || !clientName) {
      toast.error('Please select file and enter vendor/client names')
      return
    }
    if (!file.name.endsWith('.md')) {
      toast.error('Please upload a valid Markdown (.md) file')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('vendorName', vendorName)
    formData.append('clientName', clientName)

    try {
      const response = await axios.post('/api/itineraries/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.success) {
        setSelectedItinerary(response.data.itinerary)
        setEditContent(response.data.itinerary.content)
        setSourceContent(response.data.itinerary.source_content)
        setShowEditor(true)
        setShowUploadModal(false)
        setVendorName('')
        setClientName('')
        toast.success('Markdown itinerary uploaded successfully')
        await fetchItineraries(true)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateItinerary = async () => {
    if (!selectedItinerary) return
    try {
      const response = await axios.put(
        `/api/itineraries/${selectedItinerary.id}`,
        { content: editContent },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        toast.success('Itinerary updated')
        setSelectedItinerary(response.data.itinerary)
        await fetchItineraries(true)
      }
    } catch (error: any) {
      toast.error('Failed to update itinerary')
    }
  }

  const handleDeleteItinerary = async (id: string) => {
    if (!window.confirm('Are you sure?')) return
    try {
      const response = await axios.delete(`/api/itineraries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data.success) {
        toast.success('Itinerary deleted')
        await fetchItineraries(true)
      }
    } catch (error: any) {
      toast.error('Failed to delete itinerary')
    }
  }

  const handleConvertToBooking = async () => {
    if (!convertingItinerary) return;
    
    try {
      toast.loading('Converting to booking...');
      
      const payload: ConvertToBookingRequest = {
        itineraryId: convertingItinerary.id,
        sellingPrice: parseFloat(bookingForm.sellingPrice) || 0,
        vendorCost: parseFloat(bookingForm.vendorCost) || 0,
        phone: bookingForm.phone,
        whatsapp: bookingForm.whatsapp,
        travelDate: bookingForm.travelDate,
        guests: parseInt(bookingForm.guests) || 1,
        notes: bookingForm.notes
      };
      
      const response = await axios.post<ConvertToBookingResponse | ApiErrorResponse>(
        '/api/bookings/convert',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if ('success' in response.data && response.data.success) {
        toast.dismiss();
        toast.success('✅ Converted to booking!');
        setShowConvertModal(false);
        setConvertingItinerary(null);
        setBookingForm({
          sellingPrice: '', vendorCost: '', phone: '', whatsapp: '',
          travelDate: '', guests: '1', notes: ''
        });
        await fetchItineraries(true);
      } else {
        const errorData = response.data as ApiErrorResponse;
        toast.dismiss();
        toast.error(errorData.error || 'Conversion failed');
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.response?.data?.error || 'Conversion failed');
    }
  };

  const handleRevertToPublished = async (itinerary: Itinerary) => {
    if (!window.confirm('Restore this itinerary to "Published" status? All payment records will be deleted.')) return;
    
    try {
      toast.loading('Restoring itinerary...');
      
      const response = await axios.post(
        `/api/bookings/${itinerary.id}/revert`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.dismiss();
        toast.success('✅ Restored to Published');
        await fetchItineraries(true);
      } else {
        toast.dismiss();
        toast.error(response.data.error || 'Revert failed');
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.response?.data?.error || 'Revert failed');
    }
  };

  const handleExportPDF = async (id: string) => {
    try {
      toast.loading('Generating PDF...')
      const response = await axios.get(`/api/itineraries/${id}/download-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      })

      if (response.data.type !== 'application/pdf') {
        toast.dismiss()
        toast.error('Backend returned invalid data format')
        return
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'itinerary.pdf')
      document.body.appendChild(link)
      link.click()

      const responsePublished = await axios.post(`/api/itineraries/${id}/publish`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (responsePublished.data.success) {
        toast.success('Published Itinerary')
        await fetchItineraries(true)
      } else {
        toast.error(`Error : ${responsePublished.data}`)
      }
      
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.dismiss()
      toast.success('Download complete!')
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to export PDF')
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-gray-900">Itineraries</h1>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Upload size={20} />
            Upload Markdown
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Search Client</label>
              <input
                type="text"
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                placeholder="Client name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
              <input
                type="text"
                value={filters.vendorName}
                onChange={(e) => setFilters({ ...filters, vendorName: e.target.value })}
                placeholder="e.g., Taj Hotels"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as '' | 'Draft' | 'Published' | 'Converted' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">All</option>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Converted">Converted</option>
              </select>
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyFilters}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Search size={16} /> Search
              </button>
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                <RefreshCw size={16} /> Reset
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {loading && itineraries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Loading itineraries...</p>
          ) : itineraries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No itineraries found</p>
          ) : (
            itineraries.map((itinerary, index) => (
              <div
                key={itinerary.id}
                ref={index === itineraries.length - 1 && hasMore ? lastItineraryRef : null}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{itinerary.client_name}</h3>
                    <p className="text-sm text-gray-600">Vendor: {itinerary.vendor_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(itinerary.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    itinerary.status === 'Published' 
                      ? 'bg-green-100 text-green-700' 
                      : itinerary.status === 'Converted'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {itinerary.status}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedItinerary(itinerary);
                      setEditContent(itinerary.content);
                      setSourceContent(itinerary.source_content);
                      setShowEditor(true);
                    }}
                    className="flex-1 min-w-[100px] flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition"
                  >
                    <Edit2 size={16} /> Edit
                  </button>

                  {itinerary.status !== 'Converted' && (
                    <button
                      onClick={() => handleExportPDF(itinerary.id)}
                      className="flex-1 min-w-[100px] flex items-center justify-center gap-2 bg-green-50 text-green-600 py-2 rounded-lg hover:bg-green-100 transition"
                    >
                      <Download size={16} /> Export
                    </button>
                  )}

                  {itinerary.status === 'Published' && (
                    <button
                      onClick={() => {
                        setConvertingItinerary(itinerary);
                        setShowConvertModal(true);
                      }}
                      className="flex-1 min-w-[100px] flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-2 rounded-lg hover:bg-purple-100 transition font-medium"
                    >
                      <Shuffle size={16} /> Convert
                    </button>
                  )}

                  {itinerary.status === 'Converted' && (
                    <button
                      onClick={() => handleRevertToPublished(itinerary)}
                      className="flex-1 min-w-[100px] flex items-center justify-center gap-2 bg-amber-50 text-amber-600 py-2 rounded-lg hover:bg-amber-100 transition font-medium"
                      title="Restore to Published"
                    >
                      <Undo2 size={16} /> Restore
                    </button>
                  )}

                  {itinerary.status !== 'Converted' && (
                    <button
                      onClick={() => handleDeleteItinerary(itinerary.id)}
                      className="flex-1 min-w-[100px] flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {loadingMore && (
            <div className="text-center py-4 text-gray-500">Loading more...</div>
          )}

          {!hasMore && itineraries.length > 0 && (
            <div className="text-center py-4 text-sm text-gray-400">
              ✓ All itineraries loaded
            </div>
          )}
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Upload Markdown File</h2>
              <button onClick={() => setShowUploadModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Vendor Name</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g., Taj Hotels"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Upload File</label>
                <input
                  type="file"
                  accept=".md"
                  onChange={handleFileUpload}
                  disabled={uploading || !vendorName || !clientName}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-2">Supported: Markdown (.md)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditor && selectedItinerary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full h-[90vh] mx-4 flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">{selectedItinerary.client_name}</h2>
              <button onClick={() => setShowEditor(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex gap-4 p-6">
              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium mb-2">Source</label>
                <textarea disabled
                  value={sourceContent}
                  className="flex-1 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium mb-2">Edit Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-4 p-6 border-t">
              <button
                onClick={handleUpdateItinerary}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Save Changes
              </button>
              <button
                onClick={() => handleExportPDF(selectedItinerary.id)}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
              >
                <Download size={18} /> Export PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showConvertModal && convertingItinerary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Convert to Booking</h2>
                <p className="text-sm text-gray-500">{convertingItinerary.client_name} • {convertingItinerary.vendor_name}</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    value={bookingForm.sellingPrice}
                    onChange={(e) => setBookingForm({...bookingForm, sellingPrice: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vendor Cost (₹)</label>
                  <input
                    type="number"
                    value={bookingForm.vendorCost}
                    onChange={(e) => setBookingForm({...bookingForm, vendorCost: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={bookingForm.phone}
                    onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={bookingForm.whatsapp}
                    onChange={(e) => setBookingForm({...bookingForm, whatsapp: e.target.value})}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Travel Date</label>
                  <input
                    type="date"
                    value={bookingForm.travelDate}
                    onChange={(e) => setBookingForm({...bookingForm, travelDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={bookingForm.guests}
                    onChange={(e) => setBookingForm({...bookingForm, guests: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                  placeholder="Special requests, preferences, etc."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p><strong>Booking ID:</strong> <span className="text-purple-600">JG-XXXX (auto-generated)</span></p>
                <p><strong>Client Balance Due:</strong> ₹{bookingForm.sellingPrice ? parseFloat(bookingForm.sellingPrice).toLocaleString() : '0'}</p>
                <p><strong>Vendor Balance Due:</strong> ₹{bookingForm.vendorCost ? parseFloat(bookingForm.vendorCost).toLocaleString() : '0'}</p>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowConvertModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertToBooking}
                disabled={!bookingForm.sellingPrice || !bookingForm.vendorCost}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Shuffle size={18} /> Confirm Conversion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}