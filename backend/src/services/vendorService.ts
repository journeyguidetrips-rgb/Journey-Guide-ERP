import { pool } from '../database/connection';

export interface VendorContact {
  id?: number;
  contact_name: string;
  designation?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
}

export interface VendorData {
  name: string;
  location?: string;
  contacts?: VendorContact[];
}

export const createVendor = async (userId: number, data: VendorData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const vendorResult = await client.query(
      `INSERT INTO vendors (user_id, name, location) VALUES ($1, $2, $3) RETURNING *`,
      [userId, data.name, data.location || null]
    );
    const vendor = vendorResult.rows[0];

    const contacts: VendorContact[] = [];
    for (const contact of data.contacts || []) {
      if (!contact.contact_name?.trim()) continue;
      const contactResult = await client.query(
        `INSERT INTO vendor_contacts (vendor_id, contact_name, designation, phone, whatsapp, email)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [vendor.id, contact.contact_name, contact.designation || null, contact.phone || null, contact.whatsapp || null, contact.email || null]
      );
      contacts.push(contactResult.rows[0]);
    }

    await client.query('COMMIT');
    return { ...vendor, contacts };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getVendors = async (userId: number) => {
  const result = await pool.query(
    `SELECT v.*,
       COALESCE(json_agg(vc ORDER BY vc.id) FILTER (WHERE vc.id IS NOT NULL), '[]') AS contacts
     FROM vendors v
     LEFT JOIN vendor_contacts vc ON v.id = vc.vendor_id
     WHERE v.user_id = $1
     GROUP BY v.id
     ORDER BY v.name ASC`,
    [userId]
  );
  return result.rows;
};

export const searchVendors = async (userId: number, query: string) => {
  const result = await pool.query(
    `SELECT v.id, v.name, v.location,
       COALESCE(json_agg(vc ORDER BY vc.id) FILTER (WHERE vc.id IS NOT NULL), '[]') AS contacts
     FROM vendors v
     LEFT JOIN vendor_contacts vc ON v.id = vc.vendor_id
     WHERE v.user_id = $1 AND v.name ILIKE $2
     GROUP BY v.id
     ORDER BY v.name ASC
     LIMIT 10`,
    [userId, `%${query}%`]
  );
  return result.rows;
};

export const updateVendor = async (userId: number, vendorId: number, data: VendorData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const vendorResult = await client.query(
      `UPDATE vendors SET name = $1, location = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [data.name, data.location || null, vendorId, userId]
    );
    if (vendorResult.rows.length === 0) throw new Error('Vendor not found');
    const vendor = vendorResult.rows[0];

    await client.query(`DELETE FROM vendor_contacts WHERE vendor_id = $1`, [vendorId]);

    const contacts: VendorContact[] = [];
    for (const contact of data.contacts || []) {
      if (!contact.contact_name?.trim()) continue;
      const contactResult = await client.query(
        `INSERT INTO vendor_contacts (vendor_id, contact_name, designation, phone, whatsapp, email)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [vendorId, contact.contact_name, contact.designation || null, contact.phone || null, contact.whatsapp || null, contact.email || null]
      );
      contacts.push(contactResult.rows[0]);
    }

    await client.query('COMMIT');
    return { ...vendor, contacts };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteVendor = async (userId: number, vendorId: number) => {
  const result = await pool.query(
    `DELETE FROM vendors WHERE id = $1 AND user_id = $2 RETURNING id`,
    [vendorId, userId]
  );
  return (result.rowCount ?? 0) > 0;
};
