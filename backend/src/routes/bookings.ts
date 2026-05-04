// src/routes/bookings.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { 
  convertItineraryToBooking, 
  revertBookingToItinerary,
  getBookingWithPayments,
  addClientPayment,
  addVendorPayment,
  getBookings
} from '../services/bookingService';
import { 
  ConvertToBookingRequest,
  ConvertToBookingResponse,
  RevertBookingResponse,
  AddClientPaymentRequest,
  AddClientPaymentResponse,
  AddVendorPaymentRequest,
  AddVendorPaymentResponse,
  BookingWithPayments,
  ApiErrorResponse,
} from '../types/booking';

const router = Router();

router.post<
  {},
  ConvertToBookingResponse | ApiErrorResponse,
  ConvertToBookingRequest
>('/convert', authenticate, async (req, res) => {
  try {
    const { itineraryId, sellingPrice, vendorCost, phone, whatsapp, travelDate, guests, notes } = req.body;
    
    if (!itineraryId || sellingPrice === undefined || vendorCost === undefined) {
      return res.status(400).json({ error: 'Missing required fields: itineraryId, sellingPrice, vendorCost' });
    }
    
    const result = await convertItineraryToBooking(req.user!.id, {
      itineraryId,
      sellingPrice,
      vendorCost,
      phone,
      whatsapp,
      travelDate,
      guests,
      notes,
    });
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post<
  { itineraryId: string },
  RevertBookingResponse | ApiErrorResponse,
  {}
>('/:itineraryId/revert', authenticate, async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const result = await revertBookingToItinerary(req.user!.id, itineraryId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get<
  { bookingId: string },
  BookingWithPayments | ApiErrorResponse
>('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const data = await getBookingWithPayments(bookingId);
    res.json(data);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Booking not found' });
  }
});

router.post<
  { bookingId: string },
  AddClientPaymentResponse | ApiErrorResponse,
  AddClientPaymentRequest
>('/:bookingId/client-payments', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { 
      clientName,
      paymentDate,
      paymentType,
      amount,
      paymentMode,
      referenceUtr,
      packageName,
      remarks,
    } = req.body;

    if (!clientName || !paymentDate || !paymentType || amount === undefined || !paymentMode) {
      return res.status(400).json({ error: 'Missing required payment fields' });
    }

    const result = await addClientPayment(bookingId, {
      clientName,
      paymentDate,
      paymentType,
      amount,
      paymentMode,
      referenceUtr,
      packageName,
      remarks,
    });
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post<
  { bookingId: string },
  AddVendorPaymentResponse | ApiErrorResponse,
  AddVendorPaymentRequest
>('/:bookingId/vendor-payments', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { 
      clientName,
      vendorName,
      datePaid,
      amountPaid,
      paymentMode,
      referenceUtr,
      packageName,
      remarks,
    } = req.body;

    if (!clientName || !vendorName || !datePaid || amountPaid === undefined || !paymentMode) {
      return res.status(400).json({ error: 'Missing required payment fields' });
    }

    const result = await addVendorPayment(bookingId, {
      clientName,
      vendorName,
      datePaid,
      amountPaid,
      paymentMode,
      referenceUtr,
      packageName,
      remarks,
    });
    
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ GET /api/bookings - List bookings with pagination & filters
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      search,
      vendor,
      status,
      travelDate,
      bookingDate,
      minSellingPrice,
      maxSellingPrice,
    } = req.query;

    const result = await getBookings({
      userId: req.user!.id,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
      search: search as string,
      vendor: vendor as string,
      status: status as 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled',
      travelDate: travelDate as string,
      bookingDate: bookingDate as string,
      minSellingPrice: minSellingPrice ? parseFloat(minSellingPrice as string) : undefined,
      maxSellingPrice: maxSellingPrice ? parseFloat(maxSellingPrice as string) : undefined,
    });

    res.json({
      success: true,
      bookings: result.bookings,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    });
  } catch (error: any) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch bookings' });
  }
});

export default router;

