import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Upload, Edit2, Trash2, Download, X, Search, RefreshCw } from 'lucide-react'
import { useUserStore } from '../stores/userStore'

// Add this interface for filters
interface SearchFilters {
  query: string;      // client_name
  vendorName: string; // vendor_name
  status: '' | 'Draft' | 'Published';
  date: string;       // YYYY-MM-DD
}

interface Itinerary {
  id: string
  vendor_name: string
  client_name: string
  source_content: string
  content: string
  html_content: string
  status: 'Draft' | 'Published'
  created_at: string
}

interface SearchFilters {
  query: string
  vendorName: string
  status: '' | 'Draft' | 'Published'
  date: string
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

  // Add these states
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    vendorName: '',
    status: '',
    date: ''
  })

  const currentPageRef = useRef(1)
  const hasMoreRef = useRef(true)

  // Ref to track if a fetch is in progress (prevents duplicate calls)
  const fetchLock = useRef(false)

  // Intersection Observer ref for infinite scroll
  const observer = useRef<IntersectionObserver | null>(null)

  const lastItineraryRef = useCallback((node: HTMLDivElement | null) => {
    // Always disconnect old observer first
    if (observer.current) {
      observer.current.disconnect()
      observer.current = null
    }
  
    // Don't observe if loading, no more data, or no node
    if (loadingMore || !hasMoreRef.current || !node) return
  
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !fetchLock.current && hasMoreRef.current) {
        fetchItineraries(false)
      }
    }, { rootMargin: '150px' })
  
    observer.current.observe(node)
  }, [loadingMore]) // Keep minimal deps; filters accessed via ref

  // Updated fetch function with pagination & filters
  const fetchItineraries = async (reset = false) => {
    if (fetchLock.current) return
    fetchLock.current = true
  
    const targetPage = reset ? 1 : currentPageRef.current
    const setIsLoading = reset ? setLoading : setLoadingMore
  
    setIsLoading(true)
    try {
      // Use filtersRef to always get latest values
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
        setItineraries(prev => [...prev, ...newItems])
        currentPageRef.current = targetPage + 1
      }
  
      hasMoreRef.current = (targetPage * 10) < total
      setHasMore(hasMoreRef.current)

      // Inside fetchItineraries, after receiving response:
      console.log('📦 Backend response:', {
        itemsReturned: response.data.itineraries?.length,
        total: response.data.total,
        hasMore: response.data.hasMore,
        currentPage: response.data.page,
      });
  
    } catch (error) {
      toast.error('Failed to fetch itineraries')
    } finally {
      setIsLoading(false)
      fetchLock.current = false
    }
  }

  const handleApplyFilters = () => {
    // 1. Update the ref IMMEDIATELY (bypasses async state)
    filtersRef.current = { ...filters }
    
    // 2. Reset pagination
    fetchLock.current = false
    currentPageRef.current = 1
    hasMoreRef.current = true
    setPage(1)
    setHasMore(true)
    
    // 3. Disconnect old observer
    if (observer.current) {
      observer.current.disconnect()
      observer.current = null
    }
    
    // 4. Fetch with fresh filters
    fetchItineraries(true)
  }
  
  const handleResetFilters = () => {
    // 1. Create new empty filters object
    const newFilters = { query: '', vendorName: '', status: '' as const, date: '' }
    
    // 2. Update BOTH state AND ref immediately
    setFilters(newFilters)
    filtersRef.current = newFilters  // ✅ Critical: sync ref before fetch
    
    // 3. Reset pagination
    fetchLock.current = false
    currentPageRef.current = 1
    hasMoreRef.current = true
    setPage(1)
    setHasMore(true)
    
    // 4. Disconnect observer
    if (observer.current) {
      observer.current.disconnect()
      observer.current = null
    }
    
    // 5. Fetch with clean filters
    fetchItineraries(true)
  }

  // Add refs to track latest filter values
  const filtersRef = useRef(filters)

  // Keep ref in sync with state
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  // Handle file upload
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

  // Update itinerary
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

  // Delete itinerary
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

  // Export to PDF
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
        {/* Header */}
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

        {/* Search & Filters */}
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
                onChange={(e) => setFilters({ ...filters, status: e.target.value as '' | 'Draft' | 'Published' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">All</option>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
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
                Search
              </button>
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Itineraries List */}
        <div className="grid gap-4">
          {loading && itineraries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Loading itineraries...</p>
          ) : itineraries.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No itineraries found</p>
          ) : (
            itineraries.map((itinerary, index) => (
              <div
                key={itinerary.id}
                // Only attach ref to the LAST item, and only if we have more to load
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
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      itinerary.status === 'Published'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {itinerary.status}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedItinerary(itinerary)
                      setEditContent(itinerary.content)
                      setSourceContent(itinerary.source_content)
                      setShowEditor(true)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                  <button
                    onClick={() => handleExportPDF(itinerary.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-600 py-2 rounded-lg hover:bg-green-100 transition"
                  >
                    <Download size={16} /> Export PDF
                  </button>
                  <button
                    onClick={() => handleDeleteItinerary(itinerary.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Loading indicator */}
          {loadingMore && (
            <div className="text-center py-4 text-gray-500">
              Loading more...
            </div>
          )}

          {/* End of list indicator */}
          {!hasMore && itineraries.length > 0 && (
            <div className="text-center py-4 text-sm text-gray-400">
              ✓ All itineraries loaded
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
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

      {/* Editor Modal */}
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
    </div>
  )
}