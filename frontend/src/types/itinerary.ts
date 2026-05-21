export interface Itinerary {
  id: string
  vendor_name: string
  client_name: string
  status: 'Draft' | 'Published' | 'Converted'
  created_at: string
}

export interface ItineraryFilters {
  query: string
  vendorName: string
  status: '' | 'Draft' | 'Published' | 'Converted'
  date: string
}

export interface ItineraryDetails {
  id: string
  vendor_name: string
  client_name: string
  source_md_content: string
  edited_md_content: string
  status: 'Draft' | 'Published' | 'Converted'
  created_at: string
}