/* code relevant */
let latestSeparatorPosition = 0;
let deletedTextPosition = 0;
let points = 0;
let multiplier = 1; 
let lastTextLength = 0;
let functionId;
let wordCountDown = false;
let sessionSuccessfullyStarted = false;

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
  enablePointMultiplier : {
    id : "point-multiplier",
    value : true,
    conversion(value) { return value === "true" }
  },
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
  },
  MULTIPLIER_DIFFICULTY : {
    id : "multiplier-difficulty",
    value : 100,
    conversion(value) { return storageNrConstraintCheck(value,1,)}
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

// This means level 30 is reached after about 99999 words, while level 100 is reached after 999999 words
const levelCutoffs = (level) => Math.floor(95.238*level*level + 476.19*level);


/** Checks if the value of an input field of type number meets all constraints.
 * Returns the field value converted into a number or null if constraints were not met.
 * @param {HTMLElement} numberInputElement 
 * @param {number} min 
 * @param {number} max 
 * @param {number} multipleOf 
 * @returns {number | null}
 */
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
 * Checks if a give value fulfills the requirements specified by min, max and multipleOf. 
 * Returns the value converted into a number or null if constraints were not met.
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

/**
 * Keeps selector at the end of the textarea field
 */
function resetSelector() {
  const element = document.getElementById("editor-field");
  const text = element.value;
  const len = text.length;

  element.setSelectionRange(len, len);
}


/* These functions load or save settings */
/**
 * Saves settings to local Storage
 */
function saveSettings() {
  for (const setting in settings) {
    localStorage.setItem(setting, settings[setting].value);
  }
}

/**
 * Loads settings from local Storage, and handles setting effects
 */
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
        //console.log(`${settings[setting].id} is not a valid id`);
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
  toggleMultiplier();
}

/**
 * Saves the leaderboard to local Storage
 */
function saveLeaderboard() {
  localStorage.setItem("leaderboard",JSON.stringify(leaderboard));
}

/**
 * Loads the leaderboard from local Storage
 */
function loadLeaderboard() {
  const leaderboardStr = localStorage.getItem("leaderboard") || "[]";
  leaderboard = JSON.parse(leaderboardStr);
  for (const entry of leaderboard) {
    let table = document.getElementById("leaderboard");
    let row = table.insertRow(0);
    let cell0 = row.insertCell(0);
    let cell1 = row.insertCell(1);
    let cell2 = row.insertCell(2);
    cell0.innerHTML = entry.date;
    cell1.innerHTML = entry.points;
    cell2.innerHTML = entry.settings;
  }
}

/**
 * Saves text to local Storage
 */
function saveText() {
  const text = document.getElementById("save").value;
  localStorage.setItem("lastSessionText",text);
}

/**
 * Loads last session text from local Storage
 */
function loadText() {
  const text = localStorage.getItem("lastSessionText");
  if (text) {
    document.getElementById("save").value = text;
  }
}

/**
 * Saves statistics to local Storage
 */
function saveStatistics() {
  for (const stat in statistics) {
    localStorage.setItem(stat,statistics[stat].value);
  }
}

/**
 * Loads statistics from local Storage
 */
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

/**
 * Saves display preferences to local Storage
 */
function savePreferences() {
  for (const pref in preferences) {
    localStorage.setItem(pref,preferences[pref].value);
  }
}

/**
 * Loads display references from local Storage
 */
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

/**
 * Updates progression in stat dropdown
 */
function updateStatProgression() {
  if (statistics.ultimateGoal.value !== 0) {
    let progress = Math.floor(statistics.ultimateWordCount.value / statistics.ultimateGoal.value);
    const newProgress = `${progress}%`;
    document.getElementById("total-words").value = progress;
    document.getElementById("total-words").innerHTML = newProgress;
  }
}

/**
 * Updates visible word counts
 */
function setWordCounts() {
  document.getElementById("words-until-now").innerHTML = statistics.ultimateWordCount.value;
  document.getElementById("word-count").innerHTML = statistics.sessionWords.value;
  document.getElementById("alltime-word-count").innerHTML = statistics.ultimateWordCount.value;
  document.getElementById("ultimate-goal-words").innerHTML = statistics.ultimateGoal.value;

  updateStatProgression();
}

/**
 * Updates indicator of how many more words need to be written before a level up and handles level up
 */
function setUntilNextLevel() {
  if (statistics.untilNextLevel.value === 0) {
    statistics.level.value += 1;
    document.getElementById("level").innerHTML = statistics.level.value;
    statistics.untilNextLevel.value = levelCutoffs(statistics.level.value + 1) - levelCutoffs(statistics.level.value);
  }
  document.getElementById("until-next-level").innerHTML = statistics.untilNextLevel.value;
}

