import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { searchVendors } from '../../services/vendorService'
import { Vendor } from '../../types/vendor'

interface VendorAutocompleteProps {
  value: string
  onSelect: (vendor: Vendor | null, name: string) => void
  placeholder?: string
  className?: string
}

export default function VendorAutocomplete({
  value,
  onSelect,
  placeholder = 'Type at least 3 letters to search...',
  className = '',
}: VendorAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<Vendor[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = useCallback(
    (text: string) => {
      setInputValue(text)
      onSelect(null, text)

      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (text.length < 3) {
        setSuggestions([])
        setShowDropdown(false)
        return
      }

      debounceRef.current = setTimeout(async () => {
        setLoading(true)
        try {
          const { data } = await searchVendors(text)
          setSuggestions(data.vendors)
          setShowDropdown(data.vendors.length > 0)
        } catch {
          setSuggestions([])
        } finally {
          setLoading(false)
        }
      }, 300)
    },
    [onSelect]
  )

  const handleSelect = (vendor: Vendor) => {
    setInputValue(vendor.name)
    setSuggestions([])
    setShowDropdown(false)
    onSelect(vendor, vendor.name)
  }

  const handleClear = () => {
    setInputValue('')
    setSuggestions([])
    setShowDropdown(false)
    onSelect(null, '')
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={e => handleInput(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
        />
        {inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching...</div>
          ) : (
            suggestions.map(vendor => (
              <button
                key={vendor.id}
                type="button"
                onClick={() => handleSelect(vendor)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
              >
                <span className="font-medium text-gray-900">{vendor.name}</span>
                {vendor.location && (
                  <span className="text-gray-500 ml-2 text-xs">{vendor.location}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {inputValue.length > 0 && inputValue.length < 3 && (
        <p className="text-xs text-gray-400 mt-1">Type at least 3 characters to search registered vendors</p>
      )}
    </div>
  )
}
