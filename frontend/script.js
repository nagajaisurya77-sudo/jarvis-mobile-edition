const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const camBtn = document.getElementById("camBtn");
const cameraInput = document.getElementById("cameraInput");
const clearBtn = document.getElementById("clearBtn");
const wakeBtn = document.getElementById("wakeBtn");
const keyBtn = document.getElementById("keyBtn");
const keyBox = document.getElementById("keyBox");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const closeKeyBtn = document.getElementById("closeKeyBtn");
const statusBadge = document.getElementById("statusBadge");
const reactor = document.getElementById("reactor");

// 1. In-App API Key Management (No Browser Popup Required)
function getSavedKey() {
  const key = localStorage.getItem("JARVIS_GEMINI_KEY");
  return key && key.trim().length > 10 ? key.trim() : "";
}

function toggleKeyBox(show) {
  if (!keyBox) return;
  if (show) {
    if (apiKeyInput) apiKeyInput.value = getSavedKey();
    keyBox.style.display = "block";
  } else {
    keyBox.style.display = "none";
  }
}

if (keyBtn) {
  keyBtn.addEventListener("click", function () {
    const isHidden = keyBox.style.display === "none" || keyBox.style.display === "";
    toggleKeyBox(isHidden);
  });
}

if (closeKeyBtn) {
  closeKeyBtn.addEventListener("click", function () {
    toggleKeyBox(false);
  });
}

if (saveKeyBtn) {
  saveKeyBtn.addEventListener("click", function () {
    const entered = apiKeyInput ? apiKeyInput.value.trim() : "";
    if (entered.length > 10) {
      localStorage.setItem("JARVIS_GEMINI_KEY", entered);
      localStorage.removeItem("JARVIS_WORKING_MODEL");
      toggleKeyBox(false);
      if (statusBadge) statusBadge.innerText = "KEY READY";
      addMessage("API Key saved safely on your phone, Boss!", "jarvis", false);
      speakText("API Key saved safely on your phone, Boss.");
    } else {
      addMessage("Please paste a valid Gemini API Key starting with AIza...", "error", false);
    }
  });
}

// Show key box automatically on first visit if key is missing
window.addEventListener("load", function () {
  if (!getSavedKey()) {
    toggleKeyBox(true);
  }
});

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

  if (q.includes("time")) {
    return "The current time is " + new Date().toLocaleTimeString() + ", Boss.";
  }

  if (q.includes("date") || q.includes("today")) {
    return "Today's date is " + new Date().toDateString() + ", Boss.";
  }

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

  if (q.includes("flip a coin") || q.includes("toss")) {
    return "It landed on " + (Math.random() < 0.5 ? "Heads" : "Tails") + ", Boss.";
  }
  if (q.includes("roll a dice") || q.includes("roll dice")) {
    return "You rolled a " + (Math.floor(Math.random() * 6) + 1) + ", Boss.";
  }

  if (q.includes("joke")) {
    try {
      const res = await fetch("https://official-joke-api.appspot.com/random_joke");
      const data = await res.json();
      return data.setup + " ... " + data.punchline;
    } catch (e) {
      return "Why do programmers prefer dark mode? Because light attracts bugs, Boss!";
    }
  }

  if (q.includes("quote") || q.includes("motivate")) {
    try {
      const res = await fetch("https://dummyjson.com/quotes/random");
      const data = await res.json();
      return "\"" + data.quote + "\" - " + data.author;
    } catch (e) {
      return "Sometimes you gotta run before you can walk, Boss.";
    }
  }

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
      return "Unable to fetch live news right now, Boss.";
    }
  }

  if (q.startsWith("translate ")) {
    try {
      let targetLang = "te";
      let textToTranslate = query.substring(10).trim();
      if (q.includes(" to hindi")) {
        targetLang = "hi";
        textToTranslate = textToTranslate.replace(/to hindi/i, "").trim();
      } else if (q.includes(" to telugu")) {
        targetLang = "te";
        textToTranslate = textToTranslate.replace(/to telugu/i, "").trim();
      } else if (q.includes(" to spanish")) {
        targetLang = "es";
        textToTranslate = textToTranslate.replace(/to spanish/i, "").trim();
      }
      const res = await fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(textToTranslate) + "&langpair=en|" + targetLang);
      const data = await res.json();
      return "Translation: " + data.responseData.translatedText;
    } catch (e) {
      return "Translation service unavailable right now, Boss.";
    }
  }

  if (q.includes("dollars to rupees") || q.includes("usd to inr")) {
    try {
      const numMatch = q.match(/\d+(\.\d+)?/);
      const amount = numMatch ? parseFloat(numMatch[0]) : 1;
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const data = await res.json();
      const inr = (amount * data.rates.INR).toFixed(2);
      return amount + " US Dollar(s) equals " + inr + " Indian Rupees, Boss.";
    } catch (e) {
      return "Currency conversion failed, Boss.";
    }
  }

  if (q.startsWith("meaning of ") || q.startsWith("define ")) {
    try {
      const word = q.replace("meaning of ", "").replace("define ", "").trim();
      const res = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word));
      const data = await res.json();
      const def = data[0].meanings[0].definitions[0].definition;
      return "Meaning of " + word + ": " + def;
    } catch (e) {
      return "Could not find dictionary definition for that word, Boss.";
    }
  }

  if (q.includes("password")) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
    let pass = "";
    for (let i = 0; i < 14; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return "Generated strong password, Boss: " + pass;
  }

  if (q.startsWith("search ")) {
    const term = query.substring(7).trim();
    window.open("https://www.google.com/search?q=" + encodeURIComponent(term), "_blank");
    return "Searching Google for " + term + ", Boss.";
  }

  if (q.startsWith("open youtube")) {
    window.open("https://m.youtube.com", "_blank");
    return "Opening YouTube, Boss.";
  }
  if (q.startsWith("open google")) {
    window.open("https://www.google.com", "_blank");
    return "Opening Google, Boss.";
  }
  if (q.startsWith("open instagram")) {
    window.open("https://www.instagram.com", "_blank");
    return "Opening Instagram, Boss.";
  }

  if (q.startsWith("play ")) {
    const song = query.substring(5).trim();
    window.open("https://m.youtube.com/results?search_query=" + encodeURIComponent(song), "_blank");
    return "Playing " + song + " on YouTube, Boss.";
  }
  if (q.includes("bitcoin") || q.includes("crypto")) {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,inr");
      const data = await res.json();
      return "Live Bitcoin price is $" + data.bitcoin.usd + " (Rs. " + data.bitcoin.inr + "), Boss.";
    } catch (e) {
      return "Crypto price feed unavailable right now, Boss.";
    }
  }

  return null;
}

