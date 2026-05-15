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
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { pool } from '../database/connection';

const router = Router();

function formatIndian(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

function numberToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
    'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function below100(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  function below1000(n: number): string {
    if (n < 100) return below100(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '');
  }

  const n = Math.floor(amount);
  if (n === 0) return 'Zero Rupees';
  const parts: string[] = [];
  if (n >= 10000000) parts.push(below100(Math.floor(n / 10000000)) + ' Crore');
  const r1 = n % 10000000;
  if (r1 >= 100000) parts.push(below100(Math.floor(r1 / 100000)) + ' Lakh');
  const r2 = r1 % 100000;
  if (r2 >= 1000) parts.push(below1000(Math.floor(r2 / 1000)) + ' Thousand');
  const r3 = r2 % 1000;
  if (r3 > 0) parts.push(below1000(r3));
  return parts.join(' ') + ' Rupees';
}

function displayDate(dateStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(dateStr);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]}, ${d.getUTCFullYear()}`;
}

router.post<{ bookingId: string }>('/:bookingId/client-payments', authenticate, async (req, res) => {
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

router.post<{ bookingId: string }>('/:bookingId/vendor-payments', authenticate, async (req, res) => {
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

    console.log("In 'Get Payments' method");

    const result = await getClientPayments({
      userId: req.user!.id,
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
      userId: req.user!.id,
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

// src/routes/bookings.ts
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
  } catch (error) {
    res.status(404).json({ error: 'Booking not found' });
  }
});

router.post<{}>('/convert', authenticate, async (req, res) => {
  try {
    const { itineraryId, sellingPrice, vendorCost, vendorName, phone, whatsapp, travelDate, guests, notes } = req.body;

    if (!itineraryId || sellingPrice === undefined || vendorCost === undefined) {
      return res.status(400).json({ error: 'Missing required fields: itineraryId, sellingPrice, vendorCost' });
    }

    const result = await convertItineraryToBooking(req.user!.id, {
      itineraryId,
      sellingPrice,
      vendorCost,
      vendorName,
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

router.post<{ itineraryId: string }, {}>('/:itineraryId/revert', authenticate, async (req, res) => {
  try {
    const { itineraryId } = req.params;
    const result = await revertBookingToItinerary(req.user!.id, itineraryId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/bookings/:bookingId — update booking fields
router.put<{ bookingId: string }>('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      clientName, vendorName, phone, whatsapp, packageName,
      travelDate, guests, sellingPrice, vendorCost, notes, clientStatus, reminderDate,
    } = req.body;
    const updated = await updateBooking(req.user!.id, bookingId, {
      clientName, vendorName, phone, whatsapp, packageName,
      travelDate, guests, sellingPrice, vendorCost, notes, clientStatus, reminderDate,
    });
    res.json({ success: true, booking: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/bookings/:bookingId/client-payments/:paymentId — edit a client payment
router.put<{ bookingId: string; paymentId: string }>(
  '/:bookingId/client-payments/:paymentId',
  authenticate,
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

// ── Receipt route ── //
router.get('/:bookingId/client-payments/:paymentId/receipt', authenticate, async (req: Request, res: Response) => {
  try {
    const { bookingId, paymentId } = req.params;

    // 1. Fetch payment, booking, and sum of all payments made before this one
    const [paymentResult, bookingResult, prevPaidResult] = await Promise.all([
      pool.query(
        `SELECT * FROM client_payments WHERE id = $1 AND booking_id = $2`,
        [paymentId, bookingId]
      ),
      pool.query(
        `SELECT * FROM bookings WHERE booking_id = $1`,
        [bookingId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS prev_paid
         FROM client_payments
         WHERE booking_id = $1 AND id < $2`,
        [bookingId, paymentId]
      ),
    ]);

    if (paymentResult.rows.length === 0)
      return res.status(404).json({ error: 'Payment not found' });
    if (bookingResult.rows.length === 0)
      return res.status(404).json({ error: 'Booking not found' });

    const payment = paymentResult.rows[0];
    const booking = bookingResult.rows[0];
    const amount = parseFloat(payment.amount);
    const sellingPrice = parseFloat(booking.selling_price);
    const previouslyPaid = parseFloat(prevPaidResult.rows[0].prev_paid);
    const totalReceived = previouslyPaid + amount;
    const balanceDue = Math.max(0, sellingPrice - totalReceived);

    // 2. Receipt metadata
    const paymentDateStr = displayDate(new Date(String(payment.payment_date)).toISOString().split('T')[0]);
    const today = displayDate(new Date().toISOString().split('T')[0]);
    const receiptNo = `JG-${String(new Date().toISOString()).replace(/-/g, '').slice(0, 8)}-${String(payment.id).padStart(4, '0')}`;
    const packageName = payment.package_name || booking.package_name || booking.client_name || '—';
    const phone = booking.phone || booking.whatsapp || '—';
    const travelDateDisplay = booking.travel_date
      ? displayDate(new Date(String(booking.travel_date)).toISOString().split('T')[0])
      : '—';

    // 3. Build receipt body HTML
    const receiptBody = `
      <h1>PAYMENT RECEIPT</h1>
      <p>Dear <strong>${payment.client_name}</strong>,</p>
      <p>We sincerely thank you for your payment of <strong>₹ ${formatIndian(amount)}</strong>,
         which we have received and noted.</p>
      <p>Thank you for choosing us for your tour package needs. We look forward to serving you.</p>
      <hr/>

      <h2>Receipt Details</h2>
      <table>
        <tbody>
          <tr><td style="width:45%;font-weight:700">Receipt No.</td><td>${receiptNo}</td></tr>
          <tr><td style="font-weight:700">Receipt Date</td><td>${today}</td></tr>
        </tbody>
      </table>

      <h2>Received From</h2>
      <table>
        <tbody>
          <tr><td style="width:45%;font-weight:700">Client Name</td><td>${payment.client_name}</td></tr>
          <tr><td style="font-weight:700">Mobile</td><td>${phone}</td></tr>
        </tbody>
      </table>

      <h2>Tour &amp; Payment Details</h2>
      <table>
        <tbody>
          <tr><td style="width:45%;font-weight:700">Tour Package</td><td>${packageName}</td></tr>
          <tr><td style="font-weight:700">Travel Date</td><td>${travelDateDisplay}</td></tr>
          <tr><td style="font-weight:700">No. of Guests</td><td>${booking.guests || 1}</td></tr>
          <tr><td style="font-weight:700">Payment Type</td><td>${payment.payment_type}</td></tr>
          <tr><td style="font-weight:700">Payment Mode</td><td>${payment.payment_mode}</td></tr>
          <tr><td style="font-weight:700">Transaction ID</td><td>${payment.reference_utr || '—'}</td></tr>
          <tr><td style="font-weight:700">Payment Date</td><td>${displayDate(paymentDateStr)}</td></tr>
        </tbody>
      </table>

      <h2>Amount Summary</h2>
      <table class="amount-table">
        <thead>
          <tr><th>Description</th><th>Amount (INR)</th></tr>
        </thead>
        <tbody>
          <tr><td>Total Tour Cost</td><td>₹ ${formatIndian(sellingPrice)}</td></tr>
          <tr><td>Previously Paid</td><td>₹ ${formatIndian(previouslyPaid)}</td></tr>
          <tr>
            <td><strong>Amount Received (This Receipt)</strong></td>
            <td><strong>₹ ${formatIndian(amount)}</strong></td>
          </tr>
          <tr>
            <td><strong>Balance Due</strong></td>
            <td><strong>₹ ${formatIndian(balanceDue)}</strong></td>
          </tr>
        </tbody>
      </table>

      <p><strong>Amount in Words:</strong> ${numberToWords(amount)} Only</p>

      <h2>Payment Instructions <em>(for balance payment)</em></h2>
      <table>
        <tbody>
          <tr><td style="width:45%;font-weight:700">Account Name</td><td>Journey Guide</td></tr>
          <tr><td style="font-weight:700">Account No.</td><td>18480200006512</td></tr>
          <tr><td style="font-weight:700">IFSC Code</td><td>Fdrl0001848</td></tr>
          <tr><td style="font-weight:700">UPI ID</td><td>journeyguide64@fbl</td></tr>
        </tbody>
      </table>

      <h2>Terms &amp; Conditions</h2>
      <ol>
        <li>This receipt is valid as proof of payment for the above-mentioned tour package only.</li>
        <li>The balance amount must be paid <strong>15 days prior</strong> to the tour start date.</li>
        <li>All payments are non-refundable as per the cancellation policy shared at the time of booking.</li>
        <li>In case of any discrepancy, please contact us within <strong>48 hours</strong> of receiving this receipt.</li>
        <li>Any additional expenses such as entrance fees, personal expenses and tips are not included unless specifically mentioned.</li>
      </ol>

      <p><em>This is a computer-generated receipt and does not require a physical signature.</em></p>
    `;

    // 4. Inject into the letterhead template
    const templateFile = path.join(process.cwd(), 'templates', 'receipt.html');
    const logoFile     = path.join(process.cwd(), 'templates', 'logo.png');
    const template     = await fs.readFile(templateFile, 'utf-8');
    const logoSrc      = `data:image/png;base64,${(await fs.readFile(logoFile)).toString('base64')}`;

    const finalHtml = template
      .replace('{{title}}', 'Payment Receipt')
      .replace(/\$if\(title\)\$[\s\S]*?\$endif\$/g, 'Payment Receipt')
      .replace('{{meta-tags}}', '').replace('$meta-tags$', '')
      .replace('{{logoBase64}}', logoSrc).replace('src="logo.png"', `src="${logoSrc}"`)
      .replace('{{body}}', receiptBody).replace('$body$', receiptBody);

    // 5. Puppeteer → PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const pg = await browser.newPage();
    await pg.setContent(finalHtml, { waitUntil: 'networkidle0' });
    await pg.emulateMediaType('screen');

    const dims = await pg.evaluate(() => ({
      width: Math.ceil(document.body.scrollWidth),
      height: Math.ceil(document.body.scrollHeight),
    }));

    const pdfBuffer = await pg.pdf({
      width: `${dims.width}px`,
      height: `${dims.height}px`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    // 6. Stream PDF
    const filename = `receipt-${receiptNo.replace(/\//g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).end(pdfBuffer, 'binary');
  } catch (error) {
    console.error('Receipt PDF Error:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

export default router;