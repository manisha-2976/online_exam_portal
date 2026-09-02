import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';

let modelsLoaded = false;

// Load models when worker starts
async function loadModels() {
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');
    modelsLoaded = true;
    postMessage({ type: 'modelsLoaded', success: true });
  } catch (error) {
    postMessage({ type: 'modelsLoaded', success: false, error: error.message });
  }
}

// Process frame and detect faces
async function processFrame(imageData: ImageData) {
  if (!modelsLoaded) {
    return null;
  }

  try {
    const detections = await faceapi.detectAllFaces(
      imageData,
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks().withFaceExpressions();

    return detections.map(detection => ({
      box: detection.detection.box,
      landmarks: detection.landmarks.positions,
      expressions: detection.expressions,
      score: detection.detection.score
    }));
  } catch (error) {
    console.error('Error processing frame:', error);
    return null;
  }
}

// Calculate eye aspect ratio
function calculateEAR(landmarks: any) {
  const leftEye = landmarks.slice(36, 42);
  const rightEye = landmarks.slice(42, 48);
  
  const leftEAR = getEAR(leftEye);
  const rightEAR = getEAR(rightEye);
  
  return (leftEAR + rightEAR) / 2;
}

function getEAR(eye: any) {
  const A = distance(eye[1], eye[5]);
  const B = distance(eye[2], eye[4]);
  const C = distance(eye[0], eye[3]);
  return (A + B) / (2.0 * C);
}

function distance(point1: any, point2: any) {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
  );
}

// Handle messages from main thread
onmessage = async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'loadModels':
      await loadModels();
      break;

    case 'processFrame':
      const detections = await processFrame(data);
      postMessage({ type: 'detections', data: detections });
      break;

    case 'calculateEAR':
      const ear = calculateEAR(data);
      postMessage({ type: 'ear', data: ear });
      break;
  }
}; 