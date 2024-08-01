import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

let handLandmarker;
let runningMode = "VIDEO";
const alphabet = 'abcdefghiklmnopqrstuvwxy';
const sess = new onnx.InferenceSession();
const model = sess.loadModel('new2_model.onnx');
const prediction = document.getElementById("predicted");

const predictAlphabet = async (landmarks) => {
    if (landmarks != undefined) {
        const flattenedLandmarks = landmarks.flatMap(landmark => [landmark.x, landmark.y, landmark.z]);
        const tensor = new onnx.Tensor(new Float32Array(flattenedLandmarks), "float32", [1, 63]);
        const results = await sess.run([tensor]);
        const outputTensor = results.values().next().value;
        const probabilities = outputTensor.data;

        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const predictedAlphabet = alphabet[maxIndex];
        prediction.innerHTML = `Predicted alphabet: ${predictedAlphabet}`;
        triggerHitEffect(predictedAlphabet);
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

const startWebcam = () => {
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
let highScore = localStorage.getItem('highScore') || 0;
let fallSpeed = 5; // Initial falling speed
let gameInterval;
let fallInterval;
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
            if (fallingLettersDiv.contains(letter)) {
                fallingLettersDiv.removeChild(letter);
                fallingLetters = fallingLetters.filter(l => l !== letter);
                usedLetters.delete(letter.textContent); // Allow letter to be reused
            }
            if (!letter.classList.contains('redLetter')) {
                // Handle missed non-red letter
                endGame();
            }
        }
    });
}

function triggerHitEffect(key) {
    fallingLetters.forEach((letter) => {
        if (letter.textContent === key) {
            letter.classList.add('hitEffect');
            setTimeout(() => {
                if (fallingLettersDiv.contains(letter)) {
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
            }, 300); // Delay removal for visual effect
        }
    });
}

function checkKeyPress(event) {
    const key = event.key.toLowerCase();
    triggerHitEffect(key);
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

function endGame() {
    clearInterval(gameInterval);
    clearInterval(fallInterval);
    document.getElementById('gameOverOverlay').style.display = 'flex';
    document.getElementById('finalScore').textContent = `Your Score: ${score}`;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
    }
    document.getElementById('highScore').textContent = `High Score: ${highScore}`;
}

function startGame() {
    resetGame();
    document.getElementById('gameOverOverlay').style.display = 'none';
    gameInterval = setInterval(createFallingLetter, 1000);
    fallInterval = setInterval(() => {
        updateFallingLetters();
        increaseSpeed();
    }, 50);
}

document.addEventListener('DOMContentLoaded', () => {
    // Add event listener to the "Play Again" button
    const playAgainButton = document.getElementById('playAgainButton');
    playAgainButton.addEventListener('click', startGame);
});

function resetGame() {
    fallingLetters.forEach(letter => {
        if (fallingLettersDiv.contains(letter)) {
            fallingLettersDiv.removeChild(letter);
        }
    });
    fallingLetters = [];
    score = 0;
    scoreDisplay.textContent = 'Score: ' + score;
    fallSpeed = 5;
    gameInterval = 1000;
    fallInterval = 50;
    lastSpeedIncreaseTime = Date.now();
    usedLetters.clear(); // Clear used letters
}

document.addEventListener('keydown', checkKeyPress);

startGame();
