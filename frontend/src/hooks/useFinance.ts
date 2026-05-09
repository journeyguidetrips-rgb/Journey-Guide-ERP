import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useUserStore } from '../stores/userStore'
import {
  fetchDashboardSummary,
  fetchBookings as fetchBookingsAPI,
  fetchClientPayments as fetchClientPaymentsAPI,
  fetchVendorPayments as fetchVendorPaymentsAPI,
  fetchBookingDetails as fetchBookingDetailsAPI,
} from '../services/bookingService'
import {
  Booking,
  ClientPayment,
  VendorPayment,
  BookingWithPayments,
  DashboardMetrics,
} from '../types/finance'

export const useFinance = () => {
  const { token } = useUserStore()

  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([])
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([])
  const [selectedBooking, setSelectedBooking] = useState<BookingWithPayments | null>(null)

  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const fetchLock = useRef(false)

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const { data } = await fetchDashboardSummary(token!)
      if (data.success) setDashboardMetrics(data.data)
    } catch {
      toast.error('Failed to load dashboard metrics')
    } finally {
      setDashboardLoading(false)
    }
  }, [token])

  const loadList = useCallback(async (
    endpoint: 'bookings' | 'client-payments' | 'vendor-payments',
    reset: boolean,
  ) => {
    if (fetchLock.current) return
    fetchLock.current = true

    const targetPage = reset ? 1 : pageRef.current
    const setLoading = endpoint === 'bookings' ? setBookingsLoading : setPaymentsLoading
    setLoading(true)

    try {
      const params = new URLSearchParams({ page: targetPage.toString(), limit: '20' })
      let newItems: any[] = []
      let total = 0

      if (endpoint === 'bookings') {
        const { data } = await fetchBookingsAPI(token!, params)
        newItems = data.bookings || []
        total = data.total ?? 0
      } else if (endpoint === 'client-payments') {
        const { data } = await fetchClientPaymentsAPI(token!, params)
        newItems = data.payments || []
        total = data.total ?? 0
      } else {
        const { data } = await fetchVendorPaymentsAPI(token!, params)
        newItems = data.payments || []
        total = data.total ?? 0
      }

      const setter =
        endpoint === 'bookings' ? setBookings
        : endpoint === 'client-payments' ? setClientPayments
        : setVendorPayments

      if (reset) {
        setter(newItems)
        pageRef.current = 2
      } else {
        setter(prev => {
          const ids = new Set(prev.map((i: any) => i.id))
          return [...prev, ...newItems.filter((i: any) => !ids.has(i.id))]
        })
        pageRef.current = targetPage + 1
      }

      hasMoreRef.current = targetPage * 20 < total
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
      fetchLock.current = false
    }
  }, [token])

  const loadBookingDetails = useCallback(async (bookingId: string) => {
    try {
      const { data } = await fetchBookingDetailsAPI(token!, bookingId)
      setSelectedBooking(data)
      return data
    } catch {
      toast.error('Failed to fetch booking details')
      return null
    }
  }, [token])

  return {
    dashboardMetrics,
    dashboardLoading,
    loadDashboard,
    bookings,
    bookingsLoading,
    clientPayments,
    vendorPayments,
    paymentsLoading,
    selectedBooking,
    setSelectedBooking,
    hasMoreRef,
    fetchLock,
    loadBookings: (reset = false) => loadList('bookings', reset),
    loadClientPayments: (reset = false) => loadList('client-payments', reset),
    loadVendorPayments: (reset = false) => loadList('vendor-payments', reset),
    loadBookingDetails,
  }
}
