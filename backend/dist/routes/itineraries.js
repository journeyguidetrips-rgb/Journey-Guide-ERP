"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const authMiddleware_1 = require("../middleware/authMiddleware");
const itineraryService_1 = require("../services/itineraryService");
const fileProcessingService_1 = require("../services/fileProcessingService");
const router = express_1.default.Router();
// Configure multer for file upload
const uploadDir = path_1.default.join(process.cwd(), 'uploads');
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
// Upload and process vendor itinerary
router.post('/upload', authMiddleware_1.authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const { clientName, vendorName } = req.body;
        if (!clientName || !vendorName) {
            return res.status(400).json({ error: 'Client name and vendor name are required' });
        }
        console.log(`\n📤 Processing uploaded file: ${req.file.originalname}`);
        // Step 1: Extract text from file
        const extractedText = await (0, fileProcessingService_1.processUploadedFile)(req.file.path);
        // Step 2: Format as markdown and clean
        let markdownContent = (0, fileProcessingService_1.formatAsMarkdown)(extractedText);
        markdownContent = (0, fileProcessingService_1.cleanItineraryContent)(markdownContent);
        // Step 3: Convert to HTML for preview
        const htmlContent = await (0, fileProcessingService_1.markdownToHtml)(markdownContent);
        // Step 4: Create itinerary in database
        const itinerary = await (0, itineraryService_1.createItinerary)(req.user.id, vendorName, clientName, markdownContent);
        if (!itinerary) {
            return res.status(500).json({ error: 'Failed to create itinerary' });
        }
        // Update with HTML content
        await (0, itineraryService_1.updateItinerary)(itinerary.id, markdownContent, htmlContent);
        res.json({
            success: true,
            message: 'Itinerary processed successfully',
            itinerary: {
                id: itinerary.id,
                clientName,
                vendorName,
                content: markdownContent,
                htmlContent,
                status: 'draft',
            },
        });
    }
    catch (error) {
        console.error('❌ Upload error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to process file' });
    }
});
// Get user's itineraries
router.get('/', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const itineraries = await (0, itineraryService_1.getUserItineraries)(req.user.id);
        res.json({
            success: true,
            itineraries,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get single itinerary
router.get('/:id', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const itinerary = await (0, itineraryService_1.getItinerary)(req.params.id);
        if (!itinerary) {
            return res.status(404).json({ error: 'Itinerary not found' });
        }
        res.json({
            success: true,
            itinerary,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update itinerary content
router.put('/:id', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        // Convert to HTML
        const htmlContent = await (0, fileProcessingService_1.markdownToHtml)(content);
        // Update itinerary
        const itinerary = await (0, itineraryService_1.updateItinerary)(req.params.id, content, htmlContent);
        if (!itinerary) {
            return res.status(404).json({ error: 'Itinerary not found' });
        }
        res.json({
            success: true,
            message: 'Itinerary updated successfully',
            itinerary,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Publish itinerary
router.post('/:id/publish', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const itinerary = await (0, itineraryService_1.publishItinerary)(req.params.id);
        if (!itinerary) {
            return res.status(404).json({ error: 'Itinerary not found' });
        }
        res.json({
            success: true,
            message: 'Itinerary published successfully',
            itinerary,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete itinerary
router.delete('/:id', authMiddleware_1.authenticate, async (req, res) => {
    try {
        const success = await (0, itineraryService_1.deleteItinerary)(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Itinerary not found' });
        }
        res.json({
            success: true,
            message: 'Itinerary deleted successfully',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=itineraries.js.map