/* code relevant */
let latestSeparatorPosition = 0;
let deletedTextPosition = 0;
let lastUpdate = 0;
let multiplier = 1; 
let lastTime = Date.now();
let timePaceSustained = 0;
let lastTextLength = 0;
let functionId;
let wordCountDown = false;

let sessionGoal = "";
let remainingWordsInSession = 0;
let remainingTimeInSession = 0;
let selectedMeasure = "";

/* Statistics */
const statistics = {
  ultimateWordCount : {
    value : 0,
    conversion(value) { return storageNrConstraintCheck(value,0) }
  },
  level : {
    value : 0,
    conversion(value) { return storageNrConstraintCheck(value,0) }
  },
  ultimateGoal : {
    value : 0,
    conversion(value) { return storageNrConstraintCheck(value,1000,Number.MAX_SAFE_INTEGER,1000) }
  },
  sessionWords : {
    value : 0,
    conversion(value) { return 0 }
  },
  untilNextLevel : {
    value : 0,
    conversion(value) { return storageNrConstraintCheck(value,1) }
  }
}

/*Leaderboard */
let leaderboard = [];

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
    conversion(value) { return storageNrConstraintCheck(value,30) }
  },
  LONG_WORD_CUTOFF : {
    id : "long-word-length",
    value : 8,
    conversion(value) { return storageNrConstraintCheck(value,5,30) }
  }
}

const preferences = {
  darkMode : {
    checkId : "dark-mode",
    elementId : "",
    value : false,
    conversion (value) { return value === "true" },
    onChange : toggleDarkmode,
  },
  hidePoints : {
    checkId : "hide-points",
    elementId : "point-stat",
    value : false,
    conversion (value) { return value === "true" },
    onChange : toggleVisibility,
  },
  hideLevel : {
    checkId : "hide-level",
    elementId : "level-stat",
    value : false,
    conversion (value) { return value === "true" },
    onChange : toggleVisibility,
  },
  hideSessionWords : {
    checkId : "hide-session-words",
    elementId : "word-stat",
    value : false,
    conversion (value) { return value === "true" },
    onChange : toggleVisibility,
  },
  hideAlltimeWords : {
    checkId : "hide-alltime-words",
    elementId : "alltime-word-stat",
    value : false,
    conversion (value) { return value === "true" },
    onChange : toggleVisibility,
  },

}

let MAX_ELAPSED_TIME = 30*1000;
let MULTIPLIER_DIFFICULTY = 500;

// This means level 30 is reached after about 99999 words, while level 100 is reached after 999999 words
const levelCutoffs = (level) => Math.floor(95.238*level*level + 476.19*level);


/** nrConstraintCheck checks if the value of an input field of type number meets all constraints and if so returns the number*/
function nrConstraintCheck(numberInputElement, min=0,max=Number.MAX_SAFE_INTEGER,multipleOf=1) {
  if (!numberInputElement.value) {
    window.alert(`Please enter an entire number between ${min} and ${max} that is a multiple of ${multipleOf}.`);
    numberInputElement.focus();
    return null;
  }
  const value = Number(numberInputElement.value);
  if (!value || (typeof value !== "number") || value < min || value > max || !(value % multipleOf === 0)) {
    window.alert(`Please enter an entire number between ${min} and ${max} that is a multiple of ${multipleOf}.`);
    numberInputElement.focus();
    return null;
  }
  return value;
}

/**
 * storageNrConstraintCheck checks if a give value fulfills the requirements specified by min, max and multipleOf. 
 * It returns the value converted into a number.
 * @param {string} value 
 * @param {number} min 
 * @param {number} max 
 * @param {number} multipleOf 
 * @returns {number | null}
 */
function storageNrConstraintCheck(valueStr, min=0, max=Number.MAX_SAFE_INTEGER,multipleOf=1) {
  if (!valueStr) {
    return null;
  }
  const value = Number(valueStr);
  if ((!value && value !== 0) || (typeof value !== "number") || value < min || value > max || !(value % multipleOf === 0)) {
    return null;
  }
  return value;
}

function saveLeaderboard() {
  //JSON.stringify
  console.log(JSON.stringify(leaderboard));
  localStorage.setItem("leaderboard",JSON.stringify(leaderboard));
}

function loadLeaderboard() {
  //JSON.parse
  const leaderboardStr = localStorage.getItem("leaderboard") || "[]";
  leaderboard = JSON.parse(leaderboardStr);
  for (const entry of leaderboard) {
    document.getElementById("leaderboard").innerHTML += `
    <tr>
      <td>${entry.date}</td>
      <td>${entry.points}</td>
      <td>${entry.settings}</td>
    </tr>`;
  }
}

