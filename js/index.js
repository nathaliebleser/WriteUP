/* code relevant */
let latestSeparatorPosition = 0;
let deletedTextPosition = 0;
let lastUpdate = 0;
let multiplier = 1; 
let lastTime = Date.now();
let timePaceSustained = 0;
let lastTextLength = 0;

/* Statistics */
const statistics = {
  ultimateWordCount : {
    value : 0,
    id : "alltime-word-count",
    conversion(value) { return Number(value) }
  },
  level : {
    value : 0,
    conversion(value) { return Number(value) }
  },
  sessionGoal : {
    value : 0,
    conversion(value) { return Number(value) }
  },
  ultimateGoal : {
    value : 0,
    conversion(value) { return Number(value) }
  },
  sessionWords : {
    value : 0,
    conversion(value) { return 0 }
  },
  untilNextLevel : {
    value : 0,
    conversion(value) { return Number(value) }
  }
}


/* Options */
const settings = {
  rewardLongWords : {
    id : "long-words",
    value : true,
    conversion(value) { return value === "true" }
  },
  rewardPunctuation : {
    id : "punctuation",
    value : true,
    conversion(value) { return value === "true" }
  },
  enableTextDelete : {
    id : "cutoff",
    value : false,
    conversion(value) { return value === "true" }
  },
  darkMode : {
    id : "",
    value : false,
    conversion(value) { return value === "true" }
  },
  
  punishPause : {
    id : "",
    value : false,
    conversion(value) { return value === "true" }
  },
  
  MAX_CHARACTERS : {
    id : "cutoff-at",
    value : 50,
    conversion(value) { return Number(value) }
  },
  LONG_WORD_CUTOFF : {
    id : "long-word-length",
    value : 8,
    conversion(value) { return Number(value) }
  }
}

let MAX_ELAPSED_TIME = 30*1000;
let MULTIPLIER_DIFFICULTY = 500;

// This means level 30 is reached after about 99999 words, while level 100 is reached after 999999 words
const levelCutoffs = (level) => Math.floor(95.238*level*level + 476.19*level);

function saveStatistics() {
  for (const stat in statistics) {
    localStorage.setItem(stat,statistics[stat].value);
  }
}

function loadStatistics() {
  for (const stat in statistics) {
    let value = localStorage.getItem(stat);
    if (!value) {
      return;
    }
    let conversedValue = statistics[stat].conversion(value);
    statistics[stat].value = conversedValue;
  }
  setWordCounts();
  document.getElementById("level").innerHTML = statistics.level.value;
  document.getElementById("until-next-level").innerHTML = statistics.untilNextLevel.value;
}

function setWordCounts() {
  document.getElementById("words-until-now").innerHTML = statistics.ultimateWordCount.value;
  document.getElementById("word-count").innerHTML = statistics.sessionWords.value;
  document.getElementById("alltime-word-count").innerHTML = statistics.ultimateWordCount.value;

  if (statistics.ultimateGoal.value !== 0) {
    let progress = Math.floor(statistics.ultimateWordCount.value / statistics.ultimateGoal.value);
    const newProgress = `${progress}%`;
    document.getElementById("total-words").value = progress;
    document.getElementById("total-words").innerHTML = newProgress;
    
  }
}