/**
 * Calculates points awarded for punctuation.
 * @param {string} words Words from text-field
 * @returns {number} Points awarded for punctuation
 */
function countPunctuationPoints(words) {
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
    // Only allow non-consecutive punctuation to give points
    if (punctuationData[1] !== lastPunctuationPosition + 1) {
      newPoints += punctuationPoints[punctuationData[0]];
    }
    lastPunctuationPosition = punctuationData[1];
  }

  return newPoints;
}

/**
 * Checks stop condition for wordcount-based sessions
 * @param {number} nrNewWords Number of new words to be subtracted from the goal
 * @param {number} newPoints Points to be added before leaderboard update
 */
function handleWordCountDown(nrNewWords, newPoints) {
  remainingWordsInSession -= nrNewWords;
  if (remainingWordsInSession <= 0) {
    //let points = Number(document.getElementById("points").innerHTML) + newPoints;
    points += newPoints;
    addLeaderboardEntry(points);
    resetSessionGoalSetter();
  } else {
    updateGoalProgression(remainingWordsInSession);
  }
}

/**
 * Calculates how many points are received for the written words.
 * Also helps check stop condition for wordcount-based sessions.
 * Requires punctuation points to correctly update the leaderboard in case the stop condition is met.
 * @param {[string]} wordsArray Words from text-field
 * @returns {number} Points received for words (punctuation points not included)
 */
function countLongWordPoints(wordsArray) {
  let newPoints = 0;
  //Handle each word separately
  for (const word of wordsArray) {
    // Count only alphanumerical letters
    const regex = /\p{L}+/gu;
    const lettersOnly = word.matchAll(regex);
    
    for (const wordPart of lettersOnly) {
      const wordLength = wordPart[0].length;
      statistics.ultimateWordCount.value += 1;
      statistics.sessionWords.value += 1;
      statistics.untilNextLevel.value -= 1;
      setWordCounts();
      setUntilNextLevel();

      if (settings.rewardLongWords.value) {
        // give 1 additional point for every character in words longer than LONG_WORD_CUTOFF
        if (wordLength >= settings.LONG_WORD_CUTOFF.value) {
          // Words longer than 30 characters don't count
          newPoints += Math.min(wordLength,30) - settings.LONG_WORD_CUTOFF.value + 1;
        } 
      }
    }
  }
  return newPoints;
}

/** Calculates how many points to add based on the words received and the active multiplier. 
 * Updates point field.
 * @param {string} words Words from text-field
*/
function add_points(words) {
  let punctuationPoints = settings.rewardPunctuation.value ? countPunctuationPoints(words) : 0;
  const wordsArray = words.split(" ");
  let wordPoints = countLongWordPoints(wordsArray);
  const noEmptyWordsArray = wordsArray.filter((word) => word.length > 0);
  // Handle updating of sessions that count down words
  if (wordCountDown) {
    handleWordCountDown(noEmptyWordsArray.length, punctuationPoints + wordPoints);
  }
  //update points
  if (sessionSuccessfullyStarted) {
    points += multiplier * (wordPoints + punctuationPoints);
    document.getElementById("points").innerHTML = points;
  }
}

function showMultiplierUpdate() {
  let multiplierEl = document.getElementById("multiplier");
  multiplierEl.innerHTML="x" + multiplier;
  multiplierEl.classList.remove("increased-multiplier");
  window.setTimeout( () => {
    multiplierEl.classList.add("increased-multiplier");
  },50);
}

/**
 * Calculates new multiplier
 */
function multiplierUpdate() {
  // Increase multiplier for every 100 words
  if (~~(statistics.sessionWords.value / settings.MULTIPLIER_DIFFICULTY.value) > multiplier - 1) {
    multiplier += 1;
    showMultiplierUpdate();
  }
}

/** Main functionality. 
 * Pulls text from the textarea, calculates points, saves progress, handles text delete option
 */
