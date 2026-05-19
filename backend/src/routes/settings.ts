// src/routes/settings.ts
import { Router, Request, Response } from 'express';
import { authenticate, isAdmin } from '../middleware/authMiddleware';
import { getContext } from '../context/requestContext';
import { pool } from '../database/connection';

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
  try {
    const { orgId } = getContext();
    const {
      companyName, logoData, accountName, accountNumber,
      ifscCode, upiId, address, phone, email, terms,
    } = req.body;

    await pool.query('BEGIN');

    if (companyName !== undefined) {
      await pool.query('UPDATE organizations SET name = $1 WHERE id = $2', [companyName, orgId]);
    }

    await pool.query(
      `INSERT INTO organization_profiles
         (org_id, account_name, account_number, ifsc_code, upi_id, address, phone, email, terms, logo_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (org_id) DO UPDATE SET
         account_name   = EXCLUDED.account_name,
         account_number = EXCLUDED.account_number,
         ifsc_code      = EXCLUDED.ifsc_code,
         upi_id         = EXCLUDED.upi_id,
         address        = EXCLUDED.address,
         phone          = EXCLUDED.phone,
         email          = EXCLUDED.email,
         terms          = EXCLUDED.terms,
         logo_data      = EXCLUDED.logo_data`,
      [
        orgId,
        accountName   || '',
        accountNumber || '',
        ifscCode      || '',
        upiId         || '',
        address       || '',
        phone         || '',
        email         || '',
        terms         || '',
        logoData      || null,
      ]
    );

    await pool.query('COMMIT');

    res.json({ success: true });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

export default router;
