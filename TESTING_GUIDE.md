# Knowledge Base Feature - Testing Guide

## Quick Start Testing

### 1. Start Backend Server
```bash
cd backend
npm run dev
```

Expected output:
```
Database connection established successfully.
Server running on port http://localhost:3777
```

### 2. Start Frontend Development Server
```bash
cd frontend
npm run dev
```

### 3. Access Knowledge Base
1. Login to the application
2. Navigate to **Knowledge Base** from the sidebar
3. You should see the "Private PDF library" page

## Feature Testing Scenarios

### Scenario 1: Upload a PDF Document
**Steps:**
1. Click "Choose file" button
2. Select a PDF file from your computer
3. Click "Upload" button
4. Wait for processing (status will show "PROCESSING")
5. Once complete, status will change to "READY"

**Expected Result:**
- Document appears in the library list
- Status badge shows "READY" in green
- Document is clickable

**Common Issues:**
- If upload fails: Check file is actually a PDF
- If stuck in processing: Check backend logs for errors
- If no Gemini API key: Check .env file configuration

---

### Scenario 2: View PDF Preview
**Steps:**
1. Click on a document with "READY" status
2. Look at the "Reader" section

**Expected Result:**
- PDF displays in an iframe
- You can scroll through pages
- PDF toolbar may be visible (browser dependent)

**Common Issues:**
- If "Loading PDF..." persists: Check browser console for errors
- If shows blank: Check file exists in `backend/uploads/rag/`
- If 404 error: Check backend route is working

---

### Scenario 3: Semantic Search
**Steps:**
1. Select a ready document
2. Scroll to "Semantic search" section
3. Enter a search query (e.g., "authentication methods")
4. Click "Search" button

**Expected Result:**
- Results appear below the search button
- Each result shows a text excerpt from the document
- Results are ranked by relevance
- Multiple results may appear (up to RAG_SEARCH_K limit)

**Common Issues:**
- If no results: Query may not match document content
- If error: Check backend logs for embedding generation errors
- If wrong results: Adjust RAG_SEARCH_THRESHOLD in .env

---

### Scenario 4: Ask with AI
**Steps:**
1. Select a ready document
2. Scroll to "Ask with AI" section
3. Enter a question (e.g., "What is the main topic of this document?")
4. Click "Ask" button
5. Wait for AI response

**Expected Result:**
- AI-generated answer appears below
- Answer is formatted with markdown (bold, lists, code blocks)
- Citations list appears showing which chunks were used
- Code blocks (if any) have copy buttons

**Common Issues:**
- If error: Check GEMINI_API_KEY is valid
- If "cannot answer": Question may not relate to document content
- If timeout: Document may be too large or Gemini API may be slow

---

### Scenario 5: Delete Document
**Steps:**
1. Hover over a document in the library
2. Click the trash icon
3. Confirm deletion in the popup

**Expected Result:**
- Confirmation dialog appears
- After confirming, document is removed from list
- If document was selected, preview area clears

**Common Issues:**
- If delete fails: Check authentication token is valid
- If document still appears: Refresh the page

---

## API Testing (Optional)

### Using curl or Postman

#### 1. Get Auth Token
```bash
curl -X POST http://localhost:3777/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

Save the token from response.

#### 2. List Documents
```bash
curl -X GET http://localhost:3777/api/rag/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Upload PDF
```bash
curl -X POST http://localhost:3777/api/rag/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/file.pdf"
```

#### 4. Search Document
```bash
curl -X GET "http://localhost:3777/api/rag/documents/1/search?query=test" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. Query with AI
```bash
curl -X POST http://localhost:3777/api/rag/documents/1/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is this document about?"}'
```

---

## Troubleshooting

### Backend Issues

#### Server Won't Start
```bash
# Check if port is already in use
netstat -ano | findstr :3777

# Check database connection
# Ensure MySQL is running and credentials in .env are correct
```

#### PDF Processing Fails
- Check `backend/uploads/rag/` directory exists and is writable
- Verify pdf-parse is installed: `npm list pdf-parse`
- Check backend console for detailed error messages

#### Embedding Generation Fails
- Verify GEMINI_API_KEY in .env is correct
- Check internet connection (Gemini API is cloud-based)
- Review API quota/limits in Google AI Studio

### Frontend Issues

#### Can't See Documents
- Open browser DevTools (F12) and check Console
- Verify API calls are succeeding (Network tab)
- Check authentication token is present in localStorage

#### PDF Won't Display
- Check browser console for CORS errors
- Verify backend is serving files correctly
- Try in different browser (some have better PDF support)

#### Markdown Not Rendering
- Verify RagAnswerBody component is imported
- Check browser console for component errors
- Ensure react-markdown is installed

---

## Performance Notes

### Expected Processing Times
- Small PDF (1-5 pages): 5-15 seconds
- Medium PDF (10-20 pages): 20-45 seconds
- Large PDF (50+ pages): 1-3 minutes

### Factors Affecting Speed
- Document size and complexity
- Text density (more text = more chunks)
- Internet connection speed (for Gemini API calls)
- Server resources (CPU/RAM)

---

## Test Data Suggestions

### Good Test PDFs
1. Technical documentation (5-10 pages)
2. Research paper with code snippets
3. Tutorial or guide with diagrams
4. FAQ document

### Test Queries

**For Search:**
- "authentication"
- "database connection"
- "error handling"
- "configuration settings"

**For AI Questions:**
- "What are the main features described?"
- "How do I configure the system?"
- "What are the security recommendations?"
- "Explain the architecture shown in the document"

---

## Success Criteria

✅ **Upload**: PDF uploads successfully and processes to READY status
✅ **Preview**: PDF displays correctly in iframe
✅ **Search**: Returns relevant text excerpts based on query
✅ **AI Query**: Generates coherent answers with citations
✅ **Delete**: Removes document and cleans up files
✅ **Error Handling**: Shows user-friendly error messages
✅ **Performance**: Reasonable response times for all operations

---

## Next Test Phase

After basic functionality is confirmed:
1. Test with various PDF types (scanned, text-based, complex layouts)
2. Test with multiple users simultaneously
3. Test edge cases (empty PDFs, corrupted files, very large files)
4. Test error recovery (interrupt upload, network failures)
5. Load testing (many documents, many queries)

---

## Support & Debugging

### Enable Verbose Logging

**Backend (.env):**
```env
FASTMCP_LOG_LEVEL=DEBUG
```

**Frontend (browser console):**
```javascript
localStorage.debug = '*'
```

### Common Log Locations
- Backend: Terminal/Console where `npm run dev` is running
- Frontend: Browser DevTools Console (F12)
- Database: MySQL error log

### Quick Health Checks
```bash
# Backend health
curl http://localhost:3777/health

# Database connectivity
curl http://localhost:3777/ready
```

---

## Reporting Issues

When reporting bugs, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Browser/Node version
4. Backend console logs
5. Frontend console errors
6. Screenshot if applicable
