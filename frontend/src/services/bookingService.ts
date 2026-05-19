import { api } from './api'
import {
  Booking,
  ClientPayment,
  VendorPayment,
  BookingWithPayments,
  DashboardMetrics,
  PaymentForm,
  VendorPaymentForm,
} from '../types/finance'

export const fetchDashboardSummary = () =>
  api.get<{ success: boolean; data: DashboardMetrics }>('/bookings/dashboard-summary')

export const fetchBookings = (params: URLSearchParams) =>
  api.get<{ bookings: Booking[]; total: number }>(`/bookings?${params}`)

export const fetchBookingDetails = (bookingId: string) =>
  api.get<BookingWithPayments>(`/bookings/${bookingId}`)

export const fetchClientPayments = (params: URLSearchParams) =>
  api.get<{ payments: ClientPayment[]; total: number }>(`/bookings/client-payments?${params}`)

export const fetchVendorPayments = (params: URLSearchParams) =>
  api.get<{ payments: VendorPayment[]; total: number }>(`/bookings/vendor-payments?${params}`)

export const postClientPayment = (
  bookingId: string,
  payload: Omit<PaymentForm, 'bookingId'> & { amount: number }
) =>
  api.post(`/bookings/${bookingId}/client-payments`, payload)

export const postVendorPayment = (
  bookingId: string,
  payload: Omit<VendorPaymentForm, 'bookingId'> & { amountPaid: number }
) =>
  api.post(`/bookings/${bookingId}/vendor-payments`, payload)

export const patchBooking = (bookingId: string, data: Record<string, unknown>) =>
  api.put(`/bookings/${bookingId}`, data)

export const patchClientPayment = (
  bookingId: string,
  paymentId: number,
  data: Record<string, unknown>
) =>
  api.put(`/bookings/${bookingId}/client-payments/${paymentId}`, data)

export const patchVendorPayment = (
  bookingId: string,
  paymentId: number,
  data: Record<string, unknown>
) =>
  api.put(`/bookings/${bookingId}/vendor-payments/${paymentId}`, data)

export const downloadPaymentReceipt = (bookingId: string, paymentId: number) =>
  api.get<Blob>(`/bookings/${bookingId}/client-payments/${paymentId}/receipt`, {
    responseType: 'blob',
  })
