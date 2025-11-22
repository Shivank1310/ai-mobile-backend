require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const submissions = require('./routes/submissions');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

// ❗ FIX #1 — Atlas URI must include a database name + query params
const MONGO =
  process.env.MONGO_URI ||
  'mongodb+srv://Shivank:ShivankSingh2004@cluster0.opficvq.mongodb.net/sihdb?retryWrites=true&w=majority';

// ❗ FIX #2 — make sure upload folder exists
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

// ❗ FIX #3 — Recommended mongoose connection format (no deprecated options)
mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB Atlas Connected');
    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });
