"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanItineraryContent = exports.markdownToHtml = exports.formatAsMarkdown = exports.processUploadedFile = exports.extractTxtText = exports.extractDocxText = exports.extractPdfText_OLD = exports.extractPdfText = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const marked_1 = require("marked");
const extract = __importStar(require("pdf-parse"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const readFileAsync = (0, util_1.promisify)(fs_1.default.readFile);
// Extract text from PDF using pdf-parse
const extractPdfText = async (filePath) => {
    try {
        console.log('PDF-Parse Import Type:', typeof extract);
        console.log('PDF-Parse Content:', extract);
        console.log('📄 Extracting text from PDF: ${filePath}');
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`PDF file not found: ${filePath}`);
        }
        const dataBuffer = await readFileAsync(filePath);
        if (dataBuffer.length === 0) {
            throw new Error('PDF file is empty');
        }
        console.log('File size: ${dataBuffer.length} bytes');
        // Use pdf-parse to extract text
        const data = await extract(dataBuffer);
        const text = data.text.trim();
        if (!text || text.length === 0) {
            throw new Error('No text could be extracted from PDF. File may be image-based.');
        }
        console.log(`✅ Extracted ${text.length} characters from PDF (${data.numpages} pages)`);
        return text;
    }
    catch (error) {
        console.error('❌ Error extracting PDF:', error.message);
        throw error;
    }
};
exports.extractPdfText = extractPdfText;
// Extract text from PDF (using pdf-text-extract)
const extractPdfText_OLD = async (filePath) => {
    return new Promise((resolve, reject) => {
        try {
            console.log(`📄 Extracting text from PDF: ${filePath}`);
            if (!fs_1.default.existsSync(filePath)) {
                throw new Error(`PDF file not found: ${filePath}`);
            }
            const options = { type: 'text' };
            extract(filePath, options, (err, pages) => {
                if (err) {
                    console.error('❌ Error extracting PDF:', err.message);
                    reject(err);
                    return;
                }
                if (!pages || pages.length === 0) {
                    reject(new Error('No text could be extracted from PDF'));
                    return;
                }
                const text = pages.join('\n');
                if (!text || text.length === 0) {
                    reject(new Error('Extracted text is empty'));
                    return;
                }
                console.log(`✅ Extracted ${text.length} characters from PDF (${pages.length} pages)`);
                resolve(text);
            });
        }
        catch (error) {
            console.error('❌ Error in extractPdfText:', error.message);
            reject(error);
        }
    });
};
exports.extractPdfText_OLD = extractPdfText_OLD;
// Extract text from DOCX
const extractDocxText = async (filePath) => {
    try {
        console.log(`📄 Extracting text from DOCX: ${filePath}`);
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`DOCX file not found: ${filePath}`);
        }
        const { stdout } = await execAsync(`pandoc "${filePath}" -t plain`);
        if (!stdout || stdout.length === 0) {
            throw new Error('No text could be extracted from DOCX');
        }
        console.log(`✅ Extracted ${stdout.length} characters from DOCX`);
        return stdout;
    }
    catch (error) {
        console.error('❌ Error extracting DOCX:', error.message);
        throw error;
    }
};
exports.extractDocxText = extractDocxText;
// Extract text from TXT
const extractTxtText = async (filePath) => {
    try {
        console.log(`📄 Reading text from TXT: ${filePath}`);
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`TXT file not found: ${filePath}`);
        }
        const text = await readFileAsync(filePath, 'utf-8');
        if (!text || text.length === 0) {
            throw new Error('TXT file is empty');
        }
        console.log(`✅ Read ${text.length} characters from TXT`);
        return text;
    }
    catch (error) {
        console.error('❌ Error reading TXT:', error.message);
        throw error;
    }
};
exports.extractTxtText = extractTxtText;
// Process uploaded file and extract text
const processUploadedFile = async (filePath) => {
    try {
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const ext = path_1.default.extname(filePath).toLowerCase();
        console.log(`   File extension: ${ext}`);
        let text = '';
        switch (ext) {
            case '.pdf':
                text = await (0, exports.extractPdfText)(filePath);
                break;
            case '.docx':
                text = await (0, exports.extractDocxText)(filePath);
                break;
            case '.txt':
                text = await (0, exports.extractTxtText)(filePath);
                break;
            default:
                throw new Error(`Unsupported file type: ${ext}`);
        }
        if (!text || text.trim().length === 0) {
            throw new Error('No text content found in file');
        }
        return text;
    }
    catch (error) {
        console.error('❌ Error processing file:', error.message);
        throw error;
    }
};
exports.processUploadedFile = processUploadedFile;
// Convert text to markdown-like format
const formatAsMarkdown = (text) => {
    try {
        console.log(`🔄 Formatting ${text.length} characters as markdown...`);
        let markdown = text;
        // Remove rate/price information
        markdown = markdown.replace(/\$[\d,]+\.?\d*/g, '[RATE REMOVED]');
        markdown = markdown.replace(/₹[\d,]+\.?\d*/g, '[RATE REMOVED]');
        markdown = markdown.replace(/(?:INR|USD|EUR)[\s]?[\d,]+\.?\d*/gi, '[RATE REMOVED]');
        // Remove vendor references
        markdown = markdown.replace(/vendor/gi, 'Provider');
        markdown = markdown.replace(/booking reference/gi, 'Reference');
        markdown = markdown.replace(/confirmation number/gi, 'Confirmation');
        // Convert to markdown-like format
        const lines = markdown.split(/\n\n+/);
        markdown = lines
            .map((line) => {
            line = line.trim();
            if (!line)
                return '';
            if (line.length < 50 && line === line.toUpperCase() && line.length > 3) {
                return `## ${line}`;
            }
            if (/^day\s+\d+/i.test(line)) {
                return `### ${line}`;
            }
            if (/^[-•*]\s/.test(line)) {
                return line;
            }
            return line;
        })
            .filter((line) => line.length > 0)
            .join('\n\n');
        console.log(`✅ Formatted to ${markdown.length} characters`);
        return markdown;
    }
    catch (error) {
        console.error('❌ Error formatting markdown:', error.message);
        return text;
    }
};
exports.formatAsMarkdown = formatAsMarkdown;
// Convert markdown to HTML
const markdownToHtml = async (markdown) => {
    try {
        console.log('🔄 Converting markdown to HTML...');
        if (!markdown || markdown.trim().length === 0) {
            console.warn('⚠️  Empty markdown content');
            return '<p>No content</p>';
        }
        const html = await (0, marked_1.marked)(markdown);
        if (!html) {
            console.warn('⚠️  Marked returned empty HTML');
            return '<p>No content</p>';
        }
        console.log(`✅ Converted to ${html.length} characters HTML`);
        return html;
    }
    catch (error) {
        console.error('❌ Error converting to HTML:', error.message);
        throw error;
    }
};
exports.markdownToHtml = markdownToHtml;
// Clean and format itinerary content
const cleanItineraryContent = (content) => {
    try {
        let cleaned = content;
        const phrasesToRemove = [
            /vendor details:?[^\n]*/gi,
            /booking details:?[^\n]*/gi,
            /confirmation:?[^\n]*/gi,
            /reference number:?[^\n]*/gi,
            /terms and conditions[^\n]*/gi,
            /payment terms[^\n]*/gi,
            /cancellation policy[^\n]*/gi,
        ];
        phrasesToRemove.forEach((phrase) => {
            cleaned = cleaned.replace(phrase, '');
        });
        cleaned = cleaned.replace(/\n\n\n+/g, '\n\n');
        cleaned = cleaned.trim();
        console.log(`✅ Cleaned content to ${cleaned.length} characters`);
        return cleaned;
    }
    catch (error) {
        console.error('❌ Error cleaning content:', error.message);
        return content;
    }
};
exports.cleanItineraryContent = cleanItineraryContent;
//# sourceMappingURL=fileProcessingService.js.map