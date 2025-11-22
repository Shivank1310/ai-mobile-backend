/*
Server-side reprocessor to re-run pose estimation on uploaded videos.

Requirements (on server):
- Node.js environment
- ffmpeg installed (to extract frames)
- npm packages: @tensorflow/tfjs-node, @tensorflow-models/pose-detection, fluent-ffmpeg, mongoose

This script:
- scans the uploads directory for videos
- extracts frames (frame every N ms) using ffmpeg
- runs MoveNet via tfjs-node to estimate poses on frames
- computes robust metrics (average confidence, refined jump height estimate, situp count)
- writes results back into the Submission document's reprocessMetrics field
*/

const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const tf = require('@tensorflow/tfjs-node');
const posedetection = require('@tensorflow-models/pose-detection');
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
require('dotenv').config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname,'../uploads');
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/sihdb';

async function extractFrames(videoPath, outDir, fps=5){
  return new Promise((resolve, reject) => {
    fs.mkdirSync(outDir, { recursive: true });
    ffmpeg(videoPath)
      .outputOptions(['-vf', `fps=${fps}`])
      .output(path.join(outDir, 'frame-%05d.jpg'))
      .on('end', ()=> resolve())
      .on('error', (err)=> reject(err))
      .run();
  });
}

function average(arr){ return arr.reduce((a,b)=>a+b,0)/Math.max(1,arr.length); }

async function processVideo(detector, videoPath, submission){
  const tmpDir = path.join('/tmp', 'sih_frames_' + Date.now());
  await extractFrames(videoPath, tmpDir, 5);
  const files = fs.readdirSync(tmpDir).filter(f=>f.endsWith('.jpg')).sort();
  const confidences = [];
  const hipYs = [];
  let situpCount = 0; let lastState = 'down';
  for(let i=0;i<files.length;i++){
    const imgPath = path.join(tmpDir, files[i]);
    const buffer = fs.readFileSync(imgPath);
    const decoded = tf.node.decodeImage(buffer);
    const input = tf.expandDims(decoded);
    const poses = await detector.estimatePoses(input);
    decoded.dispose(); input.dispose();
    if(poses && poses[0] && poses[0].keypoints){
      const k = poses[0].keypoints;
      const avgConf = average(k.map(x=>x.score||0));
      confidences.push(avgConf);
      const leftHip = k.find(p=>p.name==='left_hip' || p.part==='left_hip' || p.part==='leftHip' || p.part==='left_hip');
      const rightHip = k.find(p=>p.name==='right_hip' || p.part==='right_hip' || p.part==='rightHip' || p.part==='right_hip');
      if(leftHip && rightHip){
        const y = ((leftHip.y||0)+(rightHip.y||0))/2;
        hipYs.push(y);
      }
      // situp detection
      const leftShoulder = k.find(p=>p.name==='left_shoulder' || p.part==='left_shoulder');
      const rightShoulder = k.find(p=>p.name==='right_shoulder' || p.part==='right_shoulder');
      const leftKnee = k.find(p=>p.name==='left_knee' || p.part==='left_knee');
      const rightKnee = k.find(p=>p.name==='right_knee' || p.part==='right_knee');
      const hip = leftHip && rightHip ? { x: ((leftHip.x||0)+(rightHip.x||0))/2, y: ((leftHip.y||0)+(rightHip.y||0))/2 } : null;
      const shoulder = leftShoulder && rightShoulder ? { x: ((leftShoulder.x||0)+(rightShoulder.x||0))/2, y: ((leftShoulder.y||0)+(rightShoulder.y||0))/2 } : null;
      const knee = leftKnee && rightKnee ? { x: ((leftKnee.x||0)+(rightKnee.x||0))/2, y: ((leftKnee.y||0)+(rightKnee.y||0))/2 } : null;
      if(hip && shoulder && knee){
        // compute trunk angle
        const ab = { x: shoulder.x - hip.x, y: shoulder.y - hip.y };
        const cb = { x: knee.x - hip.x, y: knee.y - hip.y };
        const dot = ab.x*cb.x + ab.y*cb.y;
        const mag = Math.sqrt((ab.x*ab.x+ab.y*ab.y)*(cb.x*cb.x+cb.y*cb.y));
        const cos = Math.max(-1, Math.min(1, dot / (mag || 1)));
        const angle = Math.acos(cos) * 180/Math.PI;
        if(angle < 85 && lastState === 'down'){ situpCount++; lastState='up'; }
        if(angle > 120 && lastState === 'up'){ lastState='down'; }
      }
    }
  }
  // compute refined metrics
  const avgConf = average(confidences);
  const estimatedJumpMeters = hipYs.length ? ( (Math.max(...hipYs)-Math.min(...hipYs)) / (480) * 1.5 ) : 0;
  // save back to submission
  submission.reprocessMetrics = {
    avgConfidence: avgConf,
    estimatedJumpMeters: +(Math.abs(estimatedJumpMeters)).toFixed(2),
    situpCount,
    framesProcessed: files.length
  };
  await submission.save();

  // cleanup
  try{ fs.rmdirSync(tmpDir, { recursive:true }); }catch(e){}
  return submission.reprocessMetrics;
}

async function main(){
  await mongoose.connect(MONGO, { useNewUrlParser:true, useUnifiedTopology:true });
  console.log('Connected to mongo');
  const model = posedetection.SupportedModels.MoveNet;
  const detector = await posedetection.createDetector(model, { modelType: 'SinglePose.Lightning' });
  const subs = await Submission.find({ videoPath: { $ne: null }, reprocessMetrics: null }).limit(20).exec();
  for(const s of subs){
    console.log('Processing', s._id, s.videoPath);
    try{
      const metrics = await processVideo(detector, s.videoPath, s);
      console.log('Saved metrics', metrics);
    }catch(err){
      console.error('Error processing', s._id, err);
    }
  }
  process.exit(0);
}

main().catch(err=>{ console.error(err); process.exit(1); });
