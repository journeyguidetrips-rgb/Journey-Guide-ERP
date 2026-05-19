import { pool } from '../database/connection';
import { getContext } from '../context/requestContext';

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

/**
 * Admins see all vendors in their org; staff see only their own.
 */
const vendorScopeCondition = (
  roleId: number,
  userId: number,
  orgId: number
): { condition: string; value: number } => {
  if (roleId === 1) {
    return { condition: 'v.org_id = $1', value: orgId };
  }
  return { condition: 'v.user_id = $1', value: userId };
};

export const createVendor = async (data: VendorData) => {
  const { userId, orgId } = getContext();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const vendorResult = await client.query(
      `INSERT INTO vendors (user_id, org_id, name, location) VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, orgId, data.name, data.location || null]
    );
    const vendor = vendorResult.rows[0];

    const contacts: VendorContact[] = [];
    for (const contact of data.contacts || []) {
      if (!contact.contact_name?.trim()) continue;
      const contactResult = await client.query(
        `INSERT INTO vendor_contacts (vendor_id, contact_name, designation, phone, whatsapp, email)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [vendor.id, contact.contact_name, contact.designation || null,
         contact.phone || null, contact.whatsapp || null, contact.email || null]
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

export const getVendors = async () => {
  const { userId, orgId, roleId } = getContext();
  const { condition, value } = vendorScopeCondition(roleId, userId, orgId);
  const result = await pool.query(
    `SELECT v.*,
       COALESCE(json_agg(vc ORDER BY vc.id) FILTER (WHERE vc.id IS NOT NULL), '[]') AS contacts
     FROM vendors v
     LEFT JOIN vendor_contacts vc ON v.id = vc.vendor_id
     WHERE ${condition}
     GROUP BY v.id
     ORDER BY v.name ASC`,
    [value]
  );
  return result.rows;
};

export const searchVendors = async (query: string) => {
  const { userId, orgId, roleId } = getContext();
  const { condition, value } = vendorScopeCondition(roleId, userId, orgId);
  const result = await pool.query(
    `SELECT v.id, v.name, v.location,
       COALESCE(json_agg(vc ORDER BY vc.id) FILTER (WHERE vc.id IS NOT NULL), '[]') AS contacts
     FROM vendors v
     LEFT JOIN vendor_contacts vc ON v.id = vc.vendor_id
     WHERE ${condition} AND v.name ILIKE $2
     GROUP BY v.id
     ORDER BY v.name ASC
     LIMIT 10`,
    [value, `%${query}%`]
  );
  return result.rows;
};

export const updateVendor = async (vendorId: number, data: VendorData) => {
  const { userId, orgId, roleId } = getContext();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Build ownership condition without the 'v.' alias since there's no join here
    const scopeCol = roleId === 1 ? 'org_id' : 'user_id';
    const scopeVal = roleId === 1 ? orgId : userId;

    const vendorResult = await client.query(
      `UPDATE vendors SET name = $1, location = $2, updated_at = NOW()
       WHERE id = $3 AND ${scopeCol} = $4 RETURNING *`,
      [data.name, data.location || null, vendorId, scopeVal]
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
        [vendorId, contact.contact_name, contact.designation || null,
         contact.phone || null, contact.whatsapp || null, contact.email || null]
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

export const deleteVendor = async (vendorId: number) => {
  const { userId, orgId, roleId } = getContext();
  const scopeCol = roleId === 1 ? 'org_id' : 'user_id';
  const scopeVal = roleId === 1 ? orgId : userId;
  const result = await pool.query(
    `DELETE FROM vendors WHERE id = $1 AND ${scopeCol} = $2 RETURNING id`,
    [vendorId, scopeVal]
  );
  return (result.rowCount ?? 0) > 0;
};
