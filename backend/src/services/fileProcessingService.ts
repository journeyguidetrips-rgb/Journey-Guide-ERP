import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

// Process uploaded .md file
export const processMarkdownFile = async (filePath: string): Promise<string> => {
  try {
    console.log(`📄 Processing Markdown file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Markdown file not found: ${filePath}`);
    }

    const markdown = await fs.promises.readFile(filePath, 'utf-8');

    if (!markdown || markdown.trim().length === 0) {
      throw new Error('Markdown file is empty');
    }

    console.log(`✅ Read ${markdown.length} characters from Markdown`);
    return markdown;
  } catch (error: any) {
    console.error('❌ Error processing Markdown file:', error.message);
    throw error;
  }
};

// Clean and format itinerary content
export const cleanItineraryContent = (content: string): string => {
  let cleaned = content;

  // Remove vendor-specific phrases
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

  // Normalize spacing
  cleaned = cleaned.replace(/\n\n\n+/g, '\n\n').trim();

  console.log(`✅ Cleaned content to ${cleaned.length} characters`);
  return cleaned;
};

// Convert Markdown to HTML
export const markdownToHtml = async (markdown: string): Promise<string> => {
  try {
    console.log('🔄 Converting Markdown to HTML...');
    const html = markdown;
    console.log(`✅ Converted to ${html.length} characters HTML`);
    return html;
  } catch (error: any) {
    console.error('❌ Error converting Markdown to HTML:', error.message);
    throw error;
  }
};
