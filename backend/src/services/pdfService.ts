import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { pool } from '../database/connection';
import { getContext } from '../context/requestContext';
import { getItinerary } from './itineraryService';
import { formatIndian, numberToWords, displayDate } from '../utils/formatters';

const templateDir = path.join(process.cwd(), 'templates');

async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function generateItineraryPDF(itineraryId: string): Promise<Buffer> {
  const itinerary = await getItinerary(itineraryId);
  if (!itinerary) throw new Error('Itinerary not found');

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setContent(itinerary.html_content, { waitUntil: 'networkidle0' });
  await page.emulateMediaType('screen');

  const dimensions = await page.evaluate(() => ({
    width: Math.ceil(document.documentElement.scrollWidth),
    height: Math.ceil(document.body.scrollHeight),
  }));

  const pdfBuffer = await page.pdf({
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}

export async function generateReceiptPDF(bookingId: string, paymentId: string): Promise<{ buffer: Buffer; filename: string }> {
  const { userId, orgId, roleId } = getContext();

  // Admins see all bookings in their org; staff only see their own.
  const scopeCondition = roleId === 1 ? 'i.org_id = $2' : 'i.user_id = $2';
  const scopeValue     = roleId === 1 ? orgId : userId;

  const ownerCheck = await pool.query(
    `SELECT b.booking_id FROM bookings b
     INNER JOIN itineraries i ON b.itinerary_id = i.id
     WHERE b.booking_id = $1 AND ${scopeCondition}`,
    [bookingId, scopeValue]
  );
  if (ownerCheck.rows.length === 0) throw new Error('Booking not found');

  const [paymentResult, bookingResult, prevPaidResult, profileResult] = await Promise.all([
    pool.query(`SELECT * FROM client_payments WHERE id = $1 AND booking_id = $2`, [paymentId, bookingId]),
    pool.query(`SELECT * FROM bookings WHERE booking_id = $1`, [bookingId]),
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS prev_paid FROM client_payments WHERE booking_id = $1 AND id < $2`,
      [bookingId, paymentId]
    ),
    pool.query(
      `SELECT op.* FROM organization_profiles op
       INNER JOIN users u ON u.org_id = op.org_id
       INNER JOIN itineraries i ON i.user_id = u.id
       INNER JOIN bookings b ON b.itinerary_id = i.id
       WHERE b.booking_id = $1`,
      [bookingId]
    ),
  ]);

  if (paymentResult.rows.length === 0) throw new Error('Payment not found');
  if (bookingResult.rows.length === 0) throw new Error('Booking not found');

  const payment = paymentResult.rows[0];
  const booking = bookingResult.rows[0];
  const orgProfile = profileResult.rows[0] || {};
  const amount = parseFloat(payment.amount);
  const sellingPrice = parseFloat(booking.selling_price);
  const previouslyPaid = parseFloat(prevPaidResult.rows[0].prev_paid);
  const totalReceived = previouslyPaid + amount;
  const balanceDue = Math.max(0, sellingPrice - totalReceived);

  const paymentDateStr = displayDate(new Date(String(payment.payment_date)).toISOString().split('T')[0]);
  const today = displayDate(new Date().toISOString().split('T')[0]);
  const receiptNo = `JG-${String(new Date().toISOString()).replace(/-/g, '').slice(0, 8)}-${String(payment.id).padStart(4, '0')}`;
  const packageName = payment.package_name || booking.package_name || booking.client_name || '—';
  const phone = booking.phone || booking.whatsapp || '—';
  const travelDateDisplay = booking.travel_date
    ? displayDate(new Date(String(booking.travel_date)).toISOString().split('T')[0])
    : '—';

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
        <tr><td style="width:45%;font-weight:700">Account Name</td><td>${orgProfile.account_name || '—'}</td></tr>
        <tr><td style="font-weight:700">Account No.</td><td>${orgProfile.account_number || '—'}</td></tr>
        <tr><td style="font-weight:700">IFSC Code</td><td>${orgProfile.ifsc_code || '—'}</td></tr>
        <tr><td style="font-weight:700">UPI ID</td><td>${orgProfile.upi_id || '—'}</td></tr>
      </tbody>
    </table>

    <h2>Terms &amp; Conditions</h2>
    ${orgProfile.terms
      ? `<p>${orgProfile.terms.replace(/\n/g, '<br/>')}</p>`
      : `<ol>
      <li>This receipt is valid as proof of payment for the above-mentioned tour package only.</li>
      <li>The balance amount must be paid <strong>15 days prior</strong> to the tour start date.</li>
      <li>All payments are non-refundable as per the cancellation policy shared at the time of booking.</li>
      <li>In case of any discrepancy, please contact us within <strong>48 hours</strong> of receiving this receipt.</li>
      <li>Any additional expenses such as entrance fees, personal expenses and tips are not included unless specifically mentioned.</li>
    </ol>`}

    <p><em>This is a computer-generated receipt and does not require a physical signature.</em></p>
  `;

  const templateFile = path.join(templateDir, 'receipt.html');
  const template = await fs.readFile(templateFile, 'utf-8');

  let logoSrc: string;
  if (orgProfile.logo_data) {
    logoSrc = orgProfile.logo_data;
  } else {
    const logoFile = path.join(templateDir, 'logo.png');
    logoSrc = `data:image/png;base64,${(await fs.readFile(logoFile)).toString('base64')}`;
  }

  const finalHtml = template
    .replace('{{title}}', 'Payment Receipt')
    .replace(/\$if\(title\)\$[\s\S]*?\$endif\$/g, 'Payment Receipt')
    .replace('{{meta-tags}}', '').replace('$meta-tags$', '')
    .replace('{{logoBase64}}', logoSrc).replace('src="logo.png"', `src="${logoSrc}"`)
    .replace('{{body}}', receiptBody).replace('$body$', receiptBody);

  const browser = await launchBrowser();
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

  return {
    buffer: Buffer.from(pdfBuffer),
    filename: `receipt-${receiptNo.replace(/\//g, '-')}.pdf`,
  };
}
