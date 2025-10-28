# OCR-Enabled PDF Upload Setup Guide

## Overview
The application now supports uploading **any type of PDF**, including scanned documents, using OCR (Optical Character Recognition) technology.

## How It Works

1. **Native Text Extraction (Fast)**
   - When you upload a PDF, the system first tries to extract embedded text using PDF.js
   - If the PDF has selectable text (like most digital PDFs), extraction happens instantly in your browser

2. **OCR Fallback (For Scanned PDFs)**
   - If the PDF contains no text or minimal text (<50 characters), it's automatically uploaded to Supabase Storage
   - The OCR edge function processes the PDF using OCR.space API to extract text from images
   - Once processing completes, the extracted text is saved and embeddings are generated

## Setup Instructions

### 1. Create Supabase Storage Bucket

In your Supabase Dashboard:

1. Go to **Storage** → **Create a new bucket**
2. Bucket name: `pdf-uploads`
3. Set as **Private** (not public)
4. Click **Create bucket**

### 2. Set Storage Policies

Add these RLS policies to the `pdf-uploads` bucket:

**INSERT Policy (Allow authenticated uploads):**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdf-uploads' AND
  auth.uid() = owner
);
```

**SELECT Policy (Allow service role to read):**
```sql
CREATE POLICY "Allow service role read"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'pdf-uploads');
```

**DELETE Policy (Allow service role to delete after processing):**
```sql
CREATE POLICY "Allow service role delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'pdf-uploads');
```

### 3. Deploy Edge Functions

Deploy the new OCR processing function:

```bash
# Deploy the OCR function
supabase functions deploy process-pdf-ocr
```

### 4. Environment Variables (Optional)

The system uses OCR.space's free API by default. For better performance:

1. Sign up at https://ocr.space/ocrapi (free tier available)
2. Get your API key
3. Add to your Supabase project secrets:

```bash
supabase secrets set OCR_SPACE_API_KEY=your_api_key_here
```

### 5. Test the Feature

1. Upload a PDF with native text → Should work instantly
2. Upload a scanned PDF (image-based) → Should show "Running OCR..." and process in ~30-60 seconds
3. Check the sources list → OCR'ed content should be available for AI features

## Supported PDF Types

✅ **Native Text PDFs** - Instant extraction  
✅ **Scanned Documents** - OCR processing (30-60s)  
✅ **Mixed PDFs** - Extracts both native and OCR text  
⚠️ **Encrypted PDFs** - Will fail gracefully with error message  
⚠️ **Very Large Files** - Limited to reasonable sizes (recommend <10MB)

## Troubleshooting

**Error: "Failed to upload PDF"**
- Check that the `pdf-uploads` bucket exists in Supabase Storage
- Verify storage policies are set correctly

**Error: "OCR processing failed"**
- The PDF may be encrypted or have very poor image quality
- Try a different PDF or check OCR API limits

**PDF takes too long to process**
- Large scanned PDFs may take 1-2 minutes
- Check OCR.space API quota (free tier has limits)

## Cost Considerations

- **Storage**: PDFs are deleted after processing, so minimal storage cost
- **OCR API**: Free tier allows 25,000 requests/month
- **Edge Functions**: Minimal cost for quick processing

## Future Improvements

- Add progress indicator with page-by-page status
- Support for multiple languages
- Batch processing for multiple PDFs
- Client-side OCR option (Tesseract.js) for privacy
