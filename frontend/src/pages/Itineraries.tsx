import { useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Upload } from 'lucide-react'
import { useUserStore } from '../stores/userStore'
import { useItineraries } from '../hooks/useItineraries'
import {
  uploadItinerary,
  updateItinerary,
  deleteItinerary,
  downloadPDF,
  publishItinerary,
  convertToBooking,
  revertToPublished,
} from '../services/itineraryService'
import { Itinerary } from '../types/itinerary'
import { ConvertToBookingRequest, ApiErrorResponse } from '../types/booking'
import FilterBar from '../components/itineraries/FilterBar'
import ItineraryCard from '../components/itineraries/ItineraryCard'
import UploadModal from '../components/itineraries/UploadModal'
import EditorModal from '../components/itineraries/EditorModal'
import ConvertModal from '../components/itineraries/ConvertModal'

const DEFAULT_BOOKING_FORM = {
  sellingPrice: '', vendorCost: '', vendorName: '', phone: '', whatsapp: '',
  travelDate: '', guests: '1', notes: '',
}

export default function Itineraries() {
  const { token } = useUserStore()

  const {
    itineraries, loading, loadingMore, hasMore, hasMoreRef, fetchLock,
    filters, setFilters, applyFilters, resetFilters, refresh, fetchMore,
  } = useItineraries()

  const [showUploadModal, setShowUploadModal]       = useState(false)
  const [showEditor, setShowEditor]                 = useState(false)
  const [showConvertModal, setShowConvertModal]     = useState(false)
  const [selectedItinerary, setSelectedItinerary]   = useState<Itinerary | null>(null)
  const [convertingItinerary, setConvertingItinerary] = useState<Itinerary | null>(null)
  const [editContent, setEditContent]               = useState('')
  const [sourceContent, setSourceContent]           = useState('')
  const [vendorName, setVendorName]                 = useState('')
  const [clientName, setClientName]                 = useState('')
  const [uploading, setUploading]                   = useState(false)
  const [pasteContent, setPasteContent]             = useState('')
  const [bookingForm, setBookingForm]               = useState(DEFAULT_BOOKING_FORM)

  const observer = useRef<IntersectionObserver | null>(null)

  const lastCardRef = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node || loadingMore || !hasMoreRef.current) return
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !fetchLock.current && hasMoreRef.current) {
        fetchMore()
      }
    }, { rootMargin: '150px' })
    observer.current.observe(node)
  }, [loadingMore, hasMoreRef, fetchLock, fetchMore])

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
      const { data } = await uploadItinerary(token!, formData)
      if (data.success) {
        setSelectedItinerary(data.itinerary)
        setEditContent(data.itinerary.content)
        setSourceContent(data.itinerary.source_content)
        setShowUploadModal(false)
        setShowEditor(true)
        setVendorName('')
        setClientName('')
        toast.success('Itinerary uploaded successfully')
        refresh()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handlePasteSubmit = async () => {
    if (!vendorName || !clientName || !pasteContent.trim()) {
      toast.error('Please enter vendor/client names and markdown content')
      return
    }
    setUploading(true)
    const file = new File([pasteContent], 'itinerary.md', { type: 'text/markdown' })
    const formData = new FormData()
    formData.append('file', file)
    formData.append('vendorName', vendorName)
    formData.append('clientName', clientName)
    try {
      const { data } = await uploadItinerary(token!, formData)
      if (data.success) {
        setSelectedItinerary(data.itinerary)
        setEditContent(data.itinerary.content)
        setSourceContent(data.itinerary.source_content)
        setShowUploadModal(false)
        setShowEditor(true)
        setVendorName('')
        setClientName('')
        setPasteContent('')
        toast.success('Itinerary created successfully')
        refresh()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (itinerary: Itinerary) => {
    setSelectedItinerary(itinerary)
    setEditContent(itinerary.content)
    setSourceContent(itinerary.source_content)
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!selectedItinerary) return
    try {
      const { data } = await updateItinerary(token!, selectedItinerary.id, editContent)
      if (data.success) {
        toast.success('Itinerary updated')
        setSelectedItinerary(data.itinerary)
        refresh()
      }
    } catch {
      toast.error('Failed to update itinerary')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this itinerary?')) return
    try {
      const { data } = await deleteItinerary(token!, id)
      if (data.success) {
        toast.success('Itinerary deleted')
        refresh()
      }
    } catch {
      toast.error('Failed to delete itinerary')
    }
  }

  const handleExportPDF = async (id: string) => {
    try {
      toast.loading('Generating PDF...')
      const response = await downloadPDF(token!, id)

      if (response.data.type !== 'application/pdf') {
        toast.dismiss()
        toast.error('Invalid PDF response from server')
        return
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'itinerary.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      const { data: publishData } = await publishItinerary(token!, id)
      toast.dismiss()
      if (publishData.success) {
        toast.success('Download complete & itinerary published!')
        refresh()
      } else {
        toast.success('Download complete')
      }
    } catch {
      toast.dismiss()
      toast.error('Failed to export PDF')
    }
  }

  const handleConvert = (itinerary: Itinerary) => {
    setConvertingItinerary(itinerary)
    setBookingForm({ ...DEFAULT_BOOKING_FORM, vendorName: itinerary.vendor_name })
    setShowConvertModal(true)
  }

  const handleConfirmConvert = async () => {
    if (!convertingItinerary) return
    try {
      toast.loading('Converting to booking...')
      const payload: ConvertToBookingRequest = {
        itineraryId: convertingItinerary.id,
        sellingPrice: parseFloat(bookingForm.sellingPrice) || 0,
        vendorCost: parseFloat(bookingForm.vendorCost) || 0,
        vendorName: bookingForm.vendorName || undefined,
        phone: bookingForm.phone,
        whatsapp: bookingForm.whatsapp,
        travelDate: bookingForm.travelDate,
        guests: parseInt(bookingForm.guests) || 1,
        notes: bookingForm.notes,
      }
      const { data } = await convertToBooking(token!, payload)
      toast.dismiss()
      if ('success' in data && data.success) {
        toast.success('Converted to booking!')
        setShowConvertModal(false)
        setConvertingItinerary(null)
        refresh()
      } else {
        toast.error((data as ApiErrorResponse).error || 'Conversion failed')
      }
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error || 'Conversion failed')
    }
  }

  const handleRevert = async (itinerary: Itinerary) => {
    if (!window.confirm('Restore to "Published" status? All payment records will be deleted.')) return
    try {
      toast.loading('Restoring itinerary...')
      const { data } = await revertToPublished(token!, itinerary.id)
      toast.dismiss()
      if (data.success) {
        toast.success('Restored to Published')
        refresh()
      } else {
        toast.error(data.error || 'Revert failed')
      }
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error || 'Revert failed')
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
            <Upload size={20} /> Upload Markdown
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onApply={applyFilters}
            onReset={resetFilters}
          />
        </div>

        {/* Itinerary Cards */}
        <div className="grid gap-4">
          {loading && itineraries.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Loading itineraries...</p>
          ) : itineraries.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No itineraries found</p>
          ) : (
            itineraries.map((itinerary, idx) => (
              <ItineraryCard
                key={itinerary.id}
                itinerary={itinerary}
                lastRef={idx === itineraries.length - 1 && hasMore ? lastCardRef : undefined}
                onEdit={handleEdit}
                onExportPDF={handleExportPDF}
                onConvert={handleConvert}
                onRevert={handleRevert}
                onDelete={handleDelete}
              />
            ))
          )}

          {loadingMore && (
            <p className="text-center text-gray-500 py-4">Loading more...</p>
          )}

          {!hasMore && itineraries.length > 0 && (
            <p className="text-center text-sm text-gray-400 py-4">All itineraries loaded</p>
          )}
        </div>
      </div>

      {/* Modals */}
      {showUploadModal && (
        <UploadModal
          vendorName={vendorName}
          clientName={clientName}
          uploading={uploading}
          pasteContent={pasteContent}
          onVendorChange={setVendorName}
          onClientChange={setClientName}
          onFileChange={handleFileUpload}
          onPasteContentChange={setPasteContent}
          onPasteSubmit={handlePasteSubmit}
          onClose={() => { setShowUploadModal(false); setPasteContent('') }}
        />
      )}

      {showEditor && selectedItinerary && (
        <EditorModal
          itinerary={selectedItinerary}
          editContent={editContent}
          sourceContent={sourceContent}
          onContentChange={setEditContent}
          onSave={handleSave}
          onExportPDF={handleExportPDF}
          onClose={() => setShowEditor(false)}
        />
      )}

      {showConvertModal && convertingItinerary && (
        <ConvertModal
          itinerary={convertingItinerary}
          form={bookingForm}
          onChange={setBookingForm}
          onConfirm={handleConfirmConvert}
          onClose={() => setShowConvertModal(false)}
        />
      )}
    </div>
  )
}