function saveText() {
  const text = document.getElementById("save").value;
  localStorage.setItem("lastSessionText",text);
}

function loadText() {
  const text = localStorage.getItem("lastSessionText");
  if (text) {
    document.getElementById("save").value = text;
  }
}

function saveStatistics() {
  for (const stat in statistics) {
    localStorage.setItem(stat,statistics[stat].value);
  }
}

function savePreferences() {
  for (const pref in preferences) {
    localStorage.setItem(pref,preferences[pref].value);
  }
}

function loadStatistics() {
  for (const stat in statistics) {
    let value = localStorage.getItem(stat);
    if (!value) {
      return;
    }
    let conversedValue = statistics[stat].conversion(value);
    if (conversedValue) {
      statistics[stat].value = conversedValue;
    }
  }
  setWordCounts();
  document.getElementById("level").innerHTML = statistics.level.value;
  document.getElementById("until-next-level").innerHTML = statistics.untilNextLevel.value;
}

function loadPreferences() {
  for (const pref in preferences) {
    let value = localStorage.getItem(pref);
    if (!value) {
      return;
    }
    let conversedValue = preferences[pref].conversion(value);
    document.getElementById(preferences[pref].checkId).checked = conversedValue;
  }
  acceptDisplaySettings();
}

function updateStatProgression() {
  if (statistics.ultimateGoal.value !== 0) {
    let progress = Math.floor(statistics.ultimateWordCount.value / statistics.ultimateGoal.value);
    const newProgress = `${progress}%`;
    document.getElementById("total-words").value = progress;
    document.getElementById("total-words").innerHTML = newProgress;
  }
}

function setWordCounts() {
  document.getElementById("words-until-now").innerHTML = statistics.ultimateWordCount.value;
  document.getElementById("word-count").innerHTML = statistics.sessionWords.value;
  document.getElementById("alltime-word-count").innerHTML = statistics.ultimateWordCount.value;
  document.getElementById("ultimate-goal-words").innerHTML = statistics.ultimateGoal.value;

  updateStatProgression();
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
      if (wordCountDown) {
        remainingWordsInSession -= 1;
        if (remainingWordsInSession === 0) {
          let points = Number(document.getElementById("points").innerHTML) + newPoints;
          addLeaderboardEntry(points);
          resetSessionGoalSetter();
        } else {
          updateGoalProgression(remainingWordsInSession);
        }
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
  const deletedText = document.getElementById("save").value.slice(0,deletedTextPosition);
  document.getElementById("save").value = deletedText + text;

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

    // Optional delete long text feature 
    if (settings.enableTextDelete.value && text.length > settings.MAX_CHARACTERS.value) {
      document.getElementById("editor-field").value = text.slice(-settings.MAX_CHARACTERS.value);
      deletedTextPosition += text.length - settings.MAX_CHARACTERS.value;
    }
  }
  lastTime = now;

  // Save progress in case of browser malfunction
  saveText();
}

function resetSelector(event) {
  const element = document.getElementById("editor-field");
  const text = element.value;
  const len = text.length;

  element.setSelectionRange(len, len);
}


/* These functions set and reset settings */
function acceptGameSettings() {
  if (!setEnableTextDelete() || !setRewardLongWords()) {
    return;
  }
  setRewardPunctuation()
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
    // Access value in local storage
    const value = localStorage.getItem(setting);
    if (value) {
      // Convert value
      const conversedValue = settings[setting].conversion(value);
      // In case of detectable local storage corruption, use default value, otherwise use converted value
      settings[setting].value = conversedValue || settings[setting].value;
      try {
        if (typeof settings[setting].value === "boolean") {
          document.getElementById(settings[setting].id).checked = settings[setting].value;
        } else {
          document.getElementById(settings[setting].id).value = settings[setting].value;
        }
      } catch (error) {
        console.log(`${settings[setting].id} is not a valid id`);
      }
    }
  }
  // Treat special cases arising from settings
  let el = document.getElementById("editor-field");
  if (settings.enableTextDelete.value) {
    el.addEventListener("click",resetSelector);
  }
  toggleCutoff();
  toggleLongWordLength();
}

function setRewardLongWords() {
  if (document.getElementById(settings.rewardLongWords.id).checked) {
    settings.rewardLongWords.value = true;
    return setLongWordCutoff();
  } else {
    settings.rewardLongWords.value = false;
    return true;
  }
}

