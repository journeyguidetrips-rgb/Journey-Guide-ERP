import { Search, RefreshCw } from 'lucide-react'
import { ItineraryFilters } from '../../types/itinerary'

interface FilterBarProps {
  filters: ItineraryFilters
  onChange: (filters: ItineraryFilters) => void
  onApply: () => void
  onReset: () => void
}

export default function FilterBar({ filters, onChange, onApply, onReset }: FilterBarProps) {
  const set = (patch: Partial<ItineraryFilters>) => onChange({ ...filters, ...patch })

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search Client</label>
          <input
            type="text"
            value={filters.query}
            onChange={e => set({ query: e.target.value })}
            placeholder="Client name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
          <input
            type="text"
            value={filters.vendorName}
            onChange={e => set({ vendorName: e.target.value })}
            placeholder="e.g., Taj Hotels"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={e => set({ status: e.target.value as ItineraryFilters['status'] })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
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
            onChange={e => set({ date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onApply}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <Search size={14} /> Search
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>
    </div>
  )
}
