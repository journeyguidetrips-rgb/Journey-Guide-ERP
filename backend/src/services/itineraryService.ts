import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

// Configure your DB connection (adjust env vars as needed)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Configure this for conversion of md to html
const execAsync = promisify(exec);

// Create a new itinerary
export const createItinerary = async (
  userId: number,
  vendorName: string,
  clientName: string,
  content: string
) => {
  const result = await pool.query(
    `INSERT INTO itineraries (id, user_id, vendor_name, client_name, source_content, content, status)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $4, 'Draft')
     RETURNING *`,
    [userId, vendorName, clientName, content]
  );
  return result.rows[0];
};

// Get a single itinerary by ID
export const getItinerary = async (id: string) => {
  const result = await pool.query(
    `SELECT * FROM itineraries WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};

// Get all itineraries for a user
/* export const getUserItineraries = async (userId: number) => {
  const result = await pool.query(
    `SELECT * FROM itineraries WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}; */

// Update itinerary content + HTML
export const updateItinerary = async (
  id: string,
  content: string,
  template: string
) => {
  try {
    // const cmd = `pandoc "${content}" --template="${template}" --from=markdown+raw_html --to=html5 --standalone`;
    // const { stdout } = await execAsync(cmd); // capture HTML directly

    const result = await pool.query(
      `UPDATE itineraries
       SET content = $2, updated_at = CURRENT_TIMESTAMP, html_content = $3
       WHERE id = $1
       RETURNING *`,
      [id, content, template]
    );
    
    return result.rows[0];
  } catch (error: any) {
    console.error('❌ Pandoc conversion failed:', error.message);
    throw error;
  }
};

// Publish itinerary
export const publishItinerary = async (id: string) => {
  const result = await pool.query(
    `UPDATE itineraries
     SET status = 'Published', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0];
};

// Delete itinerary
export const deleteItinerary = async (id: string) => {
  const result = await pool.query(
    `DELETE FROM itineraries WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rowCount > 0;
};

// Get all itineraries for a user
interface GetItinerariesFilters {
  userId: number;
  page?: number;
  limit?: number;
  search?: string;
  vendor?: string;
  status?: 'Draft' | 'Published';
  date?: string;
}

export const getUserItineraries = async ({
  userId,
  page = 1,
  limit = 10,
  search,
  vendor,
  status,
  date,
}: GetItinerariesFilters) => {
  const offset = (page - 1) * limit;

  // 1️⃣ Build WHERE conditions & filter values
  const conditions: string[] = ['user_id = $1'];
  const filterValues: any[] = [userId];
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

  // 2️⃣ Data Query (needs LIMIT & OFFSET)
  const dataQuery = `
    SELECT * FROM itineraries 
    WHERE ${whereClause} 
    ORDER BY created_at DESC 
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  const dataValues = [...filterValues, limit, offset];
  const dataResult = await pool.query(dataQuery, dataValues);

  // 3️⃣ Count Query (ONLY needs filter values, NO pagination)
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