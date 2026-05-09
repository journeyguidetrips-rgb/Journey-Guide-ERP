import { Edit2, Trash2, Download, Undo2, Shuffle } from 'lucide-react'
import { Itinerary } from '../../types/itinerary'
import StatusBadge from '../shared/StatusBadge'

interface ItineraryCardProps {
  itinerary: Itinerary
  lastRef?: React.Ref<HTMLDivElement>
  onEdit: (itinerary: Itinerary) => void
  onExportPDF: (id: string) => void
  onConvert: (itinerary: Itinerary) => void
  onRevert: (itinerary: Itinerary) => void
  onDelete: (id: string) => void
}

export default function ItineraryCard({
  itinerary,
  lastRef,
  onEdit,
  onExportPDF,
  onConvert,
  onRevert,
  onDelete,
}: ItineraryCardProps) {
  return (
    <div
      ref={lastRef}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{itinerary.client_name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">Vendor: {itinerary.vendor_name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(itinerary.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
        <StatusBadge status={itinerary.status} variant="itinerary" />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onEdit(itinerary)}
          className="flex-1 min-w-[90px] flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
        >
          <Edit2 size={15} /> Edit
        </button>

        {itinerary.status !== 'Converted' && (
          <button
            onClick={() => onExportPDF(itinerary.id)}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-2 bg-green-50 text-green-600 py-2 rounded-lg hover:bg-green-100 transition text-sm font-medium"
          >
            <Download size={15} /> Export PDF
          </button>
        )}

        {itinerary.status === 'Published' && (
          <button
            onClick={() => onConvert(itinerary)}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-2 rounded-lg hover:bg-purple-100 transition text-sm font-medium"
          >
            <Shuffle size={15} /> Convert
          </button>
        )}

        {itinerary.status === 'Converted' && (
          <button
            onClick={() => onRevert(itinerary)}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-2 bg-amber-50 text-amber-600 py-2 rounded-lg hover:bg-amber-100 transition text-sm font-medium"
            title="Restore to Published"
          >
            <Undo2 size={15} /> Restore
          </button>
        )}

        {itinerary.status !== 'Converted' && (
          <button
            onClick={() => onDelete(itinerary.id)}
            className="flex-1 min-w-[90px] flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition text-sm font-medium"
          >
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>
    </div>
  )
}
