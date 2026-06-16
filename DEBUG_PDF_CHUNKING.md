# Debug Guide: PDF Preview & Chunking Issues

## Fixed Issues

### 1. **Path Resolution Problem**
- **Issue**: File paths were being stored as absolute paths but resolved incorrectly
- **Fix**: Now storing relative paths (`uploads/rag/filename.pdf`) in database
- **Impact**: PDF files can now be served correctly

### 2. **PDF Preview Not Loading**
- **Issue**: Incorrect path construction when serving files
- **Fix**: Proper path resolution from relative stored path
- **Added**: Content-Disposition header for inline display
- **Added**: Logging for debugging file access

### 3. **Chunking Process**
- **Added**: Comprehensive logging throughout the process
- **Tracking**: Text extraction, chunk creation, embedding generation

## How to Debug

### Step 1: Check Backend Logs During Upload

When you upload a PDF, you should see these logs:

```
Processing PDF: {
  originalName: 'test.pdf',
  size: 123456,
  path: 'C:\\...\\uploads\\rag\\1234567890-test.pdf'
}

PDF text extracted: {
  textLength: 5000,
  firstChars: 'This is the beginning of the document...'
}

Text chunked: {
  totalChunks: 5,
  firstChunkLength: 1000
}

Processing chunk 1/5
Processing chunk 2/5
...
Processing chunk 5/5
All chunks processed successfully
```

### Step 2: Check PDF Serving Logs

When viewing a PDF, you should see:

```
Attempting to serve PDF: {
  documentId: 1,
  storage_path: 'uploads/rag/1234567890-test.pdf',
  absolute_path: 'C:\\...\\backend\\uploads\\rag\\1234567890-test.pdf',
  exists: true
}
```

### Step 3: Check Frontend Console

Open browser DevTools (F12) and look for:

```
Fetching PDF for document: 1
PDF URL created: blob:http://localhost:5173/xxxxx-xxxx-xxxx
```

## Common Issues & Solutions

### Issue: "No text could be extracted from PDF"

**Causes:**
- PDF is image-based (scanned) with no text layer
- PDF is corrupted
- PDF has password protection

**Solutions:**
1. Try a different PDF with actual text
2. Use a text-based PDF (not scanned images)
3. Check if PDF opens correctly in a PDF reader

**Test Command:**
```bash
# Install pdf-parse globally for testing
npm install -g pdf-parse

# Test PDF extraction (create test script)
node test-pdf.js your-file.pdf
```

**test-pdf.js:**
```javascript
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const pdfPath = process.argv[2];
const buffer = fs.readFileSync(pdfPath);

pdfParse(buffer).then(data => {
  console.log('Pages:', data.numpages);
  console.log('Text length:', data.text.length);
  console.log('First 500 chars:', data.text.substring(0, 500));
}).catch(err => {
  console.error('Error:', err);
});
```

---

### Issue: "File not found on disk"

**Check:**
1. Verify file exists in `backend/uploads/rag/`
2. Check database `storage_path` column value
3. Verify permissions on uploads directory

**Debug Commands:**
```bash
cd backend

# List uploaded files
dir uploads\rag

# Check database (MySQL)
mysql -u root -p testing
SELECT document_id, title, storage_path, status FROM documents;
```

**Expected Database Value:**
- ✅ CORRECT: `uploads/rag/1234567890-test.pdf`
- ❌ WRONG: `C:\full\absolute\path\...`
- ❌ WRONG: `test.pdf` (missing directory)

---

### Issue: Chunking Fails / No Chunks Created

**Check Logs For:**
- Text length is > 0
- Chunks array has items

**Debug the Chunking Function:**
```javascript
// Test chunking manually
import { chunkText } from './src/utils/chunking.js';

const sampleText = 'Lorem ipsum...'.repeat(100);
const chunks = chunkText(sampleText, 1000, 150);

console.log('Total chunks:', chunks.length);
console.log('First chunk:', chunks[0]);
console.log('Last chunk:', chunks[chunks.length - 1]);
```

**Expected Behavior:**
- For 5000 chars with 1000 chunk size and 150 overlap
- Should create ~6 chunks
- Each chunk should be ~1000 chars (last may be shorter)

---

### Issue: Embedding Generation Fails

**Check:**
1. GEMINI_API_KEY is set in .env
2. API key is valid (test in Google AI Studio)
3. Internet connection is working
4. API quota hasn't been exceeded

**Test Embedding Generation:**
```bash
cd backend
node test-embedding.js
```

**test-embedding.js:**
```javascript
import dotenv from 'dotenv';
dotenv.config();

import { generateQuestionEmbedding } from './src/api/questions/service/vector.service.js';

const testText = 'This is a test sentence for embedding generation.';

generateQuestionEmbedding(testText)
  .then(result => {
    console.log('Success!');
    console.log('Embedding length:', result.embedding.length);
    console.log('First 10 values:', result.embedding.slice(0, 10));
  })
  .catch(err => {
    console.error('Failed:', err);
  });
```

**Expected Output:**
```
Success!
Embedding length: 768
First 10 values: [0.123, -0.456, 0.789, ...]
```

