export interface ConvertToBookingRequest {
    itineraryId: string;
    sellingPrice: number;
    vendorCost: number;
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
  
  export interface RevertBookingResponse {
    success: true;
    message: string;
  }
  
  export interface AddClientPaymentRequest {
    bookingId: string;
    clientName: string;
    paymentDate: string;
    paymentType: 'Advance' | 'Final' | 'Refund' | 'Other';
    amount: number;
    paymentMode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque';
    referenceUtr?: string;
    packageName?: string;
    remarks?: string;
  }
  
  export interface AddClientPaymentResponse {
    success: true;
    payment: {
      id: number;
      booking_id: string;
      client_name: string;
      payment_date: string;
      payment_type: string;
      amount: number;
      payment_mode: string;
      reference_utr: string | null;
      package_name: string | null;
      running_total: number;
      remarks: string | null;
      created_at: string;
    };
    bookingBalance: {
      selling_price: number;
      received_from_client: number;
      balance_due: number;
    };
  }
  
  export interface AddVendorPaymentRequest {
    bookingId: string;
    clientName: string;
    vendorName: string;
    datePaid: string;
    amountPaid: number;
    paymentMode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque';
    referenceUtr?: string;
    packageName?: string;
    remarks?: string;
  }
  
  export interface AddVendorPaymentResponse {
    success: true;
    payment: {
      id: number;
      booking_id: string;
      client_name: string;
      vendor_name: string;
      date_paid: string;
      amount_paid: number;
      payment_mode: string;
      reference_utr: string | null;
      package_name: string | null;
      running_total: number;
      remarks: string | null;
      created_at: string;
    };
    vendorBalance: {
      vendor_cost: number;
      paid_to_vendor: number;
      balance_due: number;
    };
  }
  
  export interface ApiErrorResponse {
    error: string;
    details?: unknown;
  }
  
  export interface BookingWithPayments {
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
      client_status: string;
      reminder_date: string | null;
      created_at: string;
      updated_at: string;
    };
    clientPayments: Array<{
      id: number;
      booking_id: string;
      client_name: string;
      payment_date: string;
      payment_type: string;
      amount: number;
      payment_mode: string;
      reference_utr: string | null;
      package_name: string | null;
      running_total: number;
      remarks: string | null;
      created_at: string;
    }>;
    vendorPayments: Array<{
      id: number;
      booking_id: string;
      client_name: string;
      vendor_name: string;
      date_paid: string;
      amount_paid: number;
      payment_mode: string;
      reference_utr: string | null;
      package_name: string | null;
      running_total: number;
      remarks: string | null;
      created_at: string;
    }>;
    clientBalanceDue: number;
    vendorBalanceDue: number;
  }

  interface GetBookingsFilters {
    userId: number;
    page?: number;
    limit?: number;
    search?: string;        // client_name search
    vendor?: string;        // vendor_name search
    status?: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
    travelDate?: string;    // YYYY-MM-DD
    bookingDate?: string;   // YYYY-MM-DD
    minSellingPrice?: number;
    maxSellingPrice?: number;
  }