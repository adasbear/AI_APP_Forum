# 🚀 Enhancement Suggestions: AI-Powered Evangadi Forum

After a thorough analysis of your entire system — all task documentation, database schema, backend APIs, frontend components, and AI integrations — here are my recommendations organized by category and priority.

---

## System Summary

Your project is a **fully implemented** AI-powered community forum with:
- 🔐 JWT-based authentication (register/login)
- 💬 Community Q&A with AI draft coaching and answer fitness evaluation
- 🔍 Dual search: keyword + semantic (vector cosine similarity)
- 📄 RAG Knowledge Base: PDF upload, chunking, semantic search, grounded AI queries
- ⚛️ React 19 + Vite frontend with Framer Motion animations
- 🛠️ Node.js/Express backend with MySQL + Google Gemini AI

---

## 🎨 UI/UX Enhancements



### MEDIUM Priority
##
**yabsira**
##
#### 1. Rich Text Editor for Questions & Answers
- **What**: Replace plain `<textarea>` with a Markdown or WYSIWYG editor (e.g., **TipTap** or **react-md-editor**)
- **Why**: Forum users need formatting — code blocks, bold, italic, lists, links. This dramatically improves content quality, especially for technical Q&A.
- **How**: Integrate a lightweight editor component, render stored markdown with `react-markdown` + syntax highlighting (`highlight.js`)

#### 2. Infinite Scroll / Virtual Pagination
- **What**: Implement cursor-based pagination or infinite scroll on the dashboard and my-questions pages
- **Why**: As the question count grows, loading everything at once will become slow. The task docs mention pagination as a "stretch goal" — it should be core.
- **How**: Backend: Add `?page=1&limit=20` or `?cursor=<id>` params. Frontend: Intersection Observer for infinite scroll or page buttons.

#### 3. Question & Answer Voting System
- **What**: Upvote/downvote on both questions and answers
- **Why**: This is the #1 missing feature for any forum. Without voting, there's no way to surface quality content or rank answers.
- **How**:
  - New `votes` table: `id`, `user_id`, `target_type` (question/answer), `target_id`, `vote` (+1/-1)
  - API endpoints: `POST /api/votes`, `DELETE /api/votes/:id`
  - Frontend: Vote buttons with optimistic UI updates, sort answers by score

---


## ⚡ Feature Enhancements


### MEDIUM Priority
##
**tesfa**
##
#### 4. Bookmark / Save Questions
- **What**: Allow users to bookmark questions for later reference
- **Why**: Users often find interesting questions they want to revisit. Common forum feature.
- **How**: `bookmarks` table, `/my-bookmarks` page, bookmark icon on question cards

#### 5. Question Edit & Delete
- **What**: Allow authors to edit or delete their own questions (with confirmation)
- **Why**: Users make typos, want to add context, or need to remove outdated questions. Currently there's no edit/delete capability for questions or answers.
- **How**: `PUT /api/questions/:questionHash` and `DELETE /api/questions/:questionHash` (author-only, re-embed vector on edit)
##
**adil**
##
#### 6. Answer Edit & Delete
- **What**: Same as above but for answers
- **How**: `PUT /api/answers/:answerId`, `DELETE /api/answers/:answerId`

#### 7. Share Question / Deep Linking
- **What**: Copy-to-clipboard share button on questions with social media share options
- **Why**: Drives organic growth. Questions should be shareable. URLs already use `questionHash` which is good for sharing.



## 🔒 Security & Backend Improvements

### HIGH Priority 
##
**liyu**
##
#### 8. Rate Limiting
- **What**: Add rate limiting on auth endpoints and AI endpoints
- **Why**: Prevents brute-force attacks on login, and prevents Gemini API abuse/cost overruns
- **How**: Use `express-rate-limit` middleware:
  - Auth: 5 attempts per 15 minutes per IP
  - AI endpoints (draft-coach, answer-fit, RAG query): 20 requests per minute per user

#### 9. Input Sanitization / XSS Protection
- **What**: Sanitize all user-generated content (question bodies, answer bodies) before rendering
- **Why**: Stored XSS is a critical vulnerability in forums. If you add markdown/rich text, this becomes even more important.
- **How**: Use `DOMPurify` on the frontend before rendering, `express-validator` + `xss` package on the backend



