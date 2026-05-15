// src/services/bookingService.ts
import { pool } from '../database/connection'
import { randomUUID } from 'crypto';

interface ConvertToBookingData {
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

interface GetVendorPaymentsFilters {
  userId: number;
  page?: number;
  limit?: number;
  search?: string;        // client_name, vendor_name, or booking_id search
  bookingId?: string;
  vendorName?: string;
  paymentMode?: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque';
  startDate?: string;
  endDate?: string;
}

interface GetClientPaymentsFilters {
  userId: number;
  page?: number;
  limit?: number;
  search?: string;        // client_name or booking_id search
  bookingId?: string;
  paymentType?: 'Advance' | 'Final' | 'Refund' | 'Other';
  paymentMode?: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque';
  startDate?: string;     // YYYY-MM-DD
  endDate?: string;       // YYYY-MM-DD
}

export const getDashboardSummary = async () => {
  const result = await pool.query('SELECT * FROM get_dashboard_summary()');
  return result.rows[0];
};

export const getBookingDetails = async (bookingId: string) => {
  const result = await pool.query('SELECT * FROM get_booking_details($1)', [bookingId]);
  if (result.rows.length === 0) throw new Error('Booking not found');
  return result.rows[0];
};

export const convertItineraryToBooking = async (
  userId: number,
  { itineraryId, sellingPrice, vendorCost, vendorName, phone, whatsapp, travelDate, guests, notes }: ConvertToBookingData
) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const itineraryResult = await client.query(
      `SELECT * FROM itineraries 
       WHERE id = $1 AND user_id = $2 AND status = 'Published'`,
      [itineraryId, userId]
    );
    
    if (itineraryResult.rows.length === 0) {
      throw new Error('Itinerary not found or not eligible for conversion');
    }
    const itinerary = itineraryResult.rows[0];

    const bookingResult = await client.query(
      `INSERT INTO bookings (
        itinerary_id, booking_id, client_name, vendor_name,
        phone, whatsapp, package_name, date_of_booking, travel_date,
        guests, reference_person, notes,
        selling_price, received_from_client, vendor_cost, paid_to_vendor,
        client_status, reminder_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        itineraryId,
        randomUUID(),
        itinerary.client_name,
        vendorName || itinerary.vendor_name,
        phone || null,
        whatsapp || null,
        itinerary.client_name,
        new Date().toISOString().split('T')[0],
        travelDate || null,
        guests || 1,
        null,
        notes || null,
        sellingPrice,
        0,
        vendorCost,
        0,
        'Pending',
        null,
      ]
    );

    await client.query(
      `UPDATE itineraries SET status = 'Converted', updated_at = NOW() WHERE id = $1`,
      [itineraryId]
    );

    await client.query('COMMIT');
    return { success: true, booking: bookingResult.rows[0] };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const revertBookingToItinerary = async (
  userId: number,
  itineraryId: string
) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const itineraryResult = await client.query(
      `SELECT * FROM itineraries 
       WHERE id = $1 AND user_id = $2 AND status = 'Converted'`,
      [itineraryId, userId]
    );
    
    if (itineraryResult.rows.length === 0) {
      throw new Error('Itinerary not found or not eligible for revert');
    }

    await client.query(
      `DELETE FROM client_payments 
       WHERE booking_id IN (
         SELECT booking_id FROM bookings WHERE itinerary_id = $1
       )`,
      [itineraryId]
    );
    
    await client.query(
      `DELETE FROM vendor_payments 
       WHERE booking_id IN (
         SELECT booking_id FROM bookings WHERE itinerary_id = $1
       )`,
      [itineraryId]
    );

    await client.query(
      `DELETE FROM bookings WHERE itinerary_id = $1`,
      [itineraryId]
    );

    await client.query(
      `UPDATE itineraries SET status = 'Published', updated_at = NOW() WHERE id = $1`,
      [itineraryId]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Booking reverted to Published itinerary' };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getBookingWithPayments = async (bookingId: string) => {
  // Fetch booking + aggregated payment totals in parallel
  const [bookingResult, clientAggResult, vendorAggResult, clientPaymentsResult, vendorPaymentsResult] = await Promise.all([
    pool.query(`SELECT * FROM bookings WHERE booking_id = $1`, [bookingId]),
    
    // ✅ Aggregate client payments SUM
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_received FROM client_payments WHERE booking_id = $1`,
      [bookingId]
    ),
    
