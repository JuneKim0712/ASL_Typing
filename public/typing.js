import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

// Initialize global variables
let handLandmarker;
const alphabet = 'abcdefghiklmnopqrstuvwxy'; // Exclude 'j' and 'z'
const sess = new onnx.InferenceSession();
let tensor; // Reuse tensor object

// Load the ONNX model and initialize the tensor
const loadModel = async () => {
    await sess.loadModel('new4_model.onnx');
    tensor = new onnx.Tensor(new Float32Array(63), "float32", [1, 63]);
};
loadModel();

// Get reference to prediction display
const prediction = document.getElementById("predicted");

// Predict the alphabet based on hand landmarks
const predictAlphabet = async (landmarks) => {
    if (landmarks) {
        const flattenedLandmarks = landmarks.flatMap(landmark => [landmark.x, landmark.y, landmark.z]);
        tensor.data.set(flattenedLandmarks); // Update the tensor data
        const results = await sess.run([tensor]);
        const outputTensor = results.values().next().value;
        const probabilities = outputTensor.data;

        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const predictedAlphabet = alphabet[maxIndex];
        prediction.innerHTML = `Predicted alphabet: ${predictedAlphabet}`;
        triggerHitEffect(predictedAlphabet);
    }
};

// Create and configure the hand landmarker
const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
    });
    startWebcam();
};
createHandLandmarker();

// Start the webcam and begin frame processing
const startWebcam = () => {
    const video = document.getElementById("webcam");
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
};

// Process frames from the webcam
const predictWebcam = () => {
    const video = document.getElementById("webcam");
    let frameCounter = 0;
    const frameLimit = 6; // Process every 6 frames

    const processFrame = async () => {
        if (handLandmarker) {
            if (frameCounter % frameLimit === 0) {
                const results = await handLandmarker.detectForVideo(video, performance.now());
                if (results.landmarks) {
                    await predictAlphabet(results.landmarks[0]);
                }
            }
            frameCounter++;
        }
        requestAnimationFrame(processFrame);
    };
    processFrame();
};

// Game-related variables and constants
const letters = 'abcdefghiklmnopqrstuvwxy'; // Exclude 'j' and 'z'
const fallingLettersDiv = document.getElementById('fallingLetters');
const scoreDisplay = document.getElementById('score');
let fallingLetters = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let fallSpeed = 100; // Initial falling speed
let spawnRate = 1500; // Time in ms between spawns
let fallSpeedIncreaseInterval = 5000; // Time in ms to increase fall speed
let lastSpeedIncreaseTime = Date.now();
let usedLetters = new Set(); // Track used letters
const redLetterProbability = 0; // Probability of a red letter

// Utility functions
const getRandomLetter = () => {
    let letter;
    do {
        letter = letters[Math.floor(Math.random() * letters.length)];
    } while (usedLetters.has(letter));
    usedLetters.add(letter);
    return letter;
};

const getRandomPosition = () => `${Math.random() * (window.innerWidth - 50)}px`; // Prevent letters from going off-screen

const getRandomSize = () => `${Math.random() * 30 + 50}px`; // Size between 50px and 80px

// Create a falling letter
const createFallingLetter = () => {
    if (fallingLetters.length >= 24) return; // Cap the number of letters on the screen

    if (usedLetters.size >= letters.length) usedLetters.clear(); // Clear used letters if all have been used

    const letter = document.createElement('div');
    letter.classList.add('fallingLetter');
    letter.textContent = getRandomLetter();
    letter.style.left = getRandomPosition();
    letter.style.top = `-50px`;
    letter.style.fontSize = getRandomSize();
    letter.style.position = 'absolute';
    letter.style.textAlign = 'center';
    letter.style.color = Math.random() < redLetterProbability ? 'red' : 'white';

    fallingLettersDiv.appendChild(letter);
    fallingLetters.push(letter);

    // Move the letter independently
    const moveLetter = () => {
        if (!letter.dataset.frozen) {
            const rect = letter.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                letter.style.top = `${rect.top + fallSpeed}px`;
                requestAnimationFrame(moveLetter);
            } else {
                if (fallingLettersDiv.contains(letter)) {
                    fallingLettersDiv.removeChild(letter);
                    fallingLetters = fallingLetters.filter(l => l !== letter);
                    usedLetters.delete(letter.textContent);
                }
                if (!letter.classList.contains('redLetter')) endGame();
            }
        }
    };

    moveLetter(); // Start the movement
};

// Trigger hit effect for the letter that matches the key
const triggerHitEffect = (key) => {
    fallingLetters.forEach((letter) => {
        if (letter.textContent === key && !letter.dataset.frozen) {
            letter.dataset.frozen = 'true'; // Freeze the letter
            letter.classList.add('hitEffect'); // Add animation class
            setTimeout(() => {
                if (fallingLettersDiv.contains(letter)) {
                    fallingLettersDiv.removeChild(letter);
                    fallingLetters = fallingLetters.filter(l => l !== letter);
                    usedLetters.delete(letter.textContent);
                    score += letter.classList.contains('redLetter') ? -1 : 1;
                    scoreDisplay.textContent = 'Score: ' + score;
                }
            }, 150); // Delay removal for visual effect
        }
    });
};

// Handle key press events
const checkKeyPress = (event) => {
    const key = event.key.toLowerCase();
    triggerHitEffect(key);
};

// Increase fall speed and letter spawning rate over time
const increaseDifficulty = () => {
    const now = Date.now();
    if (now - lastSpeedIncreaseTime > fallSpeedIncreaseInterval) {
        console.log(fallSpeed)
        fallSpeed *= 1.3; // Increase fall speed
        spawnRate = Math.max(500, spawnRate * 0.9); // Decrease spawn interval to increase spawn rate
        lastSpeedIncreaseTime = now;
    }
};

// Declare globally
let gameInterval; 

// Start the game
const startGame = () => {
    resetGame();
    document.getElementById('gameOverOverlay').style.display = 'none';
    gameInterval = setInterval(createFallingLetter, spawnRate); // Use global variable
    setInterval(() => {
        increaseDifficulty();
    }, 1000);
};

// End the game
const endGame = () => {
    clearInterval(gameInterval); // Clear the global interval
    document.getElementById('gameOverOverlay').style.display = 'flex';
    document.getElementById('finalScore').textContent = `Your Score: ${score}`;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    document.getElementById('highScore').textContent = `High Score: ${highScore}`;
};


// Reset the game state
const resetGame = () => {
    fallingLetters.forEach(letter => {
        if (fallingLettersDiv.contains(letter)) {
            fallingLettersDiv.removeChild(letter);
        }
    });
    fallingLetters = [];
    score = 0;
    scoreDisplay.textContent = 'Score: ' + score;
    fallSpeed = 100; // Reset to initial speed
    spawnRate = 1500; // Reset to initial spawn rate
    lastSpeedIncreaseTime = Date.now();
    usedLetters.clear(); // Clear used letters
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const playAgainButton = document.getElementById('playAgainButton');
    playAgainButton.addEventListener('click', startGame);
});

document.addEventListener('keydown', checkKeyPress);

startGame();
