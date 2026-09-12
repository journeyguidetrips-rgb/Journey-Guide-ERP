import { z } from 'zod';

export const ClientPaymentSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Payment date must be YYYY-MM-DD'),
  paymentType: z.enum(['Advance', 'Final', 'Refund', 'Other']),
  amount: z.number().positive('Amount must be positive'),
  paymentMode: z.enum(['UPI', 'Bank Transfer', 'Cash', 'Card', 'Cheque']),
  referenceUtr: z.string().nullable().optional(),
  packageName: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
});

export const VendorPaymentSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  vendorName: z.string().min(1, 'Vendor name is required'),
  datePaid: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date paid must be YYYY-MM-DD'),
  amountPaid: z.number().positive('Amount must be positive'),
  paymentMode: z.enum(['UPI', 'Bank Transfer', 'Cash', 'Card', 'Cheque']),
  referenceUtr: z.string().optional(),
  packageName: z.string().optional(),
  remarks: z.string().optional(),
});

export const ConvertBookingSchema = z.object({
  itineraryId: z.string().min(1, 'Itinerary ID is required'),
  sellingPrice: z.number().nonnegative('Selling price must be non-negative'),
  vendorCost: z.number().nonnegative('Vendor cost must be non-negative'),
  vendorName: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  travelDate: z.string().optional(),
  guests: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export const UpdateBookingSchema = z.object({
  clientName: z.string().min(1).optional(),
  vendorName: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  packageName: z.string().optional(),
  travelDate: z.string().optional(),
  guests: z.number().int().positive().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  vendorCost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  clientStatus: z.string().optional(),
  reminderDate: z.string().optional(),
});
