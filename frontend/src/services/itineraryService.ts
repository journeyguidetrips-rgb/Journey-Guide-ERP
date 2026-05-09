import axios from 'axios'
import { Itinerary } from '../types/itinerary'
import { ConvertToBookingRequest } from '../types/booking'

const api = axios.create({ baseURL: '/api' })

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export const fetchItineraries = (token: string, params: URLSearchParams) =>
  api.get<{ itineraries: Itinerary[]; total: number }>(`/itineraries?${params}`, {
    headers: authHeader(token),
  })

export const uploadItinerary = (token: string, formData: FormData) =>
  api.post('/itineraries/upload', formData, {
    headers: { ...authHeader(token), 'Content-Type': 'multipart/form-data' },
  })

export const updateItinerary = (token: string, id: string, content: string) =>
  api.put(`/itineraries/${id}`, { content }, { headers: authHeader(token) })

export const deleteItinerary = (token: string, id: string) =>
  api.delete(`/itineraries/${id}`, { headers: authHeader(token) })

export const downloadPDF = (token: string, id: string) =>
  api.get(`/itineraries/${id}/download-pdf`, {
    headers: authHeader(token),
    responseType: 'blob',
  })

export const publishItinerary = (token: string, id: string) =>
  api.post(`/itineraries/${id}/publish`, {}, { headers: authHeader(token) })

export const convertToBooking = (token: string, payload: ConvertToBookingRequest) =>
  api.post('/bookings/convert', payload, { headers: authHeader(token) })

export const revertToPublished = (token: string, itineraryId: string) =>
  api.post(`/bookings/${itineraryId}/revert`, {}, { headers: authHeader(token) })
