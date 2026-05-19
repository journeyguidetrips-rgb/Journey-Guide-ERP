import { z } from 'zod';

export const UpdateItinerarySchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

export const UploadItinerarySchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  vendorName: z.string().min(1, 'Vendor name is required'),
});
