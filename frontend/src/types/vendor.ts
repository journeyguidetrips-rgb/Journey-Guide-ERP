export interface VendorContact {
  id?: number;
  contact_name: string;
  designation?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
}

export interface Vendor {
  id: number;
  user_id: number;
  name: string;
  location?: string;
  contacts: VendorContact[];
  created_at: string;
  updated_at: string;
}
