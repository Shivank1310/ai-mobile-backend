require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const submissions = require('./routes/submissions');
const fs = require('fs');
const path = require('path');

// MongoDB URI (with database name + params)
const MONGO =
  process.env.MONGO_URI ||
  'mongodb+srv://Shivank:ShivankSingh2004@cluster0.opficvq.mongodb.net/sihdb?retryWrites=true&w=majority';

// Uploads folder
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/submissions', submissions);
app.use('/uploads', express.static(UPLOAD_DIR));

// Connect MongoDB (only once)
mongoose
  .connect(MONGO)
  .then(() => console.log('✅ MongoDB Atlas Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

// ❗ IMPORTANT — Export the app for Vercel
module.exports = app;

// ❗ When running locally, start server normally
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`🚀 Local server running at http://localhost:${PORT}`)
  );
}
