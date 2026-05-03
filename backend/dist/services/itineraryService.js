"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteItinerary = exports.publishItinerary = exports.updateItinerary = exports.getUserItineraries = exports.getItinerary = exports.createItinerary = void 0;
const pg_1 = require("pg");
// Configure your DB connection (adjust env vars as needed)
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
// Create a new itinerary
const createItinerary = async (userId, vendorName, clientName, content) => {
    const result = await pool.query(`INSERT INTO itineraries (id, user_id, vendor_name, client_name, content, status)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'draft')
     RETURNING *`, [userId, vendorName, clientName, content]);
    return result.rows[0];
};
exports.createItinerary = createItinerary;
// Get a single itinerary by ID
const getItinerary = async (id) => {
    const result = await pool.query(`SELECT * FROM itineraries WHERE id = $1`, [id]);
    return result.rows[0];
};
exports.getItinerary = getItinerary;
// Get all itineraries for a user
const getUserItineraries = async (userId) => {
    const result = await pool.query(`SELECT * FROM itineraries WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    return result.rows;
};
exports.getUserItineraries = getUserItineraries;
// Update itinerary content + HTML
const updateItinerary = async (id, content, htmlContent) => {
    const result = await pool.query(`UPDATE itineraries
     SET content = $2, html_content = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`, [id, content, htmlContent]);
    return result.rows[0];
};
exports.updateItinerary = updateItinerary;
// Publish itinerary
const publishItinerary = async (id) => {
    const result = await pool.query(`UPDATE itineraries
     SET status = 'published', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`, [id]);
    return result.rows[0];
};
exports.publishItinerary = publishItinerary;
// Delete itinerary
const deleteItinerary = async (id) => {
    const result = await pool.query(`DELETE FROM itineraries WHERE id = $1 RETURNING id`, [id]);
    return result.rowCount > 0;
};
exports.deleteItinerary = deleteItinerary;
//# sourceMappingURL=itineraryService.js.map