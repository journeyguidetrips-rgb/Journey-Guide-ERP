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

// Fetch settings
export const fetchSettings = (): Promise<OrgSettings> =>
  api.get('/settings').then((res) => res.data.settings);

// Save settings
export const saveSettings = (settings: OrgSettings): Promise<OrgSettings> =>
  api.put('/settings', { settings }).then((res) => res.data.settings);
