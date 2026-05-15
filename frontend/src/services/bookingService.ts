import axios from 'axios'
import {
  Booking,
  ClientPayment,
  VendorPayment,
  BookingWithPayments,
  DashboardMetrics,
  PaymentForm,
  VendorPaymentForm,
} from '../types/finance'

const api = axios.create({ baseURL: '/api' })

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export const fetchDashboardSummary = (token: string) =>
  api.get<{ success: boolean; data: DashboardMetrics }>('/bookings/dashboard-summary', {
    headers: authHeader(token),
  })

export const fetchBookings = (token: string, params: URLSearchParams) =>
  api.get<{ bookings: Booking[]; total: number }>(`/bookings?${params}`, {
    headers: authHeader(token),
  })

export const fetchBookingDetails = (token: string, bookingId: string) =>
  api.get<BookingWithPayments>(`/bookings/${bookingId}`, {
    headers: authHeader(token),
  })

export const fetchClientPayments = (token: string, params: URLSearchParams) =>
  api.get<{ payments: ClientPayment[]; total: number }>(`/bookings/client-payments?${params}`, {
    headers: authHeader(token),
  })

export const fetchVendorPayments = (token: string, params: URLSearchParams) =>
  api.get<{ payments: VendorPayment[]; total: number }>(`/bookings/vendor-payments?${params}`, {
    headers: authHeader(token),
  })

export const postClientPayment = (
  token: string,
  bookingId: string,
  payload: Omit<PaymentForm, 'bookingId'> & { amount: number }
) =>
  api.post(`/bookings/${bookingId}/client-payments`, payload, {
    headers: authHeader(token),
  })

export const postVendorPayment = (
  token: string,
  bookingId: string,
  payload: Omit<VendorPaymentForm, 'bookingId'> & { amountPaid: number }
) =>
  api.post(`/bookings/${bookingId}/vendor-payments`, payload, {
    headers: authHeader(token),
  })

export const patchBooking = (token: string, bookingId: string, data: Record<string, unknown>) =>
  api.put(`/bookings/${bookingId}`, data, { headers: authHeader(token) })

export const patchClientPayment = (
  token: string,
  bookingId: string,
  paymentId: number,
  data: Record<string, unknown>
) =>
  api.put(`/bookings/${bookingId}/client-payments/${paymentId}`, data, { headers: authHeader(token) })

export const patchVendorPayment = (
  token: string,
  bookingId: string,
  paymentId: number,
  data: Record<string, unknown>
) =>
  api.put(`/bookings/${bookingId}/vendor-payments/${paymentId}`, data, { headers: authHeader(token) })

export const downloadPaymentReceipt = (
  token: string,
  bookingId: string,
  paymentId: number
) =>
  api.get<Blob>(`/bookings/${bookingId}/client-payments/${paymentId}/receipt`, {
    headers: authHeader(token),
    responseType: 'blob',
  })
