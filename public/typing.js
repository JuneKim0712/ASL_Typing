import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

let handLandmarker;
let runningMode = "VIDEO";
const alphabet = 'abcdefghiklmnopqrstuvwxy';
const sess = new onnx.InferenceSession();
const model = sess.loadModel('new2_model.onnx');


const predictAlphabet = async (landmarks) => {
    if (landmarks != undefined) {
      console.log(landmarks);
      const flattenedLandmarks = landmarks.flatMap(landmark => [landmark.x, landmark.y, landmark.z]);
      console.log(flattenedLandmarks);
      const tensor = new onnx.Tensor(new Float32Array(flattenedLandmarks), "float32", [1, 63]);
      console.log(tensor);
      const results = await sess.run([tensor]);
      console.log(results)
      const outputTensor = results.values().next().value;
      const probabilities = outputTensor.data;

  const maxIndex = probabilities.indexOf(Math.max(...probabilities));
  const predictedAlphabet = alphabet[maxIndex];
  
  console.log(`Predicted alphabet: ${predictedAlphabet}, Probability: ${probabilities[maxIndex]}`);
    }

};

const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 2
  });
  startWebcam();
};

createHandLandmarker();

const startWebcam = () => {``
  const video = document.getElementById("webcam");

  const constraints = { video: true };
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
};

const predictWebcam = () => {
  const video = document.getElementById("webcam");
  const processFrame = async () => {
    if (handLandmarker) {
      const results = await handLandmarker.detectForVideo(video, performance.now());
      if (results.landmarks) {
        await predictAlphabet(results.landmarks[0]);
      }
      requestAnimationFrame(processFrame);
    }
  };
  processFrame();
};


const letters = 'abcdefghiklmnpqrstuvwxy'; // Exclude 'j' and 'z'
const fallingLettersDiv = document.getElementById('fallingLetters');
const scoreDisplay = document.getElementById('score');
let fallingLetters = [];
let score = 0;
let fallSpeed = 10; // Initial falling speed
let gameInterval = 1000; // Initial interval for creating letters
let fallInterval = 0.1; // Initial interval for updating letters
let fallSpeedIncreaseInterval = 500; // Time in ms to increase fall speed
let lastSpeedIncreaseTime = Date.now();
let usedLetters = new Set(); // Track used letters
const redLetterProbability = 0.1; // 10% probability of a red letter

function getRandomLetter() {
    let letter;
    do {
        letter = letters[Math.floor(Math.random() * letters.length)];
    } while (usedLetters.has(letter)); // Ensure no duplicates
    usedLetters.add(letter);
    return letter;
}

function getRandomPosition() {
    return Math.random() * (window.innerWidth / 2) + (window.innerWidth / 4) + 'px'; // Appear more towards the middle
}

function getRandomSize() {
    return `${Math.random() * 30 + 20}px`; // Size between 20px and 50px
}

function createFallingLetter() {
    if (fallingLetters.length >= 24) {
        return; // Cap the maximum number of letters on the screen to 24
    }
    if (usedLetters.size >= letters.length) {
        usedLetters.clear(); // Clear used letters if all letters have been used
    }
    const letter = document.createElement('div');
    letter.classList.add('fallingLetter');
    letter.textContent = getRandomLetter();
    letter.style.left = getRandomPosition();
    letter.style.top = `-50px`;
    letter.style.fontSize = getRandomSize();
    letter.style.position = 'absolute';
    letter.style.textAlign = 'center';

    // Determine if this letter should be red
    if (Math.random() < redLetterProbability) {
        letter.classList.add('redLetter');
    } else {
        letter.style.color = 'white';
    }

    fallingLettersDiv.appendChild(letter);
    fallingLetters.push(letter);
}

function updateFallingLetters() {
    fallingLetters.forEach((letter) => {
        const rect = letter.getBoundingClientRect();
        if (rect.top < window.innerHeight) {
            letter.style.top = `${rect.top + fallSpeed}px`;
        } else {
            fallingLettersDiv.removeChild(letter);
            fallingLetters = fallingLetters.filter(l => l !== letter);
            usedLetters.delete(letter.textContent); // Allow letter to be reused

            if (!letter.classList.contains('redLetter')) {
                // Handle missed non-red letter
                alert('Game Over! Your score: ' + score);
                resetGame();
            }
        }
    });
}

function checkKeyPress(event) {
    const key = event.key.toLowerCase();
    fallingLetters.forEach((letter) => {
        if (letter.textContent === key) {
            fallingLettersDiv.removeChild(letter);
            fallingLetters = fallingLetters.filter(l => l !== letter);
            usedLetters.delete(letter.textContent); // Allow letter to be reused
            if (letter.classList.contains('redLetter')) {
                score--;
            } else {
                score++;
            }
            scoreDisplay.textContent = 'Score: ' + score;
        }
    });
}

function increaseSpeed() {
    const now = Date.now();
    if (now - lastSpeedIncreaseTime > fallSpeedIncreaseInterval) {
        fallSpeed += 0.5; // Increase fall speed by 0.5px per update
        gameInterval = Math.max(500, gameInterval - 50); // Reduce interval between creating letters
        fallInterval = Math.max(25, fallInterval - 5); // Reduce interval between updating letters
        lastSpeedIncreaseTime = now;
    }
}

function resetGame() {
    fallingLetters.forEach(letter => fallingLettersDiv.removeChild(letter));
    fallingLetters = [];
    score = 0;
    scoreDisplay.textContent = 'Score: ' + score;
    fallSpeed = 5;
    gameInterval = 1000;
    fallInterval = 50;
    lastSpeedIncreaseTime = Date.now();
    usedLetters.clear(); // Clear used letters
}

setInterval(createFallingLetter, gameInterval);
setInterval(() => {
    updateFallingLetters();
    increaseSpeed();
}, fallInterval);

document.addEventListener('keydown', checkKeyPress);
