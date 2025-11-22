const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Submission = require('../models/Submission');
const { simpleServerVerify } = require('../server_utils');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    const { email, test, analysis } = req.body;
    const analysisObj = analysis ? JSON.parse(analysis) : null;
    const videoPath = req.file ? req.file.path : null;
    const cheatFlag = analysisObj?.cheat?.suspicious || false;

    const sub = new Submission({
      email, test, analysis: analysisObj, cheatFlag, videoPath
    });

    const verification = simpleServerVerify(analysisObj || {});
    sub.serverVerification = verification;
    sub.cheatFlag = verification.suspicious || cheatFlag;
    await sub.save();

    return res.json({ status: 'ok', id: sub._id, serverVerification: verification });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const subs = await Submission.find().sort({createdAt:-1}).limit(200).lean();
  res.json({ count: subs.length, results: subs });
});

module.exports = router;
