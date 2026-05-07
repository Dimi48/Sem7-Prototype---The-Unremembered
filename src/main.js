import './style.css';
import * as faceapi from 'face-api.js';

const video = document.getElementById('webcam');
const statusBox = document.getElementById('statusBox');
const photoBox = document.getElementById('photoBox');
const scannerUI = document.getElementById('scannerUI');
const restartBtn = document.getElementById('restartBtn');

// Intro Elements
const centerLogo = document.getElementById('center-logo');

// --- Event Listeners ---

centerLogo.addEventListener('click', () => {
  document.body.classList.add('transitioning');
  
  // Wait for background crossfade to finish before starting heavy AI load
  setTimeout(() => {
    startScanner();
  }, 1500); 
});

restartBtn.addEventListener('click', () => {
  restartBtn.style.display = 'none';
  photoBox.classList.remove('loaded', 'missing');
  photoBox.src = '/images/question.png'; 
  statusBox.classList.remove('visible');
  scanUserAge();
});

// --- Core Functions ---

function startScanner() {
  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
    video.onloadeddata = async () => {
      video.classList.add('visible');
      try {
        updateStatus('🔁 Loading AI models...');
        
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
          faceapi.nets.ageGenderNet.loadFromUri('/models')
        ]);
        scanUserAge();
      } catch (err) {
        updateStatus('❌ Failed to load face models.<br>Check /models folder.');
        console.error('Model load error:', err);
      }
    };
  }).catch(err => {
    updateStatus('❌ Webcam access denied.');
    console.error('Webcam error:', err);
  });
}

function updateStatus(htmlContent) {
  statusBox.classList.remove('visible');
  setTimeout(() => {
    statusBox.innerHTML = htmlContent; // Using innerHTML for multi-line styling
    statusBox.classList.add('visible');
  }, 50);
}

async function scanUserAge() {
  let ageSum = 0;
  let count = 0;
  const samplesNeeded = 5; 

  statusBox.classList.add('scanning');
  updateStatus('🔍 Initializing scan... please stay still.');

  const detectorOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

  while (count < samplesNeeded) {
    try {
      const detection = await faceapi.detectSingleFace(video, detectorOptions)
        .withAgeAndGender();
      
      if (detection) {
        ageSum += detection.age;
        count++;
        updateStatus(`🔍 Analyzing... ${count}/${samplesNeeded} samples`);
      }
    } catch (err) {
      console.warn("Frame skipped due to error:", err);
    }
    
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  statusBox.classList.remove('scanning');
  const avgAge = ageSum / count;
  const roundedAge = Math.round(avgAge);
  
  showArchiveMessage(roundedAge);
}

function showArchiveMessage(age) {
  const sampleMatches = {
    10: {
      name: 'Ruth',
      age: 10,
      story: 'Ruth, age 10, deported to Theresienstadt.',
      img: 'ruth.jpg',
      quote: '“I was too young to understand, but I remember the silence.”'
    },
    18: {
      name: 'David',
      age: 18,
      story: 'David, age 18, forced into labor in 1942.',
      img: 'david.jpg',
      quote: '“They gave me a shovel and took my name.”'
    },
    30: {
      name: 'Miriam',
      age: 30,
      story: 'Miriam, age 30, hid her children in a cellar.',
      img: 'miriam.jpg',
      quote: '“The floor creaked every time they breathed.”'
    },
    45: {
      name: 'Jakob',
      age: 45,
      story: 'Jakob, age 45, survived Auschwitz.',
      img: null,
      quote: '“Some names were erased. I was not one of them.”'
    }
  };

  const closest = Object.keys(sampleMatches)
    .map(a => parseInt(a))
    .reduce((prev, curr) => Math.abs(curr - age) < Math.abs(prev - age) ? curr : prev);

  const match = sampleMatches[closest];
  const imgSrc = match.img ? `/images/${match.img}` : '/images/question.png';

  photoBox.classList.remove('loaded', 'missing');
  photoBox.style.opacity = 0;

  photoBox.onload = () => {
    photoBox.classList.add('loaded');
    photoBox.style.opacity = 1;
  };

  if (match.img) {
    photoBox.src = imgSrc;
  } else {
    photoBox.src = '/images/question.png';
    photoBox.classList.add('missing');
    photoBox.style.opacity = 1;
  }

  // Inject formatted HTML matching your mockup design
  updateStatus(`
    <div style="color: #bbb; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">Age detected: ${age}</div>
    <div style="margin-bottom: 25px;">${match.story}</div>
    <div style="font-style: italic; color: #ccc;">${match.quote}</div>
  `);

  restartBtn.style.display = 'inline-block';
}