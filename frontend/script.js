 const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const camBtn = document.getElementById("camBtn");
const cameraInput = document.getElementById("cameraInput");
const clearBtn = document.getElementById("clearBtn");
const wakeBtn = document.getElementById("wakeBtn");
const keyBtn = document.getElementById("keyBtn");
const statusBadge = document.getElementById("statusBadge");
const reactor = document.getElementById("reactor");

// 1. Safe API Key Management
function getSavedKey() {
  const key = localStorage.getItem("JARVIS_GEMINI_KEY");
  return key && key.trim().length > 10 ? key.trim() : "";
}

function promptForKey() {
  const current = getSavedKey();
  const entered = prompt("Paste your Google Gemini API Key (starts with AIza...):", current);
  if (entered && entered.trim().length > 10) {
    localStorage.setItem("JARVIS_GEMINI_KEY", entered.trim());
    localStorage.removeItem("JARVIS_WORKING_MODEL");
    statusBadge.innerText = "KEY READY";
    addMessage("API Key saved safely on your phone, Boss!", "jarvis", false);
    speakText("API Key saved safely on your phone, Boss.");
    return entered.trim();
  }
  return current;
}

if (keyBtn) {
  keyBtn.addEventListener("click", promptForKey);
}

// 2. Long-Term Memory
let chatHistory = [];
try {
  chatHistory = JSON.parse(localStorage.getItem("JARVIS_HISTORY")) || [];
} catch (e) {
  chatHistory = [];
}

chatHistory.forEach(function (item) {
  if (item && item.text && item.type) {
    addMessage(item.text, item.type, false);
  }
});

function addMessage(text, type, save) {
  if (save === undefined) save = true;
  if (!chatWindow) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = "message " + type;
  msgDiv.innerText = text;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  if (save && (type === "user" || type === "jarvis")) {
    chatHistory.push({ text: text, type: type });
    if (chatHistory.length > 20) chatHistory.shift();
    try {
      localStorage.setItem("JARVIS_HISTORY", JSON.stringify(chatHistory));
    } catch (e) {}
  }
}

if (clearBtn) {
  clearBtn.addEventListener("click", function () {
    localStorage.removeItem("JARVIS_HISTORY");
    chatHistory = [];
    chatWindow.innerHTML = "";
    addMessage("Memory cleared, Boss.", "jarvis", false);
    speakText("Memory cleared, Boss.");
  });
}

// 3. Smooth Voice Output (Text-to-Speech)
function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`]/g, "").trim();
    if (!clean) return;

    const speech = new SpeechSynthesisUtterance(clean);
    speech.lang = "en-US";
    speech.rate = 1.0;
    speech.pitch = 0.95;

    speech.onstart = function () {
      if (reactor) reactor.classList.add("thinking");
    };
    speech.onend = function () {
      if (reactor) reactor.classList.remove("thinking");
    };
    speech.onerror = function () {
      if (reactor) reactor.classList.remove("thinking");
    };

    window.speechSynthesis.speak(speech);
  } catch (e) {
    if (reactor) reactor.classList.remove("thinking");
  }
}

// 4. ALL 15 REAL-TIME TOOLS ROUTER
async function runLocalTools(query) {
  const q = query.toLowerCase().trim();

  // Tool 1: Live Time
  if (q.includes("time")) {
    return "The current time is " + new Date().toLocaleTimeString() + ", Boss.";
  }

  // Tool 2: Date
  if (q.includes("date") || q.includes("today")) {
    return "Today's date is " + new Date().toDateString() + ", Boss.";
  }

  // Tool 3: Live Weather
  if (q.includes("weather") || q.includes("temperature")) {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) {
        resolve("Location is not supported on this browser, Boss.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async function (pos) {
          try {
            const url = "https://api.open-meteo.com/v1/forecast?latitude=" + pos.coords.latitude + "&longitude=" + pos.coords.longitude + "&current_weather=true";
            const res = await fetch(url);
            const data = await res.json();
            resolve("Current temperature at your location is " + data.current_weather.temperature + " degrees Celsius with wind speed " + data.current_weather.windspeed + " km/h, Boss.");
          } catch (e) {
            resolve("Unable to fetch live weather right now, Boss.");
          }
        },
        function () {
          resolve("Please allow location permission for live weather updates, Boss.");
        }
      );
    });
  }

  // Tool 4: Countdown Timer
  if (q.includes("timer")) {
    const match = q.match(/\d+/);
    const mins = match ? parseInt(match[0], 10) : 1;
    setTimeout(function () {
      const doneMsg = "Timer complete! " + mins + " minute(s) finished, Boss.";
      addMessage(doneMsg, "jarvis");
      speakText(doneMsg);
    }, mins * 60000);
    return "Timer set for " + mins + " minute(s), Boss.";
  }

  // Tool 5: Flip a Coin / Roll a Dice
  if (q.includes("flip a coin") || q.includes("toss")) {
    return "It landed on " + (Math.random() < 0.5 ? "Heads" : "Tails") + ", Boss.";
  }
  if (q.includes("roll a dice") || q.includes("roll dice")) {
    return "You rolled a " + (Math.floor(Math.random() * 6) + 1) + ", Boss.";
  }

  // Tool 6: Random Joke API
  if (q.includes("joke")) {
    try {
      const res = await fetch("https://official-joke-api.appspot.com/random_joke");
      const data = await res.json();
      return data.setup + " ... " + data.punchline;
    } catch (e) {
      return "Why do programmers prefer dark mode? Because light attracts bugs, Boss!";
    }
  }

  // Tool 7: Motivational Quote API
  if (q.includes("quote") || q.includes("motivate")) {
    try {
      const res = await fetch("https://dummyjson.com/quotes/random");
      const data = await res.json();
      return "\"" + data.quote + "\" - " + data.author;
    } catch (e) {
      return "Sometimes you gotta run before you can walk, Boss.";
    }
  }

  // Tool 8: Live Tech News
  if (q.includes("news") || q.includes("headlines")) {
    try {
      const topRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
      const ids = await topRes.json();
      let headlines = "Here are the top 3 tech headlines, Boss:\n";
      for (let i = 0; i < 3; i++) {
        const itemRes = await fetch("https://hacker-news.firebaseio.com/v0/item/" + ids[i] + ".json");
        const item = await itemRes.json();
        headlines += (i + 1) + ". " + item.title + "\n";
      }
      return headlines.trim();
    } catch (e) {
      return "Unable to fetch live news right
