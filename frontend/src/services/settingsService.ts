import { api } from './api'

export interface OrgSettings {
  companyName: string
  logoData: string | null
  accountName: string
  accountNumber: string
  ifscCode: string
  upiId: string
  address: string
  phone: string
  email: string
  terms: string
}

export async function fetchSettings(): Promise<OrgSettings> {
  const { data } = await api.get('/settings')
  return data.settings
}

export async function saveSettings(settings: OrgSettings): Promise<void> {
  await api.put('/settings', settings)
}
