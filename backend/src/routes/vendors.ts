import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { createVendor, getVendors, searchVendors, updateVendor, deleteVendor } from '../services/vendorService';

const router = Router();

router.get('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    if (q.length < 3) return res.json({ success: true, vendors: [] });
    const vendors = await searchVendors(q);
    res.json({ success: true, vendors });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const vendors = await getVendors();
    res.json({ success: true, vendors });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, location, contacts } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Vendor name is required' });
    const vendor = await createVendor({ name, location, contacts });
    res.status(201).json({ success: true, vendor });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, location, contacts } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Vendor name is required' });
    const vendor = await updateVendor(parseInt(req.params.id), { name, location, contacts });
    res.json({ success: true, vendor });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const deleted = await deleteVendor(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
