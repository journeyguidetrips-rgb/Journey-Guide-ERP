import { useState, useRef, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useUserStore } from '../stores/userStore'
import { fetchItineraries as fetchItinerariesAPI } from '../services/itineraryService'
import { Itinerary, ItineraryFilters } from '../types/itinerary'

const DEFAULT_FILTERS: ItineraryFilters = { query: '', vendorName: '', status: '', date: '' }

export const useItineraries = () => {
  const { token } = useUserStore()

  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState<ItineraryFilters>(DEFAULT_FILTERS)

  const currentPageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const fetchLock = useRef(false)
  const filtersRef = useRef(filters)

  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  const fetch = useCallback(async (reset = false) => {
    if (fetchLock.current) return
    fetchLock.current = true

    const targetPage = reset ? 1 : currentPageRef.current
    const setIsLoading = reset ? setLoading : setLoadingMore
    setIsLoading(true)

    try {
      const f = filtersRef.current
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: '10',
        ...(f.query && { search: f.query }),
        ...(f.vendorName && { vendor: f.vendorName }),
        ...(f.status && { status: f.status }),
        ...(f.date && { date: f.date }),
      })

      const { data } = await fetchItinerariesAPI(token!, params)
      const newItems = data.itineraries || []
      const total = data.total ?? 0

      if (reset) {
        setItineraries(newItems)
        currentPageRef.current = 2
      } else {
        setItineraries(prev => {
          const existingIds = new Set(prev.map(i => i.id))
          return [...prev, ...newItems.filter(i => !existingIds.has(i.id))]
        })
        currentPageRef.current = targetPage + 1
      }

      hasMoreRef.current = targetPage * 10 < total
      setHasMore(hasMoreRef.current)
    } catch {
      toast.error('Failed to fetch itineraries')
    } finally {
      setIsLoading(false)
      fetchLock.current = false
    }
  }, [token])

  const applyFilters = useCallback(() => {
    filtersRef.current = { ...filters }
    fetchLock.current = false
    currentPageRef.current = 1
    hasMoreRef.current = true
    setHasMore(true)
    fetch(true)
  }, [filters, fetch])

  const resetFilters = useCallback(() => {
    const clean = DEFAULT_FILTERS
    setFilters(clean)
    filtersRef.current = clean
    fetchLock.current = false
    currentPageRef.current = 1
    hasMoreRef.current = true
    setHasMore(true)
    fetch(true)
  }, [fetch])

  useEffect(() => {
    fetch(true)
    return () => { fetchLock.current = false }
  }, [])

  return {
    itineraries,
    loading,
    loadingMore,
    hasMore,
    hasMoreRef,
    fetchLock,
    filters,
    setFilters,
    applyFilters,
    resetFilters,
    refresh: () => fetch(true),
    fetchMore: () => fetch(false),
  }
}
