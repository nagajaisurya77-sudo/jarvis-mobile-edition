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

keyBtn.addEventListener("click", promptForKey);

// 2. Long-Term Memory
let chatHistory = [];
try {
  chatHistory = JSON.parse(localStorage.getItem("JARVIS_HISTORY")) || [];
} catch (e) {
  chatHistory = [];
}
chatHistory.forEach(function (item) {
  addMessage(item.text, item.type, false);
});

function addMessage(text, type, save) {
  if (save === undefined) save = true;
  const msgDiv = document.createElement("div");
  msgDiv.className = "message " + type;
  msgDiv.innerText = text;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  if (save && (type === "user" || type === "jarvis")) {
    chatHistory.push({ text: text, type: type });
    if (chatHistory.length > 20) chatHistory.shift();
    localStorage.setItem("JARVIS_HISTORY", JSON.stringify(chatHistory));
  }
}

clearBtn.addEventListener("click", function () {
  localStorage.removeItem("JARVIS_HISTORY");
  chatHistory = [];
  chatWindow.innerHTML = "";
  addMessage("Memory cleared, Boss.", "jarvis", false);
  speakText("Memory cleared, Boss.");
});

// 3. Reliable Android Chrome Voice Output (Text-to-Speech)
function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const clean = text.replace(/[*#_`]/g, "").trim();
  if (!clean) return;

  const speech = new SpeechSynthesisUtterance(clean);
  speech.lang = "en-US";
  speech.rate = 1.0;
  speech.pitch = 0.95;

  speech.onstart = function () {
    reactor.classList.add("thinking");
  };
  speech.onend = function () {
    reactor.classList.remove("thinking");
  };
  speech.onerror = function () {
    reactor.classList.remove("thinking");
  };

  window.speechSynthesis.speak(speech);
}

// 4. Built-in Instant Tools
async function runLocalTools(query) {
  const q = query.toLowerCase();

  if (q.includes("time")) {
    return "The current time is " + new Date().toLocaleTimeString() + ", Boss.";
  }
  if (q.includes("date") || q.includes("today")) {
    return "Today is " + new Date().toDateString() + ", Boss.";
  }
  if (q.includes("timer")) {
    const match = q.match(/\d+/);
    const mins = match ? parseInt(match[0], 10) : 1;
    setTimeout(function () {
      const doneMsg = "Timer finished! " + mins + " minute(s) completed, Boss.";
      addMessage(doneMsg, "jarvis");
      speakText(doneMsg);
    }, mins * 60000);
    return "Timer set for " + mins + " minute(s), Boss.";
  }
  if (q.includes("flip a coin") || q.includes("toss")) {
    return "It landed on " + (Math.random() < 0.5 ? "Heads" : "Tails") + ", Boss.";
  }
  if (q.includes("roll a dice")) {
    return "You rolled a " + (Math.floor(Math.random() * 6) + 1) + ", Boss.";
  }
  if (q.startsWith("open youtube")) {
    window.open("https://m.youtube.com", "_blank");
    return "Opening YouTube, Boss.";
  }
  if (q.startsWith("open google")) {
    window.open("https://www.google.com", "_blank");
    return "Opening Google, Boss.";
  }
  if (q.startsWith("play ")) {
    const song = query.substring(5).trim();
    window.open("https://m.youtube.com/results?search_query=" + encodeURIComponent(song), "_blank");
    return "Searching " + song + " on YouTube, Boss.";
  }
  if (q.includes("weather")) {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) {
        resolve("Location not supported on this browser, Boss.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async function (pos) {
          try {
            const url = "https://api.open-meteo.com/v1/forecast?latitude=" + pos.coords.latitude + "&longitude=" + pos.coords.longitude + "&current_weather=true";
            const res = await fetch(url);
            const data = await res.json();
            resolve("Current temperature is " + data.current_weather.temperature + " degrees Celsius, Boss.");
          } catch (e) {
            resolve("Could not fetch weather data, Boss.");
          }
        },
        function () {
          resolve("Please allow location access for weather updates, Boss.");
        }
      );
    });
  }
  return null;
}

// 5. Auto-Discover Working Gemini Model
async function discoverModels(apiKey) {
  const preferred = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-2.5-flash"
  ];
  const savedModel = localStorage.getItem("JARVIS_WORKING_MODEL");
  if (savedModel) {
    preferred.unshift(savedModel);
  }

  try {
    const listRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(apiKey));
    const listData = await listRes.json();
    if (listData && Array.isArray(listData.models)) {
      listData.models.forEach(function (m) {
        if (
          m.name &&
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes("generateContent") &&
          m.name.includes("gemini") &&
          !m.name.includes("image") &&
          !m.name.includes("tts") &&
          !m.name.includes("live") &&
          !m.name.includes("transcribe")
        ) {
          const cleanName = m.name.replace("models/", "");
          if (!preferred.includes(cleanName)) {
            preferred.push(cleanName);
          }
        }
      });
    }
  } catch (e) {}
  return preferred;
}

