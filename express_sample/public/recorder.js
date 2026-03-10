/**
 * Speechace Express Sample — Frontend Recorder
 */

const SPEECH_ROWS = ["overall", "pronunciation", "fluency", "grammar", "vocab", "coherence"];
const WRITING_ROWS = ["overall", "task_response", "vocab", "grammar", "coherence"];
const FLUENCY_LABELS = {
  all_word_count:       "Word count",
  correct_word_count:   "Correctly pronounced",
  duration:             "Duration (s)",
  speech_rate:          "Speech rate (words/min)",
  pause_count:          "Pause count",
};

let mediaRecorder = null;
let audioChunks = [];
let recordedBlob = null;
let timerInterval = null;
let elapsed = 0;
let mode = "text";

let audioCtx = null;
let decodedAudioBuffer = null;
let submittedAudioBlob = null;
let decodePromise = null;
let currentWordSource = null;
let currentPlayBtn = null;

const recordBtn     = document.getElementById("record-btn");
const submitBtn     = document.getElementById("submit-btn");
const playback      = document.getElementById("playback");
const timerEl       = document.getElementById("timer");
const statusMsg     = document.getElementById("status-msg");
const errorMsg      = document.getElementById("error-msg");
const resultsCard   = document.getElementById("results-card");
const fileInput     = document.getElementById("file-input");
const dialectSelect = document.getElementById("dialect");
const modeTabs      = document.querySelectorAll(".mode-tab");
const audioSection  = document.getElementById("audio-section");

function getOrCreateAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function decodeSubmittedAudio() {
  if (!submittedAudioBlob) return Promise.resolve();
  if (decodedAudioBuffer) return Promise.resolve();
  if (decodePromise) return decodePromise;
  decodePromise = (async () => {
    try {
      const ctx = getOrCreateAudioCtx();
      const arrayBuffer = await submittedAudioBlob.arrayBuffer();
      decodedAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.error("[playback] decodeAudioData failed:", err);
      decodedAudioBuffer = null;
    } finally {
      decodePromise = null;
    }
  })();
  return decodePromise;
}

async function playWordAudio(startSec, endSec, btn) {
  const ctx = getOrCreateAudioCtx();
  if (!decodedAudioBuffer) {
    if (!submittedAudioBlob) return;
    await decodeSubmittedAudio();
    if (!decodedAudioBuffer) return;
  }
  if (ctx.state === "suspended") await ctx.resume();
  if (currentWordSource) {
    try { currentWordSource.stop(); } catch (_) {}
    currentWordSource = null;
  }
  if (currentPlayBtn) {
    currentPlayBtn.classList.remove("playing");
    currentPlayBtn = null;
  }
  const duration = endSec - startSec;
  if (duration <= 0) return;
  const source = ctx.createBufferSource();
  source.buffer = decodedAudioBuffer;
  source.connect(ctx.destination);
  source.start(0, startSec, duration);
  source.onended = () => {
    if (currentPlayBtn === btn) { btn.classList.remove("playing"); currentPlayBtn = null; }
    currentWordSource = null;
  };
  currentWordSource = source;
  currentPlayBtn = btn;
  btn.classList.add("playing");
}

function getWordExtent(phoneScoreList) {
  if (!phoneScoreList?.length) return null;
  const extents = phoneScoreList.map((p) => p.extent).filter((e) => Array.isArray(e) && e.length >= 2 && typeof e[0] === "number");
  if (!extents.length) return null;
  return [Math.min(...extents.map((e) => e[0])) / 100, Math.max(...extents.map((e) => e[1])) / 100];
}

function renderSyllableChips(syllableList) {
  if (!syllableList?.length) return "\u2014";
  return syllableList.map((s) => {
    const cls = scoreBadgeClass(s.quality_score);
    return `<span class="syllable-chip ${cls}">${s.letters ?? "?"}</span>`;
  }).join("");
}

function checkSubmitReady() {
  if (mode === "writing") {
    const prompt = document.getElementById("writing-prompt").value.trim();
    const answer = document.getElementById("writing-answer").value.trim();
    submitBtn.disabled = !(prompt && answer);
  } else {
    submitBtn.disabled = !(recordedBlob || fileInput.files.length > 0);
  }
}

modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    modeTabs.forEach((t) => t.classList.toggle("active", t === tab));
    document.getElementById("text-field-wrap").style.display  = mode === "text"    ? "" : "none";
    document.getElementById("task-context-wrap").style.display = mode === "task"    ? "" : "none";
    document.getElementById("writing-section").style.display  = mode === "writing" ? "" : "none";
    audioSection.style.display = mode === "writing" ? "none" : "";
    resultsCard.classList.remove("visible");
    checkSubmitReady();
  });
});

document.getElementById("writing-prompt").addEventListener("input", checkSubmitReady);
document.getElementById("writing-answer").addEventListener("input", checkSubmitReady);

recordBtn.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") { stopRecording(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startRecording(stream);
  } catch (err) { showError(`Microphone access denied: ${err.message}`); }
});

function startRecording(stream) {
  audioChunks = []; recordedBlob = null;
  playback.classList.remove("visible"); clearError();
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
  mediaRecorder = new MediaRecorder(stream, { mimeType });
  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
  mediaRecorder.onstop = onRecordingStop;
  mediaRecorder.start();
  recordBtn.textContent = "Stop Recording";
  recordBtn.classList.add("recording");
  submitBtn.disabled = true;
  setStatus("Recording\u2026");
  startTimer();
}

function stopRecording() {
  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach((t) => t.stop());
  recordBtn.textContent = "Record Again";
  recordBtn.classList.remove("recording");
  stopTimer();
}

function onRecordingStop() {
  recordedBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
  const url = URL.createObjectURL(recordedBlob);
  playback.src = url;
  playback.classList.add("visible");
  setStatus(`Recording ready \u2014 ${(recordedBlob.size / 1024).toFixed(1)} KB`);
  checkSubmitReady();
}

function startTimer() {
  elapsed = 0; timerEl.textContent = "0:00";
  timerInterval = setInterval(() => {
    elapsed++;
    const m = Math.floor(elapsed / 60);
    const s = String(elapsed % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() { clearInterval(timerInterval); }

submitBtn.addEventListener("click", async () => {
  clearError(); submitBtn.disabled = true; setStatus("Scoring\u2026");
  resultsCard.classList.remove("visible");
  try {
    const result = await submitRequest();
    renderResults(result);
    if (mode === "text") decodeSubmittedAudio();
  } catch (err) { showError(err.message); }
  finally { checkSubmitReady(); }
});

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    recordedBlob = null;
    playback.classList.remove("visible");
    setStatus(`File selected: ${fileInput.files[0].name}`);
    checkSubmitReady();
  }
});

async function submitRequest() {
  return mode === "writing" ? submitWriting() : submitAudio();
}

async function submitAudio() {
  let audioSource = recordedBlob;
  let filename = "recording.webm";
  if (!audioSource && fileInput.files.length > 0) {
    audioSource = fileInput.files[0];
    filename = fileInput.files[0].name;
  }
  if (!audioSource) throw new Error("Please record or upload audio first.");
  submittedAudioBlob = audioSource;
  decodedAudioBuffer = null; decodePromise = null;

  const formData = new FormData();
  formData.append("audio", audioSource, filename);
  formData.append("dialect", dialectSelect.value);

  let endpoint;
  if (mode === "text") {
    const refText = document.getElementById("ref-text").value.trim();
    if (!refText) throw new Error("Please enter the reference text to score against.");
    formData.append("text", refText);
    endpoint = "/api/score/text";
  } else if (mode === "task") {
    const context = document.getElementById("task-context").value.trim();
    if (!context) throw new Error("Please enter an image description.");
    formData.append("task_context", context);
    endpoint = "/api/score/task";
  } else {
    endpoint = "/api/score/free";
  }

  const response = await fetch(endpoint, { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `Server error ${response.status}`);
  if (data.status !== "success") throw new Error(`API error: ${data.status}`);
  return data;
}

async function submitWriting() {
  const prompt = document.getElementById("writing-prompt").value.trim();
  const answer = document.getElementById("writing-answer").value.trim();
  if (!prompt) throw new Error("Please enter the writing prompt.");
  if (!answer) throw new Error("Please enter your written answer.");

  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("answer", answer);
  formData.append("dialect", dialectSelect.value);

  const response = await fetch("/api/score/writing", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `Server error ${response.status}`);
  if (data.status !== "success") throw new Error(`API error: ${data.status}`);
  return data;
}

function renderResults(data) {
  document.getElementById("text-results").style.display    = "none";
  document.getElementById("speech-results").style.display  = "none";
  document.getElementById("task-results").style.display    = "none";
  document.getElementById("writing-results").style.display = "none";
  if (mode === "text") renderTextResults(data);
  else if (mode === "speech") renderSpeechResults(data);
  else if (mode === "task") renderTaskResults(data);
  else renderWritingResults(data);
  resultsCard.classList.add("visible");
  setStatus("Done.");
}

function renderTextResults(data) {
  document.getElementById("text-results").style.display = "";
  const scoreInfo = data.text_score ?? {};
  const score = scoreInfo.speechace_score?.pronunciation ?? null;
  const overallScore = document.getElementById("overall-score");
  overallScore.textContent = score !== null ? score : "N/A";
  overallScore.className = "score-badge " + scoreBadgeClass(score);

  const words = scoreInfo.word_score_list ?? [];
  const tbody = document.getElementById("word-tbody");
  const wordTable = document.getElementById("word-table");
  tbody.innerHTML = "";

  if (words.length > 0) {
    wordTable.style.display = "";
    for (const word of words) {
      const extent = getWordExtent(word.phone_score_list);
      const hasExtent = extent !== null;
      const phones = (word.phone_score_list ?? [])
        .map((p) => `<span class="phone-chip ${scoreBadgeClass(p.quality_score)}">${p.phone}(${p.quality_score != null ? Math.round(p.quality_score) : "?"})</span>`)
        .join(" ");
      const syllables = renderSyllableChips(word.syllable_score_list);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-word">
          <button class="word-play-btn"
            ${hasExtent ? `data-start="${extent[0]}" data-end="${extent[1]}"` : "disabled"}
            title="${hasExtent ? `Play` : "No timing data"}">&#9654;</button><strong>${word.word ?? ""}</strong>
        </td>
        <td class="col-score"><span class="score-badge ${scoreBadgeClass(word.quality_score)}">${word.quality_score ?? "N/A"}</span></td>
        <td class="col-syllables">${syllables}</td>
        <td class="col-phones">${phones}</td>
      `;
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll(".word-play-btn[data-start]").forEach((btn) => {
      btn.addEventListener("click", () => {
        playWordAudio(parseFloat(btn.dataset.start), parseFloat(btn.dataset.end), btn);
      });
    });
  } else {
    wordTable.style.display = "none";
  }

  const fluency = scoreInfo.fluency ?? {};
  const fluencyBody = document.getElementById("fluency-body");
  const fluencySection = document.getElementById("fluency-section");
  fluencyBody.innerHTML = "";
  const fluencyEntries = Object.entries(FLUENCY_LABELS).filter(([key]) => fluency[key] !== undefined);
  if (fluencyEntries.length > 0) {
    fluencySection.style.display = "";
    for (const [key, label] of fluencyEntries) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${label}</td><td><strong>${fluency[key]}</strong></td>`;
      fluencyBody.appendChild(tr);
    }
  } else {
    fluencySection.style.display = "none";
  }
}

function renderSpeechResults(data) {
  document.getElementById("speech-results").style.display = "";
  const speechScore = data.speech_score ?? {};
  const speechace = speechScore.speechace_score ?? {};
  const cefr      = speechScore.cefr_score ?? {};
  const ielts     = speechScore.ielts_score ?? {};
  const transcriptRow = document.getElementById("transcript-row");
  const transcript = speechScore.transcript ?? null;
  if (transcript) { transcriptRow.textContent = `Transcript: ${transcript}`; transcriptRow.style.display = ""; }
  else { transcriptRow.style.display = "none"; }
  fillScoreTable("score-tbody", SPEECH_ROWS, speechace, cefr, ielts);
}

function renderTaskResults(data) {
  document.getElementById("task-results").style.display = "";
  const taskInfo = data.task_score ?? {};
  const taskScore = taskInfo.score ?? null;
  const taskScoreEl = document.getElementById("task-score");
  taskScoreEl.textContent = taskScore !== null ? taskScore : "N/A";
  taskScoreEl.className = "score-badge " + taskBadgeClass(taskScore);
  const taskTranscript = document.getElementById("task-transcript");
  const transcript = taskInfo.transcript ?? null;
  if (transcript) { taskTranscript.textContent = `Transcript: ${transcript}`; taskTranscript.style.display = ""; }
  else { taskTranscript.style.display = "none"; }
  const speechScore = data.speech_score ?? {};
  fillScoreTable("task-score-tbody", SPEECH_ROWS, speechScore.speechace_score ?? {}, speechScore.cefr_score ?? {}, speechScore.ielts_score ?? {});
}

function renderWritingResults(data) {
  document.getElementById("writing-results").style.display = "";
  const writingInfo = data.writing_score ?? {};
  fillScoreTable("writing-score-tbody", WRITING_ROWS, writingInfo.speechace ?? {}, writingInfo.cefr ?? {}, writingInfo.ielts ?? {});
}

function fillScoreTable(tbodyId, rows, speechace, cefr, ielts) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";
  for (const row of rows) {
    const s = speechace[row] ?? "N/A";
    const c = cefr[row] ?? "N/A";
    const i = ielts[row] ?? "N/A";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-category">${row}</td>
      <td class="col-speechace ${scoreCellClass(s)}">${s}</td>
      <td>${c}</td><td>${i}</td>
    `;
    tbody.appendChild(tr);
  }
}

function scoreBadgeClass(score) {
  if (score === null || score === undefined) return "";
  if (score >= 70) return "score-high";
  if (score >= 40) return "score-mid";
  return "score-low";
}

function taskBadgeClass(score) {
  if (score === null || score === undefined) return "";
  if (score >= 3.5) return "score-high";
  if (score >= 2) return "score-mid";
  return "score-low";
}

function scoreCellClass(score) {
  if (typeof score !== "number") return "";
  if (score >= 70) return "score-high-cell";
  if (score >= 40) return "score-mid-cell";
  return "score-low-cell";
}

function setStatus(msg) { statusMsg.textContent = msg; }
function showError(msg) { errorMsg.textContent = msg; }
function clearError()   { errorMsg.textContent = ""; }
