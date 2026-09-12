// src/routes/settings.ts
import { Router, Request, Response } from 'express';
import { authenticate, isAdmin } from '../middleware/authMiddleware';
import { getContext } from '../context/requestContext';
import { pool } from '../database/connection';
import { convertToXmlComponent } from 'docx';

const router = Router();

// GET /api/settings — fetch the org profile for the current admin's org
router.get('/', authenticate, isAdmin, async (_req: Request, res: Response) => {
  try {
    const { orgId } = getContext();

    const [profileResult, orgResult] = await Promise.all([
      pool.query('SELECT * FROM organization_profiles WHERE org_id = $1', [orgId]),
      pool.query('SELECT name FROM organizations WHERE id = $1', [orgId]),
    ]);

    const profile = profileResult.rows[0] || {};
    const org = orgResult.rows[0] || {};

    res.json({
      success: true,
      settings: {
        companyName:   org.name || '',
        logoData:      profile.logo_data || null,
        accountName:   profile.account_name || '',
        accountNumber: profile.account_number || '',
        ifscCode:      profile.ifsc_code || '',
        upiId:         profile.upi_id || '',
        address:       profile.address || '',
        phone:         profile.phone || '',
        email:         profile.email || '',
        terms:         profile.terms || '',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

// PUT /api/settings — update the org profile
router.put('/', authenticate, isAdmin, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { orgId } = getContext();
    const {
      companyName, logoData, accountName, accountNumber,
      ifscCode, upiId, address, phone, email, terms,
    } = req.body.settings;

    await client.query('BEGIN');

    if (companyName !== undefined) {
      await client.query('UPDATE organizations SET name = $1 WHERE id = $2', [companyName, orgId]);
    }

    await client.query(
      `INSERT INTO organization_profiles
        (org_id, account_name, account_number, ifsc_code, upi_id, address, phone, email, terms, logo_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (org_id) DO UPDATE SET
        account_name   = CASE WHEN $2 IS NOT NULL AND $2 != '' THEN $2 ELSE organization_profiles.account_name END,
        account_number = CASE WHEN $3 IS NOT NULL AND $3 != '' THEN $3 ELSE organization_profiles.account_number END,
        ifsc_code      = CASE WHEN $4 IS NOT NULL AND $4 != '' THEN $4 ELSE organization_profiles.ifsc_code END,
        upi_id         = CASE WHEN $5 IS NOT NULL AND $5 != '' THEN $5 ELSE organization_profiles.upi_id END,
        address        = CASE WHEN $6 IS NOT NULL AND $6 != '' THEN $6 ELSE organization_profiles.address END,
        phone          = CASE WHEN $7 IS NOT NULL AND $7 != '' THEN $7 ELSE organization_profiles.phone END,
        email          = CASE WHEN $8 IS NOT NULL AND $8 != '' THEN $8 ELSE organization_profiles.email END,
        terms          = CASE WHEN $9 IS NOT NULL AND $9 != '' THEN $9 ELSE organization_profiles.terms END,
        logo_data      = CASE WHEN $10 IS NOT NULL THEN $10 ELSE organization_profiles.logo_data END`,
      [
        orgId,
        accountName || null,   // Pass NULL if empty
        accountNumber || null,
        ifscCode || null,
        upiId || null,
        address || null,
        phone || null,
        email || null,
        terms || null,
        logoData || null,       // Pass NULL if empty
      ]
    );

    await client.query('COMMIT');

    res.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  } finally {
    client.release();
  }
});

export default router;