function calculate() {
  const text = document.getElementById("editor-field").value;
  const deletedText = document.getElementById("save").value.slice(0,deletedTextPosition);
  document.getElementById("save").value = deletedText + text;

  if (text.length + deletedTextPosition <= latestSeparatorPosition) {
    // The text did not get longer
    latestSeparatorPosition = text.length + deletedTextPosition;
  } else {
    //Text increased in length

    //Weakly account for user potentially writing elsewhere than at the text end
    const selectionPosition = document.getElementById("editor-field").selectionStart;
    const lastChar = text.slice(selectionPosition -1, selectionPosition);

    // add points for new characters (if they were not pasted in)
    if (lastChar != " " && sessionSuccessfullyStarted) {
      // reward anything but spaces
      points += multiplier * 1;
      document.getElementById("points").innerHTML = points;
    }

    // if a word is finished or a new paragraph starts, add word and punctuation points
    if (lastChar === " " || lastChar === "\n") {
      let textLength = text.length + deletedTextPosition - lastTextLength;
      lastTextLength = text.length + deletedTextPosition;
      //console.log(`deletedTextLength: ${deletedTextPosition} textLength: ${textLength} separator position: ${selectionPosition}. Last Text length: ${lastTextLength}`);
      const newText = text.slice(selectionPosition - textLength, selectionPosition + 1);
      add_points(newText);
      saveStatistics();
    }

    // update multiplier
    if (settings.enablePointMultiplier.value) {
      multiplierUpdate();
    }

    // Optional delete long text feature
    if (settings.enableTextDelete.value && text.length > settings.MAX_CHARACTERS.value) {
      document.getElementById("editor-field").value = text.slice(-settings.MAX_CHARACTERS.value);
      deletedTextPosition += text.length - settings.MAX_CHARACTERS.value;
    }
  }

  // Save progress in case of browser malfunction
  saveText();
}

/* These functions set and reset settings or preferences */

/**
 * Enables long word reward
 * @returns {boolean} Success or fail because of incomplete input
 */
function setRewardLongWords() {
  if (document.getElementById(settings.rewardLongWords.id).checked) {
    settings.rewardLongWords.value = true;
    return setLongWordCutoff();
  } else {
    settings.rewardLongWords.value = false;
    return true;
  }
}

/**
 * Sets long word reward
 * @returns {boolean} Success or fail because of incomplete input
 */
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

/**
 * Enables punctuation reward
 */
function setRewardPunctuation() {
  settings.rewardPunctuation.value = document.getElementById(settings.rewardPunctuation.id).checked;
}

/**
 * Enables deletion of text from textarea if the text is longer than what user wishes
 * @returns {boolean} Success or fail because of incomplete input
 */
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

function setEnableMultiplier() {
  const multiplierCheck = document.getElementById("point-multiplier").checked;
  settings.enablePointMultiplier.value = multiplierCheck;
  if (multiplierCheck) {
    return setMultiplierDifficulty();
  } else {
    return true;
  }
}

function setMultiplierDifficulty() {
  const multiplierDiff = document.getElementById("multiplier-difficulty");
  const newMultiplierDifficulty = nrConstraintCheck(multiplierDiff,1);
  if (newMultiplierDifficulty) {
    settings.MULTIPLIER_DIFFICULTY.value = newMultiplierDifficulty;
    return true;
  } else {
    return false;
  }
}

/**
 * Sets how long text in textarea has to be before being deleted
 * @returns {boolean} Success or fail because of incomplete input
 */
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

/**
 * Accepts game settings
 */
function acceptGameSettings() {
  if (!setEnableTextDelete() || !setRewardLongWords() || !setEnableMultiplier()) {
    return;
  }
  setRewardPunctuation()
  saveSettings();
}

/**
 * Resets game settings
 */
function resetGameSettings() {
  settings.enablePointMultiplier.value = true;
  document.getElementById(settings.enablePointMultiplier.id).checked = true;
  settings.rewardLongWords.value = true;
  document.getElementById(settings.rewardLongWords.id).checked = true;
  settings.LONG_WORD_CUTOFF.value = 8;
  document.getElementById(settings.LONG_WORD_CUTOFF.id).value = 8;

  settings.rewardPunctuation.value = true;
  document.getElementById(settings.rewardPunctuation.id).checked = true;
  settings.enableTextDelete.value = false;
  document.getElementById(settings.enableTextDelete.id).checked = false;
  settings.MAX_CHARACTERS.value = 50;
  document.getElementById(settings.LONG_WORD_CUTOFF.id).value = 8;
}

/**
 * Toggles visibility of stats
 * @param {string} checkId Id of the check that controls visibility
 * @param {string} elementId Id of the element whose visibility should be toggled
 */
function toggleVisibility(checkId,elementId) {
  if (document.getElementById(checkId).checked) {
    document.getElementById(elementId).style.display = "none";
  } else {
    document.getElementById(elementId).style.display = "";
  }
}

