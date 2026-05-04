// src/services/bookingService.ts
import { pool } from '../database/config'
import { Router, Request, Response } from 'express';

const router = Router();
interface ConvertToBookingData {
  itineraryId: string;
  sellingPrice: number;
  vendorCost: number;
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

const generateBookingId = async (): Promise<string> => {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM bookings`
  );
  const count = parseInt(result.rows[0].count, 10) + 1;
  return `JG-${String(count).padStart(4, '0')}`;
};

export const convertItineraryToBooking = async (
  userId: number,
  { itineraryId, sellingPrice, vendorCost, phone, whatsapp, travelDate, guests, notes }: ConvertToBookingData
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

    const bookingId = await generateBookingId();

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
        bookingId,
        itinerary.client_name,
        itinerary.vendor_name,
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
  const [bookingResult, clientPaymentsResult, vendorPaymentsResult] = await Promise.all([
    pool.query(`SELECT * FROM bookings WHERE booking_id = $1`, [bookingId]),
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

  const clientBalanceDue = (booking.selling_price || 0) - (booking.received_from_client || 0);
  const vendorBalanceDue = (booking.vendor_cost || 0) - (booking.paid_to_vendor || 0);

  return {
    success: true,
    booking,
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
  // Bookings link to users via itineraries table
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

  // 2️⃣ Data Query (JOIN with itineraries to filter by user)
  const dataQuery = `
    SELECT b.*, i.client_name as itinerary_client, i.vendor_name as itinerary_vendor
    FROM bookings b
    INNER JOIN itineraries i ON b.itinerary_id = i.id
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

  return {
    bookings: dataResult.rows,
    total,
    page,
    limit,
    hasMore: offset + dataResult.rows.length < total,
  };
};