async function callGeminiBrain(promptText, base64Img) {
  let apiKey = getSavedKey();
  if (!apiKey) {
    apiKey = promptForKey();
    if (!apiKey) {
      return { error: "API Key missing! Tap 'API Key' at the top right and paste your key." };
    }
  }

  const memoryContext = chatHistory.slice(-6).map(function (m) {
    return m.type.toUpperCase() + ": " + m.text;
  }).join("\n");

  const fullPrompt = "You are J.A.R.V.I.S, an intelligent mobile AI assistant. Always call the user Boss. Keep answers clear, smart, and under 3 short sentences so voice playback is smooth.\n\nConversation History:\n" + memoryContext + "\n\nUser: " + promptText;

  const parts = [{ text: fullPrompt }];
  if (base64Img) {
    parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: base64Img
      }
    });
  }

  const modelsToTry = await discoverModels(apiKey);
  let lastError = "Unknown error";

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + encodeURIComponent(apiKey);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: parts }]
        })
      });

      const data = await response.json();

      if (response.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
        localStorage.setItem("JARVIS_WORKING_MODEL", modelName);
        statusBadge.innerText = "ONLINE";
        return { text: data.candidates[0].content.parts[0].text };
      } else if (data.error) {
        lastError = data.error.message || "API Error";
        if (lastError.toLowerCase().includes("api key not valid")) {
          return { error: "Invalid API Key. Tap 'API Key' at the top and paste a valid key." };
        }
      }
    } catch (err) {
      lastError = "Network error. Check your internet connection.";
    }
  }

  return { error: "Failed to get response: " + lastError };
}

async function processInput(text, base64Img) {
  if (!text && !base64Img) return;

  addMessage(text || "[Scanning Camera Image...]", "user");
  userInput.value = "";
  reactor.classList.add("thinking");
  statusBadge.innerText = "THINKING";

  if (!base64Img) {
    const toolOutput = await runLocalTools(text);
    if (toolOutput) {
      reactor.classList.remove("thinking");
      statusBadge.innerText = "ONLINE";
      addMessage(toolOutput, "jarvis");
      speakText(toolOutput);
      return;
    }
  }

  const result = await callGeminiBrain(text || "Describe what is in this image.", base64Img);
  reactor.classList.remove("thinking");

  if (result.error) {
    statusBadge.innerText = "ERROR";
    addMessage(result.error, "error", false);
  } else {
    statusBadge.innerText = "ONLINE";
    addMessage(result.text, "jarvis");
    speakText(result.text);
  }
}

sendBtn.addEventListener("click", function () {
  processInput(userInput.value.trim(), null);
});

userInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    processInput(userInput.value.trim(), null);
  }
});

// 6. Camera Vision
camBtn.addEventListener("click", function () {
  cameraInput.click();
});

cameraInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    const base64Data = reader.result.split(",")[1];
    processInput("Analyze this image, Jarvis.", base64Data);
  };
  reader.readAsDataURL(file);
});

// 7. Microphone & Wake Word Setup
async function requestMicPermission() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(function (track) { track.stop(); });
      return true;
    } catch (err) {
      addMessage("Mic permission blocked! Tap the icon next to the URL in Chrome -> Permissions -> Allow Microphone.", "error", false);
      return false;
    }
  }
  return true;
}

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRec) {
  micBtn.addEventListener("click", function () {
    addMessage("Speech recognition is not supported in this browser. Please open in Google Chrome.", "error", false);
  });
} else {
  const recognition = new SpeechRec();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  micBtn.addEventListener("click", async function () {
    // Stop JARVIS speaking immediately so mic hears you clearly
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const allowed = await requestMicPermission();
    if (!allowed) return;

    try {
      recognition.start();
      micBtn.classList.add("listening");
      statusBadge.innerText = "LISTENING";
    } catch (err) {
      recognition.stop();
      micBtn.classList.remove("listening");
      statusBadge.innerText = "ONLINE";
    }
  });

  recognition.onresult = function (event) {
    micBtn.classList.remove("listening");
    statusBadge.innerText = "ONLINE";
    const spokenText = event.results[0][0].transcript;
    processInput(spokenText, null);
  };

  recognition.onerror = function (event) {
    micBtn.classList.remove("listening");
    statusBadge.innerText = "ONLINE";
    if (event.error === "not-allowed") {
      addMessage("Microphone blocked! Tap the icon next to the URL in Chrome -> Permissions -> Microphone -> Allow.", "error", false);
    } else if (event.error !== "no-speech" && event.error !== "aborted") {
      addMessage("Mic error: " + event.error + ". Try tapping MIC again.", "error", false);
    }
  };

  recognition.onend = function () {
    micBtn.classList.remove("listening");
  };

  // Wake Word ("Hey Jarvis")
  let isWakeOn = false;
  const wakeRecognition = new SpeechRec();
  wakeRecognition.continuous = true;
  wakeRecognition.lang = "en-IN";

  wakeBtn.addEventListener("click", async function () {
    if (!isWakeOn) {
      const allowed = await requestMicPermission();
      if (!allowed) return;
      isWakeOn = true;
      try {
        wakeRecognition.start();
        wakeBtn.innerText = "Wake: ON";
        speakText("Wake word activated, Boss.");
      } catch (e) {
        isWakeOn = false;
      }
    } else {
      isWakeOn = false;
      wakeRecognition.stop();
      wakeBtn.innerText = "Wake: OFF";
    }
  });

  wakeRecognition.onresult = function (event) {
    const lastResult = event.results[event.results.length - 1][0].transcript.toLowerCase();
    if (lastResult.includes("jarvis")) {
      const cleanCmd = lastResult.replace(/hey jarvis|jarvis/g, "").trim();
      if (cleanCmd.length > 0) {
        processInput(cleanCmd, null);
      } else {
        speakText("Yes Boss, I am listening.");
      }
    }
  };

  wakeRecognition.onend = function () {
    if (isWakeOn) {
      try { wakeRecognition.start(); } catch (e) {}
    }
  };
}

