import axios from 'axios'
import { Vendor, VendorContact } from '../types/vendor'

const api = axios.create({ baseURL: '/api' })

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export const searchVendors = (token: string, q: string) =>
  api.get<{ success: boolean; vendors: Vendor[] }>(`/vendors/search?q=${encodeURIComponent(q)}`, {
    headers: authHeader(token),
  })

export const fetchVendors = (token: string) =>
  api.get<{ success: boolean; vendors: Vendor[] }>('/vendors', {
    headers: authHeader(token),
  })

export const createVendor = (
  token: string,
  data: { name: string; location?: string; contacts?: VendorContact[] }
) =>
  api.post<{ success: boolean; vendor: Vendor }>('/vendors', data, {
    headers: authHeader(token),
  })

export const updateVendor = (
  token: string,
  id: number,
  data: { name: string; location?: string; contacts?: VendorContact[] }
) =>
  api.put<{ success: boolean; vendor: Vendor }>(`/vendors/${id}`, data, {
    headers: authHeader(token),
  })

export const deleteVendor = (token: string, id: number) =>
  api.delete<{ success: boolean }>(`/vendors/${id}`, {
    headers: authHeader(token),
  })
