require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const submissions = require('../routes/submissions');
const fs = require('fs');
const path = require('path');

const MONGO = process.env.MONGO_URI || 'mongodb+srv://Shivank:ShivankSingh2004@cluster0.opficvq.mongodb.net/sihdb?retryWrites=true&w=majority';
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/submissions', submissions);
app.use('/uploads', express.static(UPLOAD_DIR));

mongoose
  .connect(MONGO)
  .then(() => console.log('✅ MongoDB Atlas Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

module.exports = app;
