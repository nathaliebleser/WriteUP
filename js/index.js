//document.getElementById("textareaID").value
/* code relevant */
let latestSeparatorPosition = 0;
let deletedTextPosition = 0;
let lastUpdate = 0;
let multiplier = 1; 

/* Statistics */
let wordCount = 0;

/* Options */
let rewardLongWords = true;
let rewardPunctuation = true;
let enableTextDelete = false;
let darkMode = false;

let punishLongWords = false;

let MAX_CHARACTERS = 50;
let LONG_WORD_CUTOFF = 10;

/** This function calculates how many points to add */
function add_points(words) {
  //This excludes punctuation not commonly used in English for now
  const emDash = "—";
  const enDash = "–";
  const punctuation = [".",",",":",";","!","?", emDash, enDash]; 

  const punctuationPoints = {
    ".": 5,
    "," : 4,
    ":": 5,
    ";": 10,
    "!": 5,
    "?": 5, 
    emDash: 10, 
    enDash: 10
  };

  let newPoints = 0;

  // Calculate points given by punctuation
  if (rewardPunctuation) {
    let foundPunctuation = [];
    // find type and position of all punctuation characters
    for (let i = 0; i < words.length; i++) {
      if (punctuation.indexOf(words[i]) > -1) {
        foundPunctuation.push([words[i], i]);
      }
    }
    // Count points
    let lastPunctuationPosition = 0;
    for (let i = 0; i < foundPunctuation.length; i++) {
      let punctuationData = foundPunctuation[i];
      // Only allow non-consecutive punctuation from giving points
      if (punctuationData[1] !== lastPunctuationPosition + 1) {
        newPoints += punctuationPoints[punctuationData[0]];
      }
      lastPunctuationPosition = punctuationData[1];
    }

  }
  // Calculate points given by words
  const wordArray = words.split(" ");
  for (let i = 0; i < wordArray.length; i++) {
    // Count only alphanumerical letters
    const regex = /\p{L}+/gu;
    const lettersOnly = wordArray[i].matchAll(regex);

    for (const word of lettersOnly) {
      const wordLength = word[0].length;
      wordCount += 1;

      if (rewardLongWords) {
        // give 1 point for every character in words shorter than LONG_WORD_CUTOFF
        // give 2 points for every character beyond the cutoff, unless the word is too long
        if (wordLength > LONG_WORD_CUTOFF) {
          // Hello, this states that words longer than 30 characters don't count
          newPoints += LONG_WORD_CUTOFF + 2 * (Math.min(wordLength,30) - LONG_WORD_CUTOFF);
        } else {
          newPoints += wordLength;
        }
      } else {
        newPoints += wordLength;
      }
    }
  }

  //update points
  console.log("New points: ", newPoints);

  let points = Number(document.getElementById("points").innerHTML);
  points += multiplier * newPoints;
  document.getElementById("points").innerHTML = points;

}

/** This function pulls text from the text area and call add_points*/
function calculate() {
  const text = document.getElementById("editor-field").value;

  // Only do anything if the text gets longer:
  if (text.length + deletedTextPosition <= latestSeparatorPosition) {
    latestSeparatorPosition = text.length + deletedTextPosition;
  } else {
    const lastChar = text.slice(-1);

    if (lastChar === " " || lastChar === "\n") {
      const newText = text.slice(latestSeparatorPosition - deletedTextPosition);
      console.log(newText, deletedTextPosition, latestSeparatorPosition);
      latestSeparatorPosition = deletedTextPosition + text.length;

      add_points(newText);
    }

    // Optional delete text feature 
    if (enableTextDelete && text.length > MAX_CHARACTERS) {
      document.getElementById("editor-field").value = text.slice(-MAX_CHARACTERS + 1);
      deletedTextPosition += text.length - MAX_CHARACTERS;
    }
  }
}

function setMaxCharacters() {
  //TODO: write html element and link
  MAX_CHARACTERS = 50;
}

function setLongWordReward() {
  //TODO: write html element and link
  let input = true;
  if (input) {
    //change to input format
  }
  rewardLongWords = input;
}