    // ✅ Aggregate vendor payments SUM
    pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as total_paid FROM vendor_payments WHERE booking_id = $1`,
      [bookingId]
    ),
    
    // Fetch payment history for UI display
    pool.query(
      `SELECT * FROM client_payments WHERE booking_id = $1 ORDER BY payment_date DESC, created_at DESC`,
      [bookingId]
    ),
    pool.query(
      `SELECT * FROM vendor_payments WHERE booking_id = $1 ORDER BY date_paid DESC, created_at DESC`,
      [bookingId]
    ),
  ]);

  const booking = bookingResult.rows[0];
  if (!booking) {
    throw new Error('Booking not found');
  }

  // ✅ Use aggregated totals instead of empty columns
  const totalReceived = parseFloat(clientAggResult.rows[0].total_received) || 0;
  const totalPaid = parseFloat(vendorAggResult.rows[0].total_paid) || 0;
  
  const clientBalanceDue = (parseFloat(booking.selling_price) || 0) - totalReceived;
  const vendorBalanceDue = (parseFloat(booking.vendor_cost) || 0) - totalPaid;

  return {
    success: true,
    booking: {
      ...booking,
      // ✅ Override with calculated totals so frontend gets correct values
      received_from_client: totalReceived,
      paid_to_vendor: totalPaid,
    },
    clientPayments: clientPaymentsResult.rows,
    vendorPayments: vendorPaymentsResult.rows,
    clientBalanceDue,
    vendorBalanceDue,
  };
};

export const addClientPayment = async (
  bookingId: string,
  {
    clientName,
    paymentDate,
    paymentType,
    amount,
    paymentMode,
    referenceUtr,
    packageName,
    remarks,
  }: Omit<AddClientPaymentRequest, 'bookingId'>
) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT selling_price, received_from_client FROM bookings WHERE booking_id = $1 FOR UPDATE`,
      [bookingId]
    );

    console.log("Reterived booking details");
    
    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found');
    }
    
    const currentReceived = bookingResult.rows[0].received_from_client || 0;
    const newReceived = currentReceived + amount;

    const paymentResult = await client.query(
      `INSERT INTO client_payments (
        booking_id, client_name, payment_date, payment_type, amount, 
        payment_mode, reference_utr, package_name, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        bookingId,
        clientName,
        paymentDate,
        paymentType,
        amount,
        paymentMode,
        referenceUtr || null,
        packageName || null,
        remarks || null,
      ]
    );

    console.log("Row Inserted");

    await client.query(
      `UPDATE bookings 
       SET received_from_client = $1, updated_at = NOW()
       WHERE booking_id = $2`,
      [newReceived, bookingId]
    );

    const updatedBooking = await client.query(
      `SELECT selling_price, received_from_client FROM bookings WHERE booking_id = $1`,
      [bookingId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      payment: paymentResult.rows[0],
      bookingBalance: {
        selling_price: updatedBooking.rows[0].selling_price,
        received_from_client: updatedBooking.rows[0].received_from_client,
        balance_due: updatedBooking.rows[0].selling_price - updatedBooking.rows[0].received_from_client,
      },
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const addVendorPayment = async (
  bookingId: string,
  {
    clientName,
    vendorName,
    datePaid,
    amountPaid,
    paymentMode,
    referenceUtr,
    packageName,
    remarks,
  }: Omit<AddVendorPaymentRequest, 'bookingId'>
) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT vendor_cost, paid_to_vendor FROM bookings WHERE booking_id = $1 FOR UPDATE`,
      [bookingId]
    );
    
    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found');
    }
    
    const currentPaid = bookingResult.rows[0].paid_to_vendor || 0;
    const newPaid = currentPaid + amountPaid;

    const paymentResult = await client.query(
      `INSERT INTO vendor_payments (
        booking_id, client_name, vendor_name, date_paid, amount_paid,
        payment_mode, reference_utr, package_name, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        bookingId,
        clientName,
        vendorName,
        datePaid,
        amountPaid,
        paymentMode,
        referenceUtr || null,
        packageName || null,
        remarks || null,
      ]
    );

    await client.query(
      `UPDATE bookings 
       SET paid_to_vendor = $1, updated_at = NOW()
       WHERE booking_id = $2`,
      [newPaid, bookingId]
    );

    const updatedBooking = await client.query(
      `SELECT vendor_cost, paid_to_vendor FROM bookings WHERE booking_id = $1`,
      [bookingId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      payment: paymentResult.rows[0],
      vendorBalance: {
        vendor_cost: updatedBooking.rows[0].vendor_cost,
        paid_to_vendor: updatedBooking.rows[0].paid_to_vendor,
        balance_due: updatedBooking.rows[0].vendor_cost - updatedBooking.rows[0].paid_to_vendor,
      },
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateBooking = async (
  userId: number,
  bookingId: string,
  data: {
    clientName?: string;
    vendorName?: string;
    phone?: string | null;
    whatsapp?: string | null;
    packageName?: string;
    travelDate?: string | null;
    guests?: number;
    sellingPrice?: number;
    vendorCost?: number;
    notes?: string | null;
    clientStatus?: string;
    reminderDate?: string | null;
  }
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify ownership via itinerary join
    const check = await client.query(
      `SELECT b.booking_id FROM bookings b
       INNER JOIN itineraries i ON b.itinerary_id = i.id
       WHERE b.booking_id = $1 AND i.user_id = $2`,
      [bookingId, userId]
    );
    if (check.rows.length === 0) throw new Error('Booking not found');

    const result = await client.query(
      `UPDATE bookings SET
         client_name   = COALESCE($1,  client_name),
         vendor_name   = COALESCE($2,  vendor_name),
         phone         = $3,
         whatsapp      = $4,
         package_name  = COALESCE($5,  package_name),
         travel_date   = $6,
         guests        = COALESCE($7,  guests),
         selling_price = COALESCE($8,  selling_price),
         vendor_cost   = COALESCE($9,  vendor_cost),
         notes         = $10,
         client_status = COALESCE($11, client_status),
         reminder_date = $12,
         updated_at    = NOW()
       WHERE booking_id = $13
       RETURNING *`,
      [
        data.clientName, data.vendorName,
        data.phone ?? null, data.whatsapp ?? null,
        data.packageName,
        data.travelDate ?? null,
        data.guests, data.sellingPrice, data.vendorCost,
        data.notes ?? null,
        data.clientStatus,
        data.reminderDate ?? null,
        bookingId,
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateClientPayment = async (
  bookingId: string,
  paymentId: number,
  data: {
    clientName?: string;
    paymentDate?: string;
    paymentType?: string;
    amount?: number;
    paymentMode?: string;
    referenceUtr?: string | null;
    packageName?: string | null;
    remarks?: string | null;
  }
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE client_payments SET
         client_name   = COALESCE($1, client_name),
         payment_date  = COALESCE($2, payment_date),
         payment_type  = COALESCE($3, payment_type),
         amount        = COALESCE($4, amount),
         payment_mode  = COALESCE($5, payment_mode),
         reference_utr = $6,
         package_name  = $7,
         remarks       = $8
       WHERE id = $9 AND booking_id = $10
       RETURNING *`,
      [
        data.clientName, data.paymentDate, data.paymentType, data.amount, data.paymentMode,
        data.referenceUtr ?? null, data.packageName ?? null, data.remarks ?? null,
        paymentId, bookingId,
      ]
    );
    if (result.rows.length === 0) throw new Error('Payment not found');

    // Recompute and sync the booking cache column
    const sumResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM client_payments WHERE booking_id = $1`,
      [bookingId]
    );
    await client.query(
      `UPDATE bookings SET received_from_client = $1, updated_at = NOW() WHERE booking_id = $2`,
      [sumResult.rows[0].total, bookingId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateVendorPayment = async (
  bookingId: string,
  paymentId: number,
  data: {
    clientName?: string;
    vendorName?: string;
    datePaid?: string;
    amountPaid?: number;
    paymentMode?: string;
    referenceUtr?: string | null;
    packageName?: string | null;
    remarks?: string | null;
  }
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE vendor_payments SET
         client_name   = COALESCE($1, client_name),
         vendor_name   = COALESCE($2, vendor_name),
         date_paid     = COALESCE($3, date_paid),
         amount_paid   = COALESCE($4, amount_paid),
         payment_mode  = COALESCE($5, payment_mode),
         reference_utr = $6,
         package_name  = $7,
         remarks       = $8
       WHERE id = $9 AND booking_id = $10
       RETURNING *`,
      [
        data.clientName, data.vendorName, data.datePaid, data.amountPaid, data.paymentMode,
        data.referenceUtr ?? null, data.packageName ?? null, data.remarks ?? null,
        paymentId, bookingId,
      ]
    );
    if (result.rows.length === 0) throw new Error('Payment not found');

    // Recompute and sync the booking cache column
    const sumResult = await client.query(
      `SELECT COALESCE(SUM(amount_paid), 0) AS total FROM vendor_payments WHERE booking_id = $1`,
      [bookingId]
    );
    await client.query(
      `UPDATE bookings SET paid_to_vendor = $1, updated_at = NOW() WHERE booking_id = $2`,
      [sumResult.rows[0].total, bookingId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getBookings = async ({
  userId,
  page = 1,
  limit = 10,
  search,
  vendor,
  status,
  travelDate,
  bookingDate,
  minSellingPrice,
  maxSellingPrice,
}: GetBookingsFilters) => {
  const offset = (page - 1) * limit;

  // 1️⃣ Build WHERE conditions & filter values
  const conditions: string[] = ['i.user_id = $1'];
  const filterValues: any[] = [userId];
  let paramIndex = 2;

  if (search) {
    conditions.push(`b.client_name ILIKE $${paramIndex}`);
    filterValues.push(`%${search}%`);
    paramIndex++;
  }
  if (vendor) {
    conditions.push(`b.vendor_name ILIKE $${paramIndex}`);
    filterValues.push(`%${vendor}%`);
    paramIndex++;
  }
  if (status) {
    conditions.push(`b.client_status = $${paramIndex}`);
    filterValues.push(status);
    paramIndex++;
  }
  if (travelDate) {
    conditions.push(`b.travel_date = $${paramIndex}`);
    filterValues.push(travelDate);
    paramIndex++;
  }
  if (bookingDate) {
    conditions.push(`b.date_of_booking = $${paramIndex}`);
    filterValues.push(bookingDate);
    paramIndex++;
  }
  if (minSellingPrice !== undefined) {
    conditions.push(`b.selling_price >= $${paramIndex}`);
    filterValues.push(minSellingPrice);
    paramIndex++;
  }
  if (maxSellingPrice !== undefined) {
    conditions.push(`b.selling_price <= $${paramIndex}`);
    filterValues.push(maxSellingPrice);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // 2️⃣ Data Query with aggregated payment totals
  // ✅ LEFT JOIN client_payments to calculate received_from_client
  // ✅ LEFT JOIN vendor_payments to calculate paid_to_vendor
  const dataQuery = `
    SELECT 
      b.*,
      i.client_name as itinerary_client,
      i.vendor_name as itinerary_vendor,
      -- ✅ Calculate real received_from_client from payment logs
      COALESCE(cp_agg.total_received, 0) as calculated_received,
      -- ✅ Calculate real paid_to_vendor from payment logs
      COALESCE(vp_agg.total_paid, 0) as calculated_paid
    FROM bookings b
    INNER JOIN itineraries i ON b.itinerary_id = i.id
    -- Aggregate client payments per booking
    LEFT JOIN (
      SELECT booking_id, SUM(amount) as total_received
      FROM client_payments
      GROUP BY booking_id
    ) cp_agg ON b.booking_id = cp_agg.booking_id
    -- Aggregate vendor payments per booking
    LEFT JOIN (
      SELECT booking_id, SUM(amount_paid) as total_paid
      FROM vendor_payments
      GROUP BY booking_id
    ) vp_agg ON b.booking_id = vp_agg.booking_id
    WHERE ${whereClause}
    ORDER BY b.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  const dataValues = [...filterValues, limit, offset];
  const dataResult = await pool.query(dataQuery, dataValues);

  // 3️⃣ Count Query (same WHERE clause, no pagination)
  const countQuery = `
    SELECT COUNT(*) 
    FROM bookings b
    INNER JOIN itineraries i ON b.itinerary_id = i.id
    WHERE ${whereClause}
  `;
  const countResult = await pool.query(countQuery, filterValues);
  const total = parseInt(countResult.rows[0].count, 10);

  // ✅ Override empty columns with calculated totals
  const bookingsWithCalculatedTotals = dataResult.rows.map(booking => ({
    ...booking,
    received_from_client: parseFloat(booking.calculated_received) || 0,
    paid_to_vendor: parseFloat(booking.calculated_paid) || 0,
    // Remove helper columns so frontend doesn't see them
  }));

  return {
    bookings: bookingsWithCalculatedTotals,
    total,
    page,
    limit,
    hasMore: offset + dataResult.rows.length < total,
  };
};

export const getClientPayments = async ({
  userId,
  page = 1,
  limit = 20,
  search,
  bookingId,
  paymentType,
  paymentMode,
  startDate,
  endDate,
}: GetClientPaymentsFilters) => {
  const offset = (page - 1) * limit;

  // Build WHERE clause - join bookings to filter by user
  const conditions: string[] = [];
  const filterValues: any[] = [userId];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(cp.client_name ILIKE $${paramIndex} OR cp.booking_id ILIKE $${paramIndex})`);
    filterValues.push(`%${search}%`);
    paramIndex++;
  }
  if (bookingId) {
    conditions.push(`cp.booking_id = $${paramIndex}`);
    filterValues.push(bookingId);
    paramIndex++;
  }
  if (paymentType) {
    conditions.push(`cp.payment_type = $${paramIndex}`);
    filterValues.push(paymentType);
    paramIndex++;
  }
  if (paymentMode) {
    conditions.push(`cp.payment_mode = $${paramIndex}`);
    filterValues.push(paymentMode);
    paramIndex++;
  }
  if (startDate) {
    conditions.push(`cp.payment_date >= $${paramIndex}`);
    filterValues.push(startDate);
    paramIndex++;
  }
  if (endDate) {
    conditions.push(`cp.payment_date <= $${paramIndex}`);
    filterValues.push(endDate);
    paramIndex++;
  }

  const whereClause = conditions.length ? 'WHERE ' +  conditions.join(' AND ') : '';

  // Data query with JOIN to get booking details
  const dataQuery = `
    SELECT 
      cp.*,
      b.client_name as booking_client,
      b.vendor_name as booking_vendor,
      b.package_name as booking_package
    FROM client_payments cp
    INNER JOIN bookings b ON cp.booking_id = b.booking_id
    INNER JOIN itineraries i ON b.itinerary_id = i.id
    ${whereClause}
    ORDER BY cp.payment_date DESC, cp.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataValues = conditions.length ? [...filterValues, limit, offset] : [limit, offset];
  const dataResult = await pool.query(dataQuery, dataValues);

  // Count query
  const countQuery = `
    SELECT COUNT(*) 
    FROM client_payments cp
    INNER JOIN bookings b ON cp.booking_id = b.booking_id
    INNER JOIN itineraries i ON b.itinerary_id = i.id
    ${whereClause}
  `;
  const countResult = conditions.length ? await pool.query(countQuery, filterValues) : await pool.query(countQuery);
  const total = parseInt(countResult.rows[0].count, 10);  

  return {
    payments: dataResult.rows,
    total,
    page,
    limit,
    hasMore: offset + dataResult.rows.length < total,
  };
};

export const getVendorPayments = async ({
  userId,
  page = 1,
  limit = 20,
  search,
  bookingId,
  vendorName,
  paymentMode,
  startDate,
  endDate,
}: GetVendorPaymentsFilters) => {
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const filterValues: any[] = [userId];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(vp.client_name ILIKE $${paramIndex} OR vp.vendor_name ILIKE $${paramIndex} OR vp.booking_id ILIKE $${paramIndex})`);
    filterValues.push(`%${search}%`);
    paramIndex++;
  }
  if (bookingId) {
    conditions.push(`vp.booking_id = $${paramIndex}`);
    filterValues.push(bookingId);
    paramIndex++;
  }
  if (vendorName) {
    conditions.push(`vp.vendor_name ILIKE $${paramIndex}`);
    filterValues.push(`%${vendorName}%`);
    paramIndex++;
  }
  if (paymentMode) {
    conditions.push(`vp.payment_mode = $${paramIndex}`);
    filterValues.push(paymentMode);
    paramIndex++;
  }
  if (startDate) {
    conditions.push(`vp.date_paid >= $${paramIndex}`);
    filterValues.push(startDate);
    paramIndex++;
  }
  if (endDate) {
    conditions.push(`vp.date_paid <= $${paramIndex}`);
    filterValues.push(endDate);
    paramIndex++;
  }

  const whereClause = conditions.length ? 'WHERE ' +  conditions.join(' AND ') : '';

  const dataQuery = `
    SELECT 
      vp.*,
      b.client_name as booking_client,
      b.package_name as booking_package
    FROM vendor_payments vp
    INNER JOIN bookings b ON vp.booking_id = b.booking_id
    INNER JOIN itineraries i ON b.itinerary_id = i.id
    ${whereClause}
    ORDER BY vp.date_paid DESC, vp.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataValues = conditions.length ? [...filterValues, limit, offset] : [limit, offset];
  const dataResult = await pool.query(dataQuery, dataValues);

  const countQuery = `
    SELECT COUNT(*) 
    FROM vendor_payments vp
    INNER JOIN bookings b ON vp.booking_id = b.booking_id
    INNER JOIN itineraries i ON b.itinerary_id = i.id
    ${whereClause}
  `;
  const countResult = conditions.length ? await pool.query(countQuery, filterValues) : await pool.query(countQuery);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    payments: dataResult.rows,
    total,
    page,
    limit,
    hasMore: offset + dataResult.rows.length < total,
  };
};