export interface ConvertToBookingRequest {
  itineraryId: string;
  sellingPrice: number;
  vendorCost: number;
  vendorName?: string;
  phone?: string;
  whatsapp?: string;
  travelDate?: string;
  guests?: number;
  notes?: string;
}

export interface ConvertToBookingResponse {
  success: true;
  booking: {
    id: number;
    booking_id: string;
    itinerary_id: string;
    client_name: string;
    vendor_name: string;
    phone: string | null;
    whatsapp: string | null;
    package_name: string;
    date_of_booking: string;
    travel_date: string | null;
    guests: number;
    reference_person: string | null;
    notes: string | null;
    selling_price: number;
    received_from_client: number;
    vendor_cost: number;
    paid_to_vendor: number;
    client_status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
    reminder_date: string | null;
    created_at: string;
    updated_at: string;
  };
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}