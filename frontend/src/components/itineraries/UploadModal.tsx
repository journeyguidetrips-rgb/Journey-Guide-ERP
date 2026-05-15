import { X } from 'lucide-react'
import VendorAutocomplete from '../shared/VendorAutocomplete'

interface UploadModalProps {
  vendorName: string
  clientName: string
  uploading: boolean
  onVendorChange: (v: string) => void
  onClientChange: (v: string) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClose: () => void
}

export default function UploadModal({
  vendorName,
  clientName,
  uploading,
  onVendorChange,
  onClientChange,
  onFileChange,
  onClose,
}: UploadModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Upload Markdown File</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Vendor Name *</label>
            <VendorAutocomplete
              value={vendorName}
              onSelect={(_vendor, name) => onVendorChange(name)}
              placeholder="Type 3+ letters to search registered vendors..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Client Name *</label>
            <input
              type="text"
              value={clientName}
              onChange={e => onClientChange(e.target.value)}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Upload File *</label>
            <input
              type="file"
              accept=".md"
              onChange={onFileChange}
              disabled={uploading || !vendorName || !clientName}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-2">Supported: Markdown (.md)</p>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              Uploading...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
