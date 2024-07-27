const letters = 'abcdefghiklmnpqrstuvwxy'; // Exclude 'j' and 'z'
const fallingLettersDiv = document.getElementById('fallingLetters');
const scoreDisplay = document.getElementById('score');
let fallingLetters = [];
let score = 0;
let fallSpeed = 5; // Initial falling speed
let gameInterval = 100; // Initial interval for creating letters
let fallInterval = 10; // Initial interval for updating letters
let fallSpeedIncreaseInterval = 5000; // Time in ms to increase fall speed
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
