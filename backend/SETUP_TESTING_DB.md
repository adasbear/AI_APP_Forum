# 🧪 Setup Testing Database

Your `.env` is configured to use the `testing` database. Follow these steps to set it up:

## 🚀 Quick Setup (3 commands)

### Step 1: Create Testing Database
```bash
mysql -u root -p
```
```sql
CREATE DATABASE testing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Step 2: Run Schema (creates all 9 tables + sample data)
```bash
mysql -u root -p testing < db/schema.sql
```

### Step 3: Verify Setup
```bash
mysql -u root -p testing -e "SHOW TABLES;"
```

**Expected output (9 tables):**
```
answers
bookmarks
document_chunk_vectors  
document_chunks
documents
question_vectors
questions
users
votes
```

### Step 4: Restart Backend
```bash
npm run dev
```

## ✅ What You Get

After running the schema, your `testing` database will have:

- **9 Complete Tables** (including bookmarks)
- **4 Sample Users** (login with john@example.com, password: password123)
- **5 Sample Questions** with answers
- **9 Votes** showing engagement
- **6 Bookmarks** for saved questions
- **All Relationships** properly configured

## 🧪 Sample Data in Testing DB

### Users (4)
- john@example.com (password123)
- sarah@example.com (password123) 
- mike@example.com (password123)
- emily@example.com (password123)

### Questions (5)
1. How do I set up Node.js with Express?
2. What is the best way to handle authentication in REST APIs?
3. How to optimize database queries for performance?
4. Understanding async/await in JavaScript
5. Machine Learning algorithms for beginners

### Answers (4)
- Real code examples
- Best practices
- Helpful explanations

### Votes & Bookmarks
- 9 votes across questions/answers
- 6 bookmarks showing saved questions

## 🔍 Verify Data Loaded

```bash
# Check users
mysql -u root -p testing -e "SELECT COUNT(*) FROM users;"

# Check questions  
mysql -u root -p testing -e "SELECT COUNT(*) FROM questions;"

# Check bookmarks
mysql -u root -p testing -e "SELECT COUNT(*) FROM bookmarks;"
```

Expected: 4, 5, 6

## 🚀 After Setup

1. ✅ Backend will connect to `testing` database
2. ✅ All 9 tables will exist
3. ✅ Sample data ready for testing
4. ✅ No more "table doesn't exist" errors
5. ✅ All features work (bookmarks, voting, etc.)

## 💡 Why Testing Database?

- ✅ Safe to experiment with
- ✅ Can reset easily
- ✅ Separate from production data
- ✅ Perfect for development

## 🔄 Reset Testing Data

To reset the testing database:
```bash
mysql -u root -p testing < db/schema.sql
```

This will:
- Drop all existing tables
- Recreate them fresh
- Load sample data again

## ✅ Troubleshooting

**Still getting table errors?**
1. Make sure you ran: `mysql -u root -p testing < db/schema.sql`
2. Verify tables exist: `mysql -u root -p testing -e "SHOW TABLES;"`
3. Restart backend: `npm run dev`

**Want to check what's in testing database?**
```bash
mysql -u root -p testing
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM questions;
```

**Backend still has errors?**
- The errors you see are normal validation errors (testing with invalid data)
- As long as database connection works, you're good to go!

---

**Ready!** Run the 3 setup commands above, then `npm run dev` 🚀