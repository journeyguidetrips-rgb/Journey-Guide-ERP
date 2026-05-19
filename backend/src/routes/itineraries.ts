import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/authMiddleware';
import { marked } from 'marked';
import {
  createItinerary,
  getItinerary,
  getUserItineraries,
  updateItinerary,
  publishItinerary,
  deleteItinerary,
} from '../services/itineraryService';
import { generateItineraryPDF } from '../services/pdfService';
import { validateRequest } from '../middleware/validateRequest';
import { UpdateItinerarySchema, UploadItinerarySchema } from '../schemas/itinerarySchemas';

const router = express.Router();

// Configure multer for file upload
const uploadDir = path.join(process.cwd(), 'uploads');
const templateFile = path.join(process.cwd(), 'templates', 'itinerary.html');
const logoFile = path.join(process.cwd(), 'templates', 'logo.png');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Modified: Only allow markdown files
    const isMarkdown = 
      file.mimetype === 'text/markdown' || 
      file.originalname.endsWith('.md');
      
    if (isMarkdown) {
      cb(null, true);
    } else {
      cb(new Error('Only Markdown (.md) files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // Reduced to 10MB (markdown is small)
});

// Upload and process markdown itinerary
router.post('/upload', authenticate, upload.single('file'), validateRequest(UploadItinerarySchema), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { clientName, vendorName } = req.body;

    console.log(`\n📤 Processing markdown upload: ${req.file.originalname}`);

    // Step 1: Read markdown content directly from the uploaded file
    const markdownContent = await fs.readFile(req.file.path, 'utf-8');

    // Step 2: Create itinerary in database
    const itinerary = await createItinerary(vendorName, clientName, markdownContent);

    if (!itinerary) {
      return res.status(500).json({ error: 'Failed to create itinerary' });
    }

    // Step 4: Update with HTML content
    await updateItinerary(itinerary.id, markdownContent, templateFile);

    // Clean up: Optional: delete the temp file after reading into DB
    await fs.unlink(req.file.path).catch(err => console.error("Temp file cleanup failed:", err));

    res.json({
      success: true,
      message: 'Markdown itinerary uploaded successfully',
      itinerary: {
        id: itinerary.id,
        client_name: clientName,
        vendor_name: vendorName,
        content: markdownContent,
        source_content: markdownContent,
        status: 'Draft',
      },
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to process file' });
  }
});

// Get user's itineraries
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page, limit, search, vendor, status, date } = req.query;

    const result = await getUserItineraries({
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
      search: search as string,
      vendor: vendor as string,
      status: status as 'Draft' | 'Published',
      date: date as string,
    });

    res.json({
      success: true,
      itineraries: result.itineraries,
      total: result.total,  // ✅ Critical: return total count
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single itinerary
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const itinerary = await getItinerary(req.params.id);

    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    res.json({
      success: true,
      itinerary,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update itinerary content
router.put('/:id', authenticate, validateRequest(UpdateItinerarySchema), async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const htmlBody = marked(content);

    const logoBuffer = await fs.readFile(logoFile);
    const logoBase64 = logoBuffer.toString('base64');
    const logoSrc = `data:image/png;base64,${logoBase64}`;

    const template = await fs.readFile(templateFile, 'utf-8');
    const finalHtml = template
      .replace('{{title}}', 'Journey Guide')
      .replace('{{meta-tags}}', '')
      .replace('{{logoBase64}}', `${logoSrc}`)
      .replace('{{body}}', htmlBody);

    // Update itinerary
    const itinerary = await updateItinerary(req.params.id, content, finalHtml);

    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    res.json({
      success: true,
      message: 'Itinerary updated successfully',
      itinerary,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Publish itinerary
router.post('/:id/publish', authenticate, async (req: Request, res: Response) => {
  try {
    const itinerary = await publishItinerary(req.params.id);

    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    res.json({
      success: true,
      message: 'Itinerary published successfully',
      itinerary,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete itinerary
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const success = await deleteItinerary(req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    res.json({
      success: true,
      message: 'Itinerary deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Download PDF
router.get('/:id/download-pdf', authenticate, async (req: Request, res: Response) => {
  try {
    const pdfBuffer = await generateItineraryPDF(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="itinerary-${req.params.id}.pdf"`);
    res.status(200).end(pdfBuffer, 'binary');
  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    const status = error.message === 'Itinerary not found' ? 404 : 500;
    res.status(status).json({ error: error.message || 'Failed to generate PDF' });
  }
});

export default router;