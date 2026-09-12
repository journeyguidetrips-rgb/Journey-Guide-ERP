// src/routes/bookings.ts
import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  convertItineraryToBooking,
  revertBookingToItinerary,
  getBookingWithPayments,
  addClientPayment,
  addVendorPayment,
  updateBooking,
  updateClientPayment,
  updateVendorPayment,
  getBookings,
  getBookingDetails,
  getClientPayments,
  getVendorPayments,
  getDashboardSummary
} from '../services/bookingService';
import { generateReceiptPDF } from '../services/pdfService';
import { validateRequest } from '../middleware/validateRequest';
import {
  ClientPaymentSchema,
  VendorPaymentSchema,
  ConvertBookingSchema,
  UpdateBookingSchema,
} from '../schemas/bookingSchemas';

const router = Router();

router.post<{ bookingId: string }>('/:bookingId/client-payments', authenticate, validateRequest(ClientPaymentSchema), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { clientName, paymentDate, paymentType, amount, paymentMode, referenceUtr, packageName, remarks } = req.body;
    const result = await addClientPayment(bookingId, { clientName, paymentDate, paymentType, amount, paymentMode, referenceUtr, packageName, remarks });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post<{ bookingId: string }>('/:bookingId/vendor-payments', authenticate, validateRequest(VendorPaymentSchema), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { clientName, vendorName, datePaid, amountPaid, paymentMode, referenceUtr, packageName, remarks } = req.body;
    const result = await addVendorPayment(bookingId, { clientName, vendorName, datePaid, amountPaid, paymentMode, referenceUtr, packageName, remarks });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/bookings/client-payments - List all client payments
router.get('/client-payments', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      search,
      bookingId,
      paymentType,
      paymentMode,
      startDate,
      endDate,
    } = req.query;

    const result = await getClientPayments({
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      search: search as string,
      bookingId: bookingId as string,
      paymentType: paymentType as 'Advance' | 'Final' | 'Refund' | 'Other',
      paymentMode: paymentMode as 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque',
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.json({
      success: true,
      payments: result.payments,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    });
  } catch (error: any) {
    console.error('Get client payments error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch client payments' });
  }
});

// GET /api/bookings/vendor-payments - List all vendor payments
router.get('/vendor-payments', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      page,
      limit,
      search,
      bookingId,
      vendorName,
      paymentMode,
      startDate,
      endDate,
    } = req.query;

    const result = await getVendorPayments({
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      search: search as string,
      bookingId: bookingId as string,
      vendorName: vendorName as string,
      paymentMode: paymentMode as 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque',
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.json({
      success: true,
      payments: result.payments,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    });
  } catch (error: any) {
    console.error('Get vendor payments error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch vendor payments' });
  }
});

router.get('/dashboard-summary', authenticate, async (req, res) => {
  try {
    const data = await getDashboardSummary();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

router.get('/:bookingId/details', authenticate, async (req, res) => {
  try {
    const data = await getBookingDetails(req.params.bookingId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Booking not found' });
  }
});

router.post<{}>('/convert', authenticate, validateRequest(ConvertBookingSchema), async (req, res) => {
  try {
    const { itineraryId, sellingPrice, vendorCost, vendorName, phone, whatsapp, travelDate, guests, notes } = req.body;
    const result = await convertItineraryToBooking({ itineraryId, sellingPrice, vendorCost, vendorName, phone, whatsapp, travelDate, guests, notes });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post<{ itineraryId: string }, {}>('/:itineraryId/revert', authenticate, async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const result = await revertBookingToItinerary(itineraryId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/bookings/:bookingId — update booking fields
router.put<{ bookingId: string }>('/:bookingId', authenticate, validateRequest(UpdateBookingSchema), async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { clientName, vendorName, phone, whatsapp, packageName, travelDate, guests, sellingPrice, vendorCost, notes, clientStatus, reminderDate } = req.body;
    const updated = await updateBooking(bookingId, { clientName, vendorName, phone, whatsapp, packageName, travelDate, guests, sellingPrice, vendorCost, notes, clientStatus, reminderDate });
    res.json({ success: true, booking: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/bookings/:bookingId/client-payments/:paymentId — edit a client payment
router.put<{ bookingId: string; paymentId: string }>(
  '/:bookingId/client-payments/:paymentId',
  authenticate,
  validateRequest(ClientPaymentSchema),
  async (req, res) => {
    try {
      const { bookingId, paymentId } = req.params;
      const { clientName, paymentDate, paymentType, amount, paymentMode, referenceUtr, packageName, remarks } = req.body;
      
      const updated = await updateClientPayment(bookingId, parseInt(paymentId), {
        clientName, paymentDate, paymentType, amount, paymentMode, referenceUtr, packageName, remarks,
      });
      res.json({ success: true, payment: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// PUT /api/bookings/:bookingId/vendor-payments/:paymentId — edit a vendor payment
router.put<{ bookingId: string; paymentId: string }>(
  '/:bookingId/vendor-payments/:paymentId',
  authenticate,
  validateRequest(VendorPaymentSchema),
  async (req, res) => {
    try {
      const { bookingId, paymentId } = req.params;
      const { clientName, vendorName, datePaid, amountPaid, paymentMode, referenceUtr, packageName, remarks } = req.body;
      const updated = await updateVendorPayment(bookingId, parseInt(paymentId), {
        clientName, vendorName, datePaid, amountPaid, paymentMode, referenceUtr, packageName, remarks,
      });
      res.json({ success: true, payment: updated });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get<{ bookingId: string }>('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const data = await getBookingWithPayments(bookingId);
    res.json(data);
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Booking not found' });
  }
});

// GET /api/bookings - List bookings with pagination & filters
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

// ── Receipt route ── //
router.get('/:bookingId/client-payments/:paymentId/receipt', authenticate, async (req: Request, res: Response) => {
  try {
    const { bookingId, paymentId } = req.params;
    const { buffer, filename } = await generateReceiptPDF(bookingId, paymentId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).end(buffer, 'binary');
  } catch (error: any) {
    console.error('Receipt PDF Error:', error);
    const status = error.message === 'Booking not found' || error.message === 'Payment not found' ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to generate receipt' });
  }
});

export default router;