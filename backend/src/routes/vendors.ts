import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { createVendor, getVendors, searchVendors, updateVendor, deleteVendor } from '../services/vendorService';

const router = Router();

// GET /api/vendors/search?q=xxx  (must be before /:id)
router.get('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    if (q.length < 3) return res.json({ success: true, vendors: [] });
    const vendors = await searchVendors(req.user!.id, q);
    res.json({ success: true, vendors });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vendors
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const vendors = await getVendors(req.user!.id);
    res.json({ success: true, vendors });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vendors
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, location, contacts } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Vendor name is required' });
    const vendor = await createVendor(req.user!.id, { name, location, contacts });
    res.status(201).json({ success: true, vendor });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/vendors/:id
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, location, contacts } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Vendor name is required' });
    const vendor = await updateVendor(req.user!.id, parseInt(req.params.id), { name, location, contacts });
    res.json({ success: true, vendor });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/vendors/:id
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteVendor(req.user!.id, parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