function setLongWordCutoff() {
  const longWordLengthElement = document.getElementById("long-word-length");
  const longWordLength = nrConstraintCheck(longWordLengthElement,5,30);
  if (longWordLength) {
    settings.LONG_WORD_CUTOFF.value = longWordLength;
    return true;
  } else {
    return false;
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
    return setMaxCharacters();
  } else {
    settings.enableTextDelete.value = false;
    el.removeEventListener("click",resetSelector);
    return true;
  }
}

function setMaxCharacters() {
  let cutoffAtElement = document.getElementById(settings.MAX_CHARACTERS.id);
  const cutoffAt = nrConstraintCheck(cutoffAtElement,30);
  if (cutoffAt) {
    settings.MAX_CHARACTERS.value = cutoffAt;
    return true;
  } else {
    return false;
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

function toggleVisibility(checkId,elementId) {
  if (document.getElementById(checkId).checked) {
    document.getElementById(elementId).style.display = "none";
  } else {
    document.getElementById(elementId).style.display = "";
  }
}

function toggleDarkmode(checkId,elementId) {
  if (document.getElementById("dark-mode").checked) {
    const parent = document.getElementById("head");
    let style = document.createElement("link");
    style.setAttribute("id","darkmode");
    style.setAttribute("href","/css/darkmode.css");
    style.setAttribute("rel","stylesheet");
    style.setAttribute("type","text/css");
    parent.appendChild(style);
  } else {
    const parent = document.getElementById("head");
    const style = document.getElementById("darkmode");
    if (style) {
      parent.removeChild(style);
    }
  }
}

function acceptDisplaySettings() {
  for (const pref in preferences) {
    preferences[pref].value = document.getElementById(preferences[pref].checkId).checked;
    preferences[pref].onChange(preferences[pref].checkId,preferences[pref].elementId);
  }
  savePreferences();
}

function resetDisplaySettings() {
  for (const pref in preferences) {
    document.getElementById(preferences[pref].checkId).checked = false;
  }
}

function acceptUltimateGoal() {
  const wordGoalElement = document.getElementById("word-goal");
  const newGoal = nrConstraintCheck(wordGoalElement,1000,Number.MAX_SAFE_INTEGER,1000);
  if (newGoal) {
    statistics.ultimateGoal.value = newGoal;
    document.getElementById("ultimate-goal-words").innerHTML = newGoal;
    //individually save it in local Storage
    localStorage.setItem("ultimateGoal",newGoal);
    
    updateStatProgression();
  }
}

function toggleShowAbout() {
  const displayVal = document.getElementById("about").style.display;
  console.log(displayVal);
  if (displayVal === "block") {
    document.getElementById("about").style.display = "none";
  } else {
    document.getElementById("about").style.display = "block";
    document.getElementById("stats").style.display = "none";
    document.getElementById("settings").style.display = "none";
  }
}

function toggleShowStats() {
  //updateStats();

  const displayVal = document.getElementById("stats").style.display;
  if (displayVal === "block") {
    document.getElementById("stats").style.display = "none";
  } else {
    document.getElementById("stats").style.display = "block";
    document.getElementById("settings").style.display = "none";
    document.getElementById("about").style.display = "none";
  }
}

function toggleShowSettings() {
  const displayVal = document.getElementById("settings").style.display;
  if (displayVal === "block") {
    document.getElementById("settings").style.display = "none";
  } else {
    document.getElementById("settings").style.display = "block";
    document.getElementById("stats").style.display = "none";
    document.getElementById("about").style.display = "none";
  }

  //document.getElementById("long-words").focus({ focusVisible: false });
}

function toggleCutoff() {
  const cutoffCheckEl = document.getElementById("cutoff");
  const cutoffValueEl = document.getElementById("cutoff-at");
  if (cutoffCheckEl.checked) {
    cutoffValueEl.disabled = false;
  } else {
    cutoffValueEl.disabled = true;
  }
}

function toggleLongWordLength() {
  const longWordCheckEl = document.getElementById("long-words");
  const longWordValueEl = document.getElementById("long-word-length");
  if (longWordCheckEl.checked) {
    longWordValueEl.disabled = false;
  } else {
    longWordValueEl.disabled = true;
  }
}

function addLeaderboardEntry(points) {
  const date = new Date();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hour = date.getHours();
  const min = date.getMinutes();
  const newEntry = {
    date: `${day}.${month}.${year} ${hour}:${min}`,
    points,
    "settings": sessionGoal,
  }
  leaderboard.push(newEntry);
  document.getElementById("leaderboard").innerHTML += `
  <tr>
    <td>${newEntry.date}</td>
    <td>${newEntry.points}</td>
    <td>${newEntry.settings}</td>
  </tr>`;
  sessionGoal = "";
  saveLeaderboard();
}

function updateGoalProgression(newValue) {
  if (selectedMeasure === "minutes") {
    let hours = ~~(remainingTimeInSession / 3600);
    let min = ~~((remainingTimeInSession - hours * 3600) / 60);
    let seconds = ~~(remainingTimeInSession - hours * 3600 - min * 60);
    let minStr = min.toString().padStart(2,"0");
    let secondsStr = seconds.toString().padStart(2,"0");
    if (hours > 0) {
      document.getElementById("goal-indicator").innerHTML = `Left: ${hours}:${minStr}:${secondsStr} ${selectedMeasure}`;
    } else {
      document.getElementById("goal-indicator").innerHTML = `Left: ${minStr}:${secondsStr} ${selectedMeasure}`;
    }
  } else {
    document.getElementById("goal-indicator").innerHTML = `Left: ${newValue} ${selectedMeasure}`;
  }
}

function resetSessionGoalSetter() {
  document.getElementById("points").innerHTML = 0;

  let btn = document.getElementById("session-goal-btn");
  btn.value = "Set session goal";
  btn.removeEventListener("click",stopSession);
  btn.addEventListener("click", startSession);
  btn.disabled = false;

  let freeBtn = document.getElementById("free-session-goal-btn");
  freeBtn.value = "Write without goal";
  freeBtn.removeEventListener("click",stopFreeSession);
  freeBtn.addEventListener("click", startFreeSession);
  freeBtn.disabled = false;

  wordCountDown = false;

  multiplier = 1;

  document.getElementById("goal-indicator").innerHTML = "Left:"
}

function updateTimer() {
  remainingTimeInSession -= 1;
  updateGoalProgression(remainingTimeInSession);
  if (remainingTimeInSession === 0) {
    console.log(remainingTimeInSession);
    clearInterval(functionId);
    let points = document.getElementById("points").innerHTML;
    addLeaderboardEntry(points);
    resetSessionGoalSetter();
  }
}

function stopSession() {
  if (functionId) {
    clearInterval(functionId);
    functionId = undefined;
  } 
  let points = document.getElementById("points").innerHTML;
  sessionGoal += "; interrupted";
  addLeaderboardEntry(points);
  resetSessionGoalSetter();
}

function stopFreeSession() {
  let points = document.getElementById("points").innerHTML;
  addLeaderboardEntry(points);
  resetSessionGoalSetter();
}

function startSession() {
  // Get field value
  const sessionGoalInput = document.getElementById("session-goal");
  let goal = nrConstraintCheck(sessionGoalInput,1);
  if (!goal) {
    return;
  }
  // Get whether words or minutes
  selectedMeasure = document.querySelector('input[name="measure"]:checked').value;
  if (!selectedMeasure) {
    return;
  }
  // Set internal values
  if (selectedMeasure === "words") {
    sessionGoal = goal + " words";
    remainingWordsInSession = Number(goal);
    wordCountDown = true;
  } else {
    sessionGoal = goal + " minutes";
    remainingTimeInSession = Number(goal) * 60;
    functionId = setInterval(updateTimer, 1000);
  }
  // Set visible fields
  updateGoalProgression(goal);
  // Set focus on editor field
  document.getElementById("editor-field").focus();
  // 3 second countdown?
  // Disable button, create stop button
  let btn = document.getElementById("session-goal-btn");
  btn.value = "Reset goal";
  btn.removeEventListener("click",startSession);
  btn.addEventListener("click", stopSession);
  let freeBtn = document.getElementById("free-session-goal-btn");
  freeBtn.disabled = true;
}

function startFreeSession() {
  sessionGoal = "No target";
  let freeBtn = document.getElementById("free-session-goal-btn");
  freeBtn.value = "Stop session";
  freeBtn.removeEventListener("click",startFreeSession);
  freeBtn.addEventListener("click", stopFreeSession);
  let btn = document.getElementById("session-goal-btn");
  btn.disabled = true;
}

function changeToMinutes() {
  if (document.getElementById("session-goal").value === 500) {
    document.getElementById("session-goal").value = 30;
  }
}

function changeToWords() {
  if (document.getElementById("session-goal").value === 30) {
    document.getElementById("session-goal").value = 500;
  }
}

loadSettings();
loadStatistics();
loadPreferences();
loadText();
loadLeaderboard();


if (statistics.untilNextLevel.value === 0) {
  statistics.untilNextLevel.value = levelCutoffs(1);
}
