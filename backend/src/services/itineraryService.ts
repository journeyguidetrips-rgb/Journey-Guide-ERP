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
    return { condition: 'i.org_id = $1', value: orgId };
  }
  return { condition: 'i.user_id = $1', value: userId };
};

export const createItinerary = async (
  vendorName: string,
  clientName: string,
  content: string
) => {
  const { userId, orgId } = getContext();
  const result = await pool.query(
    `SELECT create_itinerary($1, $2, $3, $4, $5);`,    
    [userId, orgId, vendorName, clientName, content]
  );
  return result.rows[0];
};

export const getItinerary = async (id: string) => {
  const { userId, orgId, roleId } = getContext();
  const { condition, value } = scopeCondition(roleId, userId, orgId);
  const result = await pool.query(
    `SELECT
      i.id,
      i.user_id,
      i.org_id,
      i.vendor_name,
      i.client_name,
      i.status,
      i.created_at,
      convert_from(ic.content, 'UTF8') AS source_md_content,
      convert_from(ie.content, 'UTF8') AS edited_md_content
    FROM 
      itineraries i
      LEFT JOIN itinerary_contents ic ON i.id = ic.itinerary_id AND ic.content_type = 'source_md'
      LEFT JOIN itinerary_contents ie ON i.id = ie.itinerary_id AND ie.content_type = 'edited_md'
    WHERE 
      i.id = $2 AND ${condition}`,
    [value, id]
  );
  return result.rows[0];
};

export const updateItinerary = async (id: string, content: string) => {
  const { userId, orgId, roleId } = getContext();
  const { condition, value } = scopeCondition(roleId, userId, orgId);
  const result = await pool.query(
    `UPDATE 
      public.itinerary_contents ic
    SET
      content = convert_to($3, 'UTF-8'),
      updated_at = CURRENT_TIMESTAMP
    FROM 
      public.itineraries i
    WHERE
      ic.itinerary_id = $2
      AND ic.content_type = 'edited_md'
      AND ${condition}
    RETURNING *;`,
    [value, id, content]
  );
  return result.rows[0];
};

export const publishItinerary = async (id: string) => {
  const { userId, orgId, roleId } = getContext();
  const { condition, value } = scopeCondition(roleId, userId, orgId);

  const result = await pool.query(
    `UPDATE itineraries i
     SET status = 'Published', updated_at = CURRENT_TIMESTAMP
     WHERE i.id = $2 AND ${condition}
     RETURNING *`,
    [value, id]
  );
  
  return result.rows[0];
};

export const deleteItinerary = async (id: string) => {
  const { userId, orgId, roleId } = getContext();
  const { condition, value } = scopeCondition(roleId, userId, orgId);
  const result = await pool.query(
    `DELETE FROM itineraries i WHERE i.id = $2 AND ${condition} RETURNING id`,
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
    conditions.push(`i.client_name ILIKE $${paramIndex}`);
    filterValues.push(`%${search}%`);
    paramIndex++;
  }
  if (vendor) {
    conditions.push(`i.vendor_name ILIKE $${paramIndex}`);
    filterValues.push(`%${vendor}%`);
    paramIndex++;
  }
  if (status) {
    conditions.push(`i.status = $${paramIndex}`);
    filterValues.push(status);
    paramIndex++;
  }
  if (date) {
    conditions.push(`i.DATE(created_at) = $${paramIndex}`);
    filterValues.push(date);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const dataQuery = `
    SELECT
      i.id,
      i.user_id,
      i.org_id,
      i.vendor_name,
      i.client_name,
      i.status,
      i.created_at
    FROM 
      itineraries i
    WHERE 
      ${whereClause}
    ORDER BY 
      i.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const dataResult = await pool.query(dataQuery, [...filterValues, limit, offset]);

  const countQuery = `SELECT COUNT(*) FROM itineraries i WHERE ${whereClause}`;
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
