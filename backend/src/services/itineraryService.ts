import { pool } from '../database/connection';
import { getContext } from '../context/requestContext';

interface GetItinerariesFilters {
  page?: number;
  limit?: number;
  search?: string;
  vendor?: string;
  status?: 'Draft' | 'Published';
  date?: string;
}

/**
 * Returns a WHERE condition and the first parameter value for data scoping.
 * Admins (role_id=1) see all records within their org; staff see only their own.
 */
const scopeCondition = (roleId: number, userId: number, orgId: number): { condition: string; value: number } => {
  if (roleId === 1) {
    return { condition: 'org_id = $1', value: orgId };
  }
  return { condition: 'user_id = $1', value: userId };
};

export const createItinerary = async (
  vendorName: string,
  clientName: string,
  content: string
) => {
  const { userId, orgId } = getContext();
  const result = await pool.query(
    `INSERT INTO itineraries (id, user_id, org_id, vendor_name, client_name, source_content, content, status)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $5, 'Draft')
     RETURNING *`,
    [userId, orgId, vendorName, clientName, content]
  );
  return result.rows[0];
};

export const getItinerary = async (id: string) => {
  const { userId, orgId, roleId } = getContext();
  const { condition, value } = scopeCondition(roleId, userId, orgId);
  const result = await pool.query(
    `SELECT * FROM itineraries WHERE id = $2 AND ${condition}`,
    [value, id]
  );
  return result.rows[0];
};

export const updateItinerary = async (id: string, content: string, template: string) => {
  const { userId, orgId, roleId } = getContext();
  const { condition, value } = scopeCondition(roleId, userId, orgId);
  const result = await pool.query(
    `UPDATE itineraries
     SET content = $3, updated_at = CURRENT_TIMESTAMP, html_content = $4
     WHERE id = $2 AND ${condition}
     RETURNING *`,
    [value, id, content, template]
  );
  return result.rows[0];
};

export const publishItinerary = async (id: string) => {
  const { userId, orgId, roleId } = getContext();
  const { condition, value } = scopeCondition(roleId, userId, orgId);
  const result = await pool.query(
    `UPDATE itineraries
     SET status = 'Published', updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND ${condition}
     RETURNING *`,
    [value, id]
  );
  return result.rows[0];
};

export const deleteItinerary = async (id: string) => {
  const { userId, orgId, roleId } = getContext();
  const { condition, value } = scopeCondition(roleId, userId, orgId);
  const result = await pool.query(
    `DELETE FROM itineraries WHERE id = $2 AND ${condition} RETURNING id`,
    [value, id]
  );
  return (result.rowCount ?? 0) > 0;
};

export const getUserItineraries = async ({
  page = 1,
  limit = 10,
  search,
  vendor,
  status,
  date,
}: GetItinerariesFilters) => {
  const { userId, orgId, roleId } = getContext();
  const offset = (page - 1) * limit;

  const { condition, value } = scopeCondition(roleId, userId, orgId);
  const conditions: string[] = [condition];
  const filterValues: any[] = [value];
  let paramIndex = 2;

  if (search) {
    conditions.push(`client_name ILIKE $${paramIndex}`);
    filterValues.push(`%${search}%`);
    paramIndex++;
  }
  if (vendor) {
    conditions.push(`vendor_name ILIKE $${paramIndex}`);
    filterValues.push(`%${vendor}%`);
    paramIndex++;
  }
  if (status) {
    conditions.push(`status = $${paramIndex}`);
    filterValues.push(status);
    paramIndex++;
  }
  if (date) {
    conditions.push(`DATE(created_at) = $${paramIndex}`);
    filterValues.push(date);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const dataQuery = `
    SELECT * FROM itineraries
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  const dataResult = await pool.query(dataQuery, [...filterValues, limit, offset]);

  const countQuery = `SELECT COUNT(*) FROM itineraries WHERE ${whereClause}`;
  const countResult = await pool.query(countQuery, filterValues);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    itineraries: dataResult.rows,
    total,
    page,
    limit,
    hasMore: offset + dataResult.rows.length < total,
  };
};