---

### Issue: PDF Preview Shows Blank or "Loading PDF..."

**Frontend Checks:**

1. **Network Tab** (F12 → Network):
   - Look for request to `/api/rag/documents/X/file`
   - Check status code (should be 200)
   - Check Content-Type header (should be `application/pdf`)
   - Check if bytes are actually returned

2. **Console Errors:**
   - CORS errors?
   - Authentication errors?
   - Blob creation errors?

3. **Test Direct URL:**
   ```
   http://localhost:3777/api/rag/documents/1/file
   ```
   - Should download or display PDF directly
   - If 401: Authentication issue
   - If 404: File path issue
   - If 500: Server error (check backend logs)

**Common Fixes:**

**CORS Issue:**
```javascript
// backend/index.js
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
```

**Authentication Issue:**
- Check token is in localStorage
- Check Authorization header is sent
- Check token hasn't expired

**Blob URL Issue:**
```javascript
// frontend - Check response type
const response = await apiClient.get(
  `/api/rag/documents/${documentId}/file`,
  { responseType: 'blob' } // This is critical!
);
```

---

### Issue: Document Stuck in "PROCESSING" Status

**Causes:**
- Error during processing (check `error_message` column)
- Process crashed mid-way
- Async process never completed

**Check:**
```sql
SELECT document_id, title, status, error_message 
FROM documents 
WHERE status = 'processing' OR status = 'failed';
```

**If Stuck:**
1. Check backend logs for errors during that time
2. Try re-uploading
3. Check if document has any chunks:
```sql
SELECT COUNT(*) FROM document_chunks WHERE document_id = X;
```

**Manual Status Update (if needed):**
```sql
-- Only if you've verified chunks exist
UPDATE documents 
SET status = 'ready' 
WHERE document_id = X;
```

---

## Testing Checklist

After deploying fixes, test in this order:

### 1. Upload Test
- [ ] Upload small PDF (2-3 pages)
- [ ] Check backend logs show "Processing PDF"
- [ ] Check logs show text extraction
- [ ] Check logs show chunking
- [ ] Check logs show embedding generation
- [ ] Verify status changes to "ready"

### 2. Preview Test
- [ ] Click on ready document
- [ ] Check backend logs show "Attempting to serve PDF"
- [ ] Check logs show `exists: true`
- [ ] Check frontend console shows "PDF URL created"
- [ ] Verify PDF appears in iframe
- [ ] Check you can scroll through pages

### 3. Search Test
- [ ] Enter search query
- [ ] Verify results appear
- [ ] Check results are relevant

### 4. AI Query Test
- [ ] Enter question
- [ ] Verify answer appears
- [ ] Check citations are shown

---

## File Structure Verification

```
backend/
├── uploads/
│   └── rag/
│       ├── 1734567890-document1.pdf
│       ├── 1734567891-document2.pdf
│       └── ...
└── src/
    └── api/
        └── rag/
            ├── controller/
            ├── service/
            └── routes/
```

**Database:**
```
documents table:
- document_id: 1
- user_id: 123
- title: "document1.pdf"
- storage_path: "uploads/rag/1734567890-document1.pdf"  ← Relative!
- status: "ready"

document_chunks table:
- chunk_id: 1
- document_id: 1
- chunk_index: 0
- content: "First chunk of text..."

document_chunk_vectors table:
- chunk_vector_id: 1
- chunk_id: 1
- embedding: "[0.123, -0.456, ...]"
- status: "ready"
```

---

## Quick Commands Reference

```bash
# Check uploads directory
cd backend
dir uploads\rag

# Check database records
mysql -u root -p testing
SELECT * FROM documents;
SELECT COUNT(*) FROM document_chunks;
SELECT COUNT(*) FROM document_chunk_vectors;

# Test server
curl http://localhost:3777/health
curl -H "Authorization: Bearer TOKEN" http://localhost:3777/api/rag/documents

# Check logs
# Watch backend terminal where `npm run dev` is running

# Clear all test data
DELETE FROM documents WHERE user_id = YOUR_USER_ID;
# Note: CASCADE will auto-delete chunks and vectors
```

---

## Expected Performance

- **Small PDF (2-5 pages):** 5-15 seconds
- **Medium PDF (10-20 pages):** 20-45 seconds  
- **Large PDF (50+ pages):** 1-3 minutes

Processing time depends on:
- Text length (more text = more chunks = more API calls)
- Internet speed (for Gemini API)
- Server resources

---

## Success Indicators

✅ **Upload:** 
- Status changes from "processing" to "ready"
- Chunks visible in database
- No error_message in documents table

✅ **Preview:**
- PDF displays in iframe
- Can scroll and interact
- No 404 or network errors

✅ **Chunking:**
- Logs show successful chunk processing
- document_chunks table has entries
- document_chunk_vectors table has matching entries

✅ **Embeddings:**
- All vectors have status = "ready"
- Embedding JSON is valid array of numbers
- Array length matches expected (usually 768)

---

## Contact & Support

If issues persist:
1. Collect backend logs
2. Collect frontend console logs
3. Check database state
4. Review this debug guide
5. Check API key validity
