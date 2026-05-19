import { api } from './api'
import { Itinerary } from '../types/itinerary'
import { ConvertToBookingRequest } from '../types/booking'

export const fetchItineraries = (params: URLSearchParams) =>
  api.get<{ itineraries: Itinerary[]; total: number }>(`/itineraries?${params}`)

export const uploadItinerary = (formData: FormData) =>
  api.post('/itineraries/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const updateItinerary = (id: string, content: string) =>
  api.put(`/itineraries/${id}`, { content })

export const deleteItinerary = (id: string) =>
  api.delete(`/itineraries/${id}`)

export const downloadPDF = (id: string) =>
  api.get(`/itineraries/${id}/download-pdf`, { responseType: 'blob' })

export const publishItinerary = (id: string) =>
  api.post(`/itineraries/${id}/publish`, {})

export const convertToBooking = (payload: ConvertToBookingRequest) =>
  api.post('/bookings/convert', payload)

export const revertToPublished = (itineraryId: string) =>
  api.post(`/bookings/${itineraryId}/revert`, {})