/**
 * Toggles dark mode. Arguments only for compatibility with caller function
 * @param {any} checkId 
 * @param {any} elementId 
 */
function toggleDarkmode(checkId,elementId) {
  if (document.getElementById("dark-mode").checked) {
    const parent = document.getElementById("head");
    let style = document.createElement("link");
    style.setAttribute("id","darkmode");

    //There must be better ways to do this
    let host = window.location.host;
    let extension = "";
    if (host === "nathaliebleser.github.io") {
      extension += "/WriteUP";
    }
    let baseUrl = window.location.origin + extension;
    style.setAttribute("href",baseUrl + "/css/darkmode.css");
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

/**
 * Accepts display settings and updates display of stats or darkmode
 */
function acceptDisplaySettings() {
  for (const pref in preferences) {
    preferences[pref].value = document.getElementById(preferences[pref].checkId).checked;
    preferences[pref].onChange(preferences[pref].checkId,preferences[pref].elementId);
  }
  savePreferences();
}

/**
 * Resets display settings but does not update display until save is requested
 */
function resetDisplaySettings() {
  for (const pref in preferences) {
    document.getElementById(preferences[pref].checkId).checked = false;
  }
}

/**
 * Accepts ultimate goal and updates stat progression
 */
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

/*These functions toggle showing different sections*/

/**
 * Toggles showing the About section
 */
function toggleShowAbout() {
  const displayVal = document.getElementById("about").style.display;
  if (displayVal === "block") {
    document.getElementById("about").style.display = "none";
  } else {
    document.getElementById("about").style.display = "block";
    document.getElementById("stats").style.display = "none";
    document.getElementById("settings").style.display = "none";
  }
  window.scrollTo(0, 100);
}

/**
 * Toggles showing the Stats section
 */
function toggleShowStats() {
  const displayVal = document.getElementById("stats").style.display;
  if (displayVal === "block") {
    document.getElementById("stats").style.display = "none";
  } else {
    document.getElementById("stats").style.display = "block";
    document.getElementById("settings").style.display = "none";
    document.getElementById("about").style.display = "none";
  }
  window.scrollTo(0, 100);
}

/**
 * Toggles showing the Settings section
 */
function toggleShowSettings() {
  const displayVal = document.getElementById("settings").style.display;
  if (displayVal === "block") {
    document.getElementById("settings").style.display = "none";
  } else {
    document.getElementById("settings").style.display = "block";
    document.getElementById("stats").style.display = "none";
    document.getElementById("about").style.display = "none";
  }
  window.scrollTo(0, 100);
  //document.getElementById("long-words").focus({ focusVisible: false });
}

/*These functions handle input field disabling when a setting check requires it*/

/**
 * Toggles disabling the input field for when to start deleting text
 */
function toggleCutoff() {
  const cutoffCheckEl = document.getElementById("cutoff");
  const cutoffValueEl = document.getElementById("cutoff-at");
  if (cutoffCheckEl.checked) {
    cutoffValueEl.disabled = false;
  } else {
    cutoffValueEl.disabled = true;
  }
}

/**
 * Toggles disabling the input field for what to consider a long word
 */
function toggleLongWordLength() {
  const longWordCheckEl = document.getElementById("long-words");
  const longWordValueEl = document.getElementById("long-word-length");
  if (longWordCheckEl.checked) {
    longWordValueEl.disabled = false;
  } else {
    longWordValueEl.disabled = true;
  }
}

/**
 * Toggles disabling the input field for multiplier difficulty
 */
function toggleMultiplier() {
  const multiplierCheck = document.getElementById("point-multiplier");
  const multiplierDiff = document.getElementById("multiplier-difficulty");
  if (multiplierCheck.checked) {
    multiplierDiff.disabled = false;
  } else {
    multiplierDiff.disabled = true;
  }
}

/**
 * Adds a leaderboard entry into the leaderboard and saves the new leaderboard
 * @param {number} points Points to add to the leaderboard entry
 */
function addLeaderboardEntry(points) {
  const date = new Date();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  let hour = date.getHours();
  hour = String(hour).padStart(2);
  let min = date.getMinutes();
  min = String(min).padStart(2);
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

/* These functions handle setting session goals */

/**
 * Updates the session goal progression
 * @param {number} newValue Leftover time/words
 */
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

function toggleSessionStartElements() {
  let goalIndicator = document.getElementById("goal-indicator");
  let sessionGoalSettings = document.getElementById("session-goal-settings");
  goalIndicator.style.display = goalIndicator.style.display === "block" ? "none" : "block";
  sessionGoalSettings.style.display = sessionGoalSettings.style.display === "none" ? "block" : "none";
}

function afterEditorExit() {
  let editor = document.getElementById("editor-field");
  editor.addEventListener("click", preventStart);
  editor.readOnly = true;
}

/**
 * Resets html elements and variables connected to session goal setting
 */
function resetSessionGoalSetter() {
  toggleSessionStartElements();
  document.getElementById("points").innerHTML = 0;
  points = 0;

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

  let editor = document.getElementById("editor-field");
  editor.addEventListener("blur", afterEditorExit);
  sessionSuccessfullyStarted = false;

  wordCountDown = false;

  document.getElementById("goal-indicator").innerHTML = "Left:";
}

/**
 * Callback function: Updates the timer of session goals
 */
function updateTimer() {
  remainingTimeInSession -= 1;
  updateGoalProgression(remainingTimeInSession);
  if (remainingTimeInSession === 0) {
    clearInterval(functionId);
    addLeaderboardEntry(points);
    resetSessionGoalSetter();
  }
}

/**
 * Interrupts time/wordcount-based sessions
 */
function stopSession() {
  if (functionId) {
    clearInterval(functionId);
    functionId = undefined;
  } 
  sessionGoal += "; interrupted";
  addLeaderboardEntry(points);
  resetSessionGoalSetter();
}

/**
 * Stops sessions with no session goal
 */
function stopFreeSession() {
  addLeaderboardEntry(points);
  resetSessionGoalSetter();
}

/**
 * Contains the code that is used by both methods of starting a session
 */
function startAnySession() {
  // Update Session word element
  statistics.sessionWords.value = 0;
  document.getElementById("word-count").innerHTML = "0";
  // Update multiplier element
  multiplier = 1;
  document.getElementById("multiplier").innerHTML = "x1";

  // Set focus on editor field
  let editor = document.getElementById("editor-field");
  editor.removeEventListener("blur", afterEditorExit);
  editor.value = "";
  editor.focus();
  editor.readOnly = false;

  //Set selection correctly
  deletedTextPosition = document.getElementById("editor-field").selectionStart;
  latestSeparatorPosition = deletedTextPosition;
  lastTextLength = 0;

  sessionSuccessfullyStarted = true;
}

/**
 * Starts a time/wordcount-based session based on the input parameters set
 */
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

  startAnySession();

  // Disable button, create stop button
  let btn = document.getElementById("session-goal-btn");
  btn.value = "Reset goal";
  btn.removeEventListener("click",startSession);
  btn.addEventListener("click", stopSession);
  let freeBtn = document.getElementById("free-session-goal-btn");
  freeBtn.disabled = true;
  toggleSessionStartElements();
}

/**
 * Starts a session without time/wordcount goal
 */
function startFreeSession() {
  startAnySession();

  sessionGoal = "No target";
  let freeBtn = document.getElementById("free-session-goal-btn");
  freeBtn.value = "Stop session";
  freeBtn.removeEventListener("click",startFreeSession);
  freeBtn.addEventListener("click", stopFreeSession);
  let btn = document.getElementById("session-goal-btn");
  btn.disabled = true;
  toggleSessionStartElements();
}

function preventStart() {
  if (!sessionSuccessfullyStarted) {
    document.getElementById("editor-field").readOnly = true;
    window.alert("Please start a session before beginning to type. You can copy your text from the textfield on the bottom of this page.");
  } else {
    document.getElementById("editor-field").removeEventListener("click",preventStart);
  }
}

/**
 * Updates default text of session goal input field when minutes check is set
 */
function changeToMinutes() {
  if (document.getElementById("session-goal").value === "500") {
    document.getElementById("session-goal").value = 30;
  }
}

/**
 * Updates default text of session goal input field when words check is set
 */
function changeToWords() {
  if (document.getElementById("session-goal").value === "30") {
    document.getElementById("session-goal").value = 500;
  }
}

const parent = document.getElementById("head");
const styleDark = document.getElementById("darkmode");
if (styleDark) {
  parent.removeChild(styleDark);
}

// Load all from local storage
loadSettings();
loadStatistics();
loadPreferences();
loadText();
loadLeaderboard();

// First load
if (statistics.untilNextLevel.value === 0) {
  statistics.untilNextLevel.value = levelCutoffs(1);
}

// Add events to session start buttons
document.getElementById("session-goal-btn").addEventListener("click", startSession);
document.getElementById("free-session-goal-btn").addEventListener("click", startFreeSession);
// Add prevent start without session event to editor
document.getElementById("editor-field").addEventListener("click",preventStart);