// 5. Auto-Discover Working Gemini Model + Autonomous Agent
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
  const apiKey = getSavedKey();
  if (!apiKey) {
    toggleKeyBox(true);
    return { error: "API Key missing! Paste your key in the box above and tap Save." };
  }

  const isAgentMode = /briefing|plan|research|analyze/i.test(promptText);
  if (isAgentMode) {
    addMessage("[AGENT MODE]: Thinking, planning steps, and compiling report...", "jarvis", false);
  }

  const memoryContext = chatHistory.slice(-6).map(function (m) {
    return m.type.toUpperCase() + ": " + m.text;
  }).join("\n");

  const agentInstruction = isAgentMode
    ? "Activate Autonomous Agent Mode: Break down the user's goal into clear Step 1, Step 2, Step 3 actions and give a smart Final Report."
    : "Keep answers clear, smart, and under 3 short sentences so voice playback is smooth.";

  const fullPrompt = "You are J.A.R.V.I.S, an intelligent mobile AI assistant. Always call the user Boss. " + agentInstruction + "\n\nConversation History:\n" + memoryContext + "\n\nUser: " + promptText;

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
        if (statusBadge) statusBadge.innerText = "ONLINE";
        return { text: data.candidates[0].content.parts[0].text };
      } else if (data.error) {
        lastError = data.error.message || "API Error";
        if (lastError.toLowerCase().includes("api key not valid")) {
          toggleKeyBox(true);
          return { error: "Invalid API Key. Paste a valid key in the box above and tap Save." };
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
  if (userInput) userInput.value = "";
  if (reactor) reactor.classList.add("thinking");
  if (statusBadge) statusBadge.innerText = "THINKING";

  if (!base64Img) {
    const toolOutput = await runLocalTools(text);
    if (toolOutput) {
      if (reactor) reactor.classList.remove("thinking");
      if (statusBadge) statusBadge.innerText = "ONLINE";
      addMessage(toolOutput, "jarvis");
      speakText(toolOutput);
      return;
    }
  }

  const result = await callGeminiBrain(text || "Describe what is in this image.", base64Img);
  if (reactor) reactor.classList.remove("thinking");

  if (result.error) {
    if (statusBadge) statusBadge.innerText = "ERROR";
    addMessage(result.error, "error", false);
  } else {
    if (statusBadge) statusBadge.innerText = "ONLINE";
    addMessage(result.text, "jarvis");
    speakText(result.text);
  }
}

if (sendBtn) {
  sendBtn.addEventListener("click", function () {
    processInput(userInput.value.trim(), null);
  });
}

if (userInput) {
  userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      processInput(userInput.value.trim(), null);
    }
  });
}

// 6. Camera Vision (Eyes)
if (camBtn && cameraInput) {
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
}

// 7. Microphone & Wake Word
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
  if (micBtn) {
    micBtn.addEventListener("click", function () {
      addMessage("Speech recognition is not supported in this browser. Please open in Google Chrome.", "error", false);
    });
  }
} else {
  const recognition = new SpeechRec();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  if (micBtn) {
    micBtn.addEventListener("click", async function () {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      const allowed = await requestMicPermission();
      if (!allowed) return;

      try {
        recognition.start();
        micBtn.classList.add("listening");
        if (statusBadge) statusBadge.innerText = "LISTENING";
      } catch (err) {
        recognition.stop();
        micBtn.classList.remove("listening");
        if (statusBadge) statusBadge.innerText = "ONLINE";
      }
    });
  }

  recognition.onresult = function (event) {
    if (micBtn) micBtn.classList.remove("listening");
    if (statusBadge) statusBadge.innerText = "ONLINE";
    const spokenText = event.results[0][0].transcript;
    processInput(spokenText, null);
  };

  recognition.onerror = function (event) {
    if (micBtn) micBtn.classList.remove("listening");
    if (statusBadge) statusBadge.innerText = "ONLINE";
    if (event.error === "not-allowed") {
      addMessage("Microphone blocked! Tap the icon next to the URL in Chrome -> Permissions -> Microphone -> Allow.", "error", false);
    } else if (event.error !== "no-speech" && event.error !== "aborted") {
      addMessage("Mic error: " + event.error + ". Try tapping MIC again.", "error", false);
    }
  };

  recognition.onend = function () {
    if (micBtn) micBtn.classList.remove("listening");
  };

  // Wake Word ("Hey Jarvis")
  let isWakeOn = false;
  const wakeRecognition = new SpeechRec();
  wakeRecognition.continuous = true;
  wakeRecognition.lang = "en-IN";

  if (wakeBtn) {
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
  }

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
