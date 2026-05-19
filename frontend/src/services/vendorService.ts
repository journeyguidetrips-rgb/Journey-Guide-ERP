import { api } from './api'
import { Vendor, VendorContact } from '../types/vendor'

export const searchVendors = (q: string) =>
  api.get<{ success: boolean; vendors: Vendor[] }>(`/vendors/search?q=${encodeURIComponent(q)}`)

export const fetchVendors = () =>
  api.get<{ success: boolean; vendors: Vendor[] }>('/vendors')

export const createVendor = (data: { name: string; location?: string; contacts?: VendorContact[] }) =>
  api.post<{ success: boolean; vendor: Vendor }>('/vendors', data)

export const updateVendor = (
  id: number,
  data: { name: string; location?: string; contacts?: VendorContact[] }
) =>
  api.put<{ success: boolean; vendor: Vendor }>(`/vendors/${id}`, data)

export const deleteVendor = (id: number) =>
  api.delete<{ success: boolean }>(`/vendors/${id}`)
