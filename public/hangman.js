const words = [
    'javascript', 'hangman', 'programming', 'development', 'coding', 'internet', 'computer', 'technology',
    'software', 'hardware', 'algorithm', 'network', 'database', 'debugging', 'frontend', 'backend',
    'webpage', 'application', 'interface', 'server', 'client', 'framework', 'library', 'syntax', 'function'
];

let chosenWord = '';
let guessedLetters = [];
let attemptsLeft = 6;

// Function to initialize the game
function initializeGame() {
    chosenWord = words[Math.floor(Math.random() * words.length)];
    guessedLetters = [];
    attemptsLeft = 6;
    updateWordDisplay();
    updateLettersDisplay();
    updateAttemptsDisplay();
    document.getElementById('message').textContent = '';
}

// Function to update the displayed word with underscores and guessed letters
function updateWordDisplay() {
    const displayWord = chosenWord.split('').map(letter => guessedLetters.includes(letter) ? letter : '_').join(' ');
    document.getElementById('word').textContent = displayWord;
}

// Function to update the display of guessed letters
function updateLettersDisplay() {
    document.getElementById('letters').textContent = `Guessed Letters: ${guessedLetters.join(', ')}`;
}

// Function to update the display of attempts left
function updateAttemptsDisplay() {
    document.getElementById('attempts-left').textContent = attemptsLeft;
}


function makeGuess() {
    const guess = document.getElementById('guess').value.toLowerCase();
    document.getElementById('guess').value = '';

    if (guess && !guessedLetters.includes(guess)) {
        guessedLetters.push(guess);

        if (chosenWord.includes(guess)) {
            updateWordDisplay();
            if (!document.getElementById('word').textContent.includes('_')) {
                document.getElementById('message').textContent = 'Congratulations! You won!';
            }
        } else {
            attemptsLeft--;
            updateAttemptsDisplay();
            if (attemptsLeft === 0) {
                document.getElementById('message').textContent = `Game Over! The word was "${chosenWord}".`;
                
            }
        }
        updateLettersDisplay();
    }
}

// Initialize the game on page load
initializeGame();
