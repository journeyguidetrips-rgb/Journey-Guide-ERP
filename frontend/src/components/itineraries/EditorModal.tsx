import { Download, X } from 'lucide-react'
import { Itinerary } from '../../types/itinerary'

interface EditorModalProps {
  itinerary: Itinerary
  editContent: string
  sourceContent: string
  onContentChange: (v: string) => void
  onSave: () => void
  onExportPDF: (id: string) => void
  onClose: () => void
}

export default function EditorModal({
  itinerary,
  editContent,
  sourceContent,
  onContentChange,
  onSave,
  onExportPDF,
  onClose,
}: EditorModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">{itinerary.client_name}</h2>
            <p className="text-sm text-gray-500">{itinerary.vendor_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex gap-4 p-6">
          <div className="flex-1 flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">Source (read-only)</label>
            <textarea
              disabled
              value={sourceContent}
              className="flex-1 p-4 border border-gray-200 rounded-lg font-mono text-sm bg-gray-50 resize-none"
            />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">Edit Content</label>
            <textarea
              value={editContent}
              onChange={e => onContentChange(e.target.value)}
              className="flex-1 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onSave}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            Save Changes
          </button>
          <button
            onClick={() => onExportPDF(itinerary.id)}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium text-sm flex items-center justify-center gap-2"
          >
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}
