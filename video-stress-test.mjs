import { initLotus } from "./lotus-init.mjs";

const urlParams = new URLSearchParams(location.search);
window.urlParams = urlParams;

function numberOrNull(numberish) {
  let number = parseFloat(numberish);
  if (isNaN(number)) return null;
  return number;
}

class ResultsDb {
  static startNewTest() {
    console.log("startNewTest");
    const currentTest = ResultsDb.currentTest;
    if (currentTest) {
      const previousTests = ResultsDb.previousTests;
      console.log("Previous tests", previousTests);

      previousTests.push(currentTest);

      localStorage.previousTests = JSON.stringify(previousTests);
      localStorage.currentTest = JSON.stringify(0);
    }
  }

  static incrementCurrentTest() {
    let currentTest = ResultsDb.currentTest;
    currentTest++;
    localStorage.currentTest = JSON.stringify(currentTest);

    return currentTest;
  }

  static get currentTest() {
    let currentTest =
      typeof localStorage.currentTest !== "undefined"
        ? JSON.parse(localStorage.currentTest)
        : 0;
    return currentTest;
  }

  static get previousTests() {
    let previousTests =
      typeof localStorage.previousTests !== "undefined"
        ? JSON.parse(localStorage.previousTests)
        : [];
    return previousTests;
  }
}

function delay(delayMillis) {
  return new Promise((res) => {
    setTimeout(res, delayMillis);
  });
}

/**
 *
 * @param {HTMLVideoElement} video
 * @returns {Promise<void>}
 */
function whenLoaded(video) {
  return new Promise((res, rej) => {
    if (video.isLoaded) {
      res();
      return;
    }
    video.addEventListener("canplaythrough", res);
    video.addEventListener("error", rej);
  });
}

/**
 *
 * @param {HTMLVideoElement} video
 * @returns {Promise<void>}
 */
async function testPlayback(video, playbackAmount = 1000) {
  await video.play();
  await delay(playbackAmount);
  video.pause();
}

class VideoStressTest {
  videoURL = null;
  delay = numberOrNull(urlParams.get("delay")) ?? 1000;
  testPlaybackDuration = 1000;
  testPlayback = true;

  constructor({ contentEl }) {
    this.contentEl = contentEl;
  }

  start({ videoURL, videoWidth, videoHeight }) {
    this.videoURL = videoURL;
    this.videoWidth = videoWidth;
    this.videoHeight = videoHeight;
    console.log("Starting test");
    this.state = "running";

    ResultsDb.startNewTest();
    this._addVideo();
  }

  pause() {
    this.state = "paused";
  }
  resume() {
    if (this.state == "paused") {
      this.state = "running";
      this._addVideo();
    }
  }

  async _addVideo() {
    if (this.state !== "running") {
      return;
    }

    // const newVideo = document.createElement("video");
    const videoContainer = document.createElement("div");
    videoContainer.classList.add("video-container");

    const video = document.createElement("video");
    video.src = `${this.videoURL}?nocache=${Date.now()}`;
    video.playsInline = true;
    video.muted = true;
    video.preload = urlParams.get("preload") ?? "auto";
    video.width = this.videoWidth;
    video.height = this.videoHeight;
    videoContainer.appendChild(video);

    console.log("Adding video...", video);
    this.contentEl.appendChild(videoContainer);
    video.load();

    let currentTest = ResultsDb.incrementCurrentTest();
    console.log("Video count: ", currentTest);

    requestAnimationFrame(() => {
      video.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    try {
      await whenLoaded(video);
      if (this.testPlayback) {
        await testPlayback(video, this.testPlaybackDuration);
      }

      if (this.state == "running") {
        await delay(this.delay);
        this._addVideo();
      }
    } catch (errorEvent) {
      alert(`Video load/playback failed`);
      this.state = "error";
    }
  }
}

if (ResultsDb.currentTest) {
  ResultsDb.startNewTest();
}
document
  .querySelector("#clearPreviousTestsBtn")
  .addEventListener("click", () => {
    if (confirm("Clear previous tests?")) {
      delete localStorage.previousTests;
    }
  });

document.querySelector("#clipPathEnabled").addEventListener("change", (e) => {
  document.documentElement.classList.toggle(
    "clipPath",
    e.currentTarget.checked
  );
});
document.querySelector("#willChangeEnabled").addEventListener("change", (e) => {
  document.documentElement.classList.toggle(
    "willChange",
    e.currentTarget.checked
  );
});
document.querySelector("#playbackEnabled").addEventListener("change", (e) => {
  tester.testPlayback = e.currentTarget.checked;
});

document.querySelector("#lotusEnabled").addEventListener("change", (e) => {
  useLotus = e.currentTarget.checked;
});

const parseVideoInfo = (videoInfo) => {
  let [videoURL, videoDimensions] = videoInfo.split("|");
  let [videoWidth, videoHeight] = videoDimensions.split("x");
  return { videoURL, videoWidth, videoHeight };
};

const tester = new VideoStressTest({
  contentEl: document.querySelector("#test"),
});

const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const videoSelector = document.querySelector("#video-selector");
let useLotus = false;
document.querySelector("#startBtn").addEventListener("click", async (e) => {
  startBtn.disabled = true;
  videoSelector.disabled = true;
  document.querySelector("#lotusEnabled").disabled = true;

  if (tester.state == "paused") {
    tester.resume();
    return;
  }

  if (useLotus) {
    await initLotus();
    await delay(500);
  }

  startBtn.textContent = "Resume";
  pauseBtn.disabled = false;

  tester.start({
    ...parseVideoInfo(videoSelector.value),
  });
});

document.querySelector("#pauseBtn").addEventListener("click", async (e) => {
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  tester.pause();
});

setInterval(() => {
  const currentTestEl = document.querySelector("#currentTestEl");
  const previousTestsEl = document.querySelector("#previousTestsEl");

  currentTestEl.textContent = ResultsDb.currentTest;
  const previousTests = ResultsDb.previousTests;
  previousTestsEl.textContent = previousTests.length
    ? previousTests.join(", ")
    : "None";

  clearPreviousTestsBtn.style.display = previousTests.length ? "" : "none";
}, 1000);

window.tester = tester;
window.ResultsDb = ResultsDb;