function setUntilNextLevel() {
  if (statistics.untilNextLevel.value === 0) {
    statistics.level.value += 1;
    document.getElementById("level").innerHTML = statistics.level.value;
    statistics.untilNextLevel.value = levelCutoffs(statistics.level.value + 1) - levelCutoffs(statistics.level.value);
  }
  document.getElementById("until-next-level").innerHTML = statistics.untilNextLevel.value;
}

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
  if (settings.rewardPunctuation.value) {
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
      statistics.ultimateWordCount.value += 1;
      statistics.sessionWords.value += 1;
      statistics.untilNextLevel.value -= 1;
      setWordCounts();
      setUntilNextLevel();

      if (settings.rewardLongWords.value) {
        // give 1 point for every character in words shorter than LONG_WORD_CUTOFF
        // give 2 points for every character beyond the cutoff, unless the word is too long
        if (wordLength >= settings.LONG_WORD_CUTOFF.value) {
          // Words longer than 30 characters don't count
          newPoints += settings.LONG_WORD_CUTOFF.value - 1  + 2 * (Math.min(wordLength,30) - settings.LONG_WORD_CUTOFF.value + 1);
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
  const now = Date.now();
  const text = document.getElementById("editor-field").value;

  // Do nothing if the text did not get longer:
  if (text.length + deletedTextPosition <= latestSeparatorPosition) {
    latestSeparatorPosition = text.length + deletedTextPosition;
  } else {
    //Text increased in length
    const selectionPosition = document.getElementById("editor-field").selectionStart;
    const lastChar = text.slice(selectionPosition -1, selectionPosition);
    const elapsedTime = now - lastTime;
    

    if (elapsedTime < MULTIPLIER_DIFFICULTY) {
      // We deserve a point bonus
      if (timePaceSustained > MULTIPLIER_DIFFICULTY) {
        multiplier += Math.floor(timePaceSustained / MULTIPLIER_DIFFICULTY);
      } else {
        multiplier += 1;
      }
      timePaceSustained += elapsedTime;
    } else {
      // We deserve less point bonus

      // How long have we not written? Judge severity
      let severity = -1;
      let remainder = Math.floor(elapsedTime / MULTIPLIER_DIFFICULTY);
      // 500 -> 1, 1000 -> 2, 5000 -> 10, 45000 -> 90
      let divider = 16;
      while (remainder >= 1) {
        // At multiplier_difficulty 500, this will increase severity at: 
        // 500, 8000, 64000, 256000, 512000, 1024000, ... 
        severity += 1;
        remainder = Math.floor(remainder / divider);
        divider = Math.floor(Math.max(2,divider / 2));
      }

      // Lose bonus multiplier for every second that depasses the threshold
      //TODO

      //No to this
      multiplier = Math.max(1, multiplier - Math.floor(elapsedTime / Math.max(0.00001,(MULTIPLIER_DIFFICULTY / 10**severity))));
      timePaceSustained -= elapsedTime * 10**severity;
    } 

    if (timePaceSustained < 0) {
      timePaceSustained = 0;
    }

    //console.log(elapsedTime, multiplier);

    if (lastChar === " " || lastChar === "\n") {
      //let newTextLength = latestSeparatorPosition - deletedTextPosition;
      let textLength = text.length + deletedTextPosition - lastTextLength;
      lastTextLength = text.length + deletedTextPosition;
      console.log(`deletedTextLength: ${deletedTextPosition} textLength: ${textLength} separator position: ${selectionPosition}. Last Text length: ${lastTextLength}`);
      //const newText = text.slice(latestSeparatorPosition - deletedTextPosition);
      const newText = text.slice(selectionPosition - textLength, selectionPosition + 1);
      console.log(newText, newText.length, deletedTextPosition, latestSeparatorPosition);
      //latestSeparatorPosition = deletedTextPosition + text.length;

      add_points(newText);
      saveStatistics();
    }

    // Optional 'delete text on long pauses'/'pressure' feature
    if (settings.punishPause.value && elapsedTime >= MAX_ELAPSED_TIME) {
      //schedule text-deleter
      //TODO
      //This won't work here
    }

    // Optional delete long text feature 
    if (settings.enableTextDelete.value && text.length > settings.MAX_CHARACTERS.value) {
      document.getElementById("editor-field").value = text.slice(-settings.MAX_CHARACTERS.value);
      deletedTextPosition += text.length - settings.MAX_CHARACTERS.value;
    }
  }

  lastTime = now;
}

function resetSelector(event) {
  const element = document.getElementById("editor-field");
  const text = element.value;
  const len = text.length;

  element.setSelectionRange(len, len);
}


/* These functions set and reset settings */
function acceptGameSettings() {
  setRewardLongWords();
  setRewardPunctuation();
  setEnableTextDelete();
  saveSettings();
}

function saveSettings() {
  for (const setting in settings) {
    console.log(setting, settings[setting].value);
    localStorage.setItem(setting, settings[setting].value);
  }
}

function loadSettings() {
  for (const setting in settings) {
    let value = localStorage.getItem(setting);
    if (value) {
      let conversedValue = settings[setting].conversion(value);
      console.log(conversedValue);
      settings[setting].value = conversedValue;
      try {
        console.log(document.getElementById(settings[setting].id).value);
        if (typeof settings[setting].value === "boolean") {
          document.getElementById(settings[setting].id).checked = conversedValue;
        } else {
          document.getElementById(settings[setting].id).value = conversedValue;
        }
      } catch (error) {
        console.log(`${settings[setting].id} is not a valid id`);
      }
    }
  }
  let el = document.getElementById("editor-field");
  if (settings.enableTextDelete.value) {
    el.addEventListener("click",resetSelector);
  }
}

function setRewardLongWords() {
  console.log(settings.rewardLongWords.id);
  console.log(settings);
  if (document.getElementById(settings.rewardLongWords.id).checked) {
    settings.rewardLongWords.value = true;
    setLongWordCutoff();
  } else {
    settings.rewardLongWords.value = false;
  }
}

function setLongWordCutoff() {
  let longWordLength = document.getElementById("long-word-length").value;
  console.log(longWordLength);
  if (Number.isInteger(Number(longWordLength)) && longWordLength >= 5 && longWordLength <= 30) {
    settings.LONG_WORD_CUTOFF.value = longWordLength;
  } else {
    window.alert("Please enter a valid number for long word length.");
  }
}

function setRewardPunctuation() {
  if (document.getElementById(settings.rewardPunctuation.id).checked) {
    settings.rewardPunctuation.value = true;
  } else {
    settings.rewardPunctuation.value = false;
  }
}

function setEnableTextDelete() {
  let el = document.getElementById("editor-field");
  if (document.getElementById(settings.enableTextDelete.id).checked) {
    settings.enableTextDelete.value = true;
    el.addEventListener("click",resetSelector);
    setMaxCharacters();
  } else {
    settings.enableTextDelete.value = false;
    el.removeEventListener("click",resetSelector);
  }
}

function setMaxCharacters() {
  let cutoffAt = document.getElementById(settings.MAX_CHARACTERS.id).value;
  console.log(cutoffAt);
  if (Number.isInteger(Number(cutoffAt))) {
    settings.MAX_CHARACTERS.value = cutoffAt;
  } else {
    window.alert("Please enter a valid number for character cutoff.");
  }
}


function resetGameSettings() {
  settings.rewardLongWords.value = true;
  document.getElementById(settings.rewardLongWords.id).checked = true
  settings.LONG_WORD_CUTOFF.value = 8;
  document.getElementById(settings.LONG_WORD_CUTOFF.id).value = 8;

  settings.rewardPunctuation.value = true;
  document.getElementById(settings.rewardPunctuation.id).checked = true;
  settings.enableTextDelete.value = false;
  document.getElementById(settings.enableTextDelete.id).checked = false;
  settings.MAX_CHARACTERS.value = 50;
  document.getElementById(settings.LONG_WORD_CUTOFF.id).value = 8;
}

function acceptDisplaySettings() {
  if (document.getElementById("hide-points").checked) {
    document.getElementById("point-stat").style.display = "none";
  } else {
    document.getElementById("point-stat").style.display = "";
  }
  if (document.getElementById("hide-session-words").checked) {
    document.getElementById("word-stat").style.display = "none";
  } else {
    document.getElementById("word-stat").style.display = "";
  }
  if (document.getElementById("hide-level").checked) {
    document.getElementById("level-stat").style.display = "none";
  } else {
    document.getElementById("level-stat").style.display = "";
  }
  if (document.getElementById("hide-alltime-words").checked) {
    document.getElementById("alltime-word-stat").style.display = "none";
  } else {
    document.getElementById("alltime-word-stat").style.display = "";
  }
  //TODO: darkmode
  if (document.getElementById("dark-mode").checked) {

  }
}

function resetDisplaySettings() {
  document.getElementById("hide-points").checked = false;
  document.getElementById("point-stat").style.display = "";

  document.getElementById("hide-session-words").checked = false;
  document.getElementById("word-stat").style.display = "";
  
  document.getElementById("hide-level").checked = false;
  document.getElementById("level-stat").style.display = "";

  document.getElementById("hide-alltime-words").checked = false;
  document.getElementById("alltime-word-stat").style.display = "";
  
  document.getElementById("dark-mode").checked = false;
}

function acceptUltimateGoal() {
  const newGoal = document.getElementById("word-goal").value;
  if (Number.isInteger(Number(newGoal))) {
    ultimateGoal = Number(newGoal);
    document.getElementById("ultimate-goal-words").innerHTML = newGoal;
    
    if (Number.isInteger(Number(document.getElementById("words-until-now").innerHTML))) {
      const wordsUntilNow = Number(document.getElementById("words-until-now").innerHTML);
      if (ultimateGoal !== 0) {
        let progress = Math.floor(wordsUntilNow / ultimateGoal);
        const newProgress = `${progress}%`;
        document.getElementById("total-words").value = progress;
        document.getElementById("total-words").innerHTML = newProgress;
        
      }
    }
  }
}

function toggleShowAbout() {
  const displayVal = document.getElementById("about").style.display;
  console.log(displayVal);
  if (displayVal === "") {
    document.getElementById("about").style.display = "none";
  } else {
    document.getElementById("about").style.display = "";
  }
}

function toggleShowStats() {
  //updateStats();

  const displayVal = document.getElementById("stats").style.display;
  if (displayVal === "") {
    document.getElementById("stats").style.display = "none";
  } else {
    document.getElementById("stats").style.display = "";
  }
}

function toggleShowSettings() {
  const displayVal = document.getElementById("settings").style.display;
  if (displayVal === "") {
    document.getElementById("settings").style.display = "none";
  } else {
    document.getElementById("settings").style.display = "";
  }

  document.getElementById("long-words").focus({ focusVisible: false });
}

loadSettings();
loadStatistics();
if (statistics.untilNextLevel.value === 0) {
  statistics.untilNextLevel.value = levelCutoffs(1);
}