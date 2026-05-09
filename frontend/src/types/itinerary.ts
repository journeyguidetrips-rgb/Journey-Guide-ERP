export interface Itinerary {
  id: string
  vendor_name: string
  client_name: string
  source_content: string
  content: string
  html_content: string
  status: 'Draft' | 'Published' | 'Converted'
  created_at: string
}

export interface ItineraryFilters {
  query: string
  vendorName: string
  status: '' | 'Draft' | 'Published' | 'Converted'
  date: string
}
