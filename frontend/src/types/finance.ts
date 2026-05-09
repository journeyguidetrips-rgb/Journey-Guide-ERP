export type TabView = 'dashboard' | 'bookings' | 'client-payments' | 'vendor-payments' | 'reminders'

export interface Booking {
  id: number
  booking_id: string
  client_name: string
  vendor_name: string
  phone?: string
  whatsapp?: string
  package_name?: string
  date_of_booking: string
  travel_date?: string
  guests: number
  selling_price: number
  received_from_client: number
  vendor_cost: number
  paid_to_vendor: number
  client_status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
  reminder_date?: string
  notes?: string
  created_at: string
}

export interface ClientPayment {
  id: number
  booking_id: string
  client_name: string
  payment_date: string
  payment_type: 'Advance' | 'Final' | 'Refund' | 'Other'
  amount: number
  payment_mode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'
  reference_utr?: string
  package_name?: string
  running_total: number
  remarks?: string
  created_at: string
}

export interface VendorPayment {
  id: number
  booking_id: string
  client_name: string
  vendor_name: string
  date_paid: string
  amount_paid: number
  payment_mode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'
  reference_utr?: string
  package_name?: string
  running_total: number
  remarks?: string
  created_at: string
}

export interface DashboardMetrics {
  total_bookings: number
  total_selling_price: number
  total_received_from_client: number
  total_client_balance_due: number
  total_vendor_cost: number
  total_paid_to_vendor: number
  total_vendor_balance_due: number
  gross_profit: number
  realised_profit: number
  unrealised_profit: number
  collection_rate: number
  vendor_pay_rate: number
  fully_paid_count: number
  overdue_reminders_count: number
  total_itineraries: number
  draft_itineraries: number
  published_itineraries: number
  converted_itineraries: number
}

export interface BookingWithPayments {
  success: true
  booking: Booking
  clientPayments: ClientPayment[]
  vendorPayments: VendorPayment[]
  clientBalanceDue: number
  vendorBalanceDue: number
}

export interface PaymentForm {
  bookingId: string
  clientName: string
  paymentDate: string
  paymentType: 'Advance' | 'Final' | 'Refund' | 'Other'
  amount: string
  paymentMode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'
  referenceUtr: string
  packageName: string
  remarks: string
}

export interface VendorPaymentForm {
  bookingId: string
  clientName: string
  vendorName: string
  datePaid: string
  amountPaid: string
  paymentMode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque'
  referenceUtr: string
  packageName: string
  remarks: string
}
