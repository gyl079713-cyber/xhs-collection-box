(() => {
if (globalThis.__XHS_COLLECTION_ORGANIZER_VERSION__ === 5) return;
globalThis.__XHS_COLLECTION_ORGANIZER_VERSION__ = 5;
globalThis.__XHS_COLLECTION_ORGANIZER_LOADED__ = true;

const CARD_SELECTORS = [
  "section.note-item",
  "article",
  ".note-item",
  "[class*='note-item']",
  "[class*='feed-card']"
];

const TITLE_SELECTORS = [
  ".title",
  ".note-title",
  "[class*='note-title']",
  "[class*='title']"
];

const AUTHOR_SELECTORS = [
  ".author .name",
  ".author",
  "[class*='author'] [class*='name']",
  "[class*='author']",
  "[class*='user'] [class*='name']"
];

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function firstText(root, selectors) {
  for (const selector of selectors) {
    const value = cleanText(root.querySelector(selector)?.textContent);
    if (value) return value;
  }
  return "";
}

function findCard(anchor) {
  for (const selector of CARD_SELECTORS) {
    const card = anchor.closest(selector);
    if (card) return card;
  }
  return anchor.parentElement || anchor;
}

function noteIdFromUrl(url) {
  const match = url.match(/\/(?:explore|discovery\/item)\/([^/?#]+)/);
  return match?.[1] || url;
}

function extractVisibleNotes() {
  const anchors = Array.from(
    document.querySelectorAll("a[href*='/explore/'], a[href*='/discovery/item/']")
  );
  const seen = new Set();
  const notes = [];

  for (const anchor of anchors) {
    const url = new URL(anchor.getAttribute("href"), location.origin).href;
    const id = noteIdFromUrl(url);
    if (!id || seen.has(id)) continue;

    const card = findCard(anchor);
    const image = card.querySelector("img") || anchor.querySelector("img");
    const title =
      firstText(card, TITLE_SELECTORS) ||
      cleanText(image?.alt) ||
      cleanText(anchor.getAttribute("aria-label"));

    if (!title && !image) continue;

    seen.add(id);
    notes.push({
      id,
      url,
      title: title || "未命名收藏",
      author: firstText(card, AUTHOR_SELECTORS) || "未知作者",
      cover: image?.currentSrc || image?.src || "",
      source: "visible-dom"
    });
  }

  return notes;
}

function sendSnapshot() {
  chrome.runtime.sendMessage({
    type: "XHS_VISIBLE_NOTES_UPDATED",
    notes: extractVisibleNotes()
  }).catch(() => {});
}

const autoScan = {
  running: false,
  stopRequested: false,
  notes: new Map(),
  sentVersions: new Map(),
  rounds: 0,
  requests: 0,
  hasMore: null,
  status: "idle",
  runId: "",
  stopReason: ""
};

const MAX_SCAN_ROUNDS = 100;
const MAX_SCAN_NOTES = 500;
const SCAN_ROUND_DELAY_MS = 1500;
const MAX_STABLE_ROUNDS = 15;

function collect(incoming) {
  for (const note of incoming || []) {
    if (!note?.id) continue;
    const old = autoScan.notes.get(note.id);
    if (!old) autoScan.notes.set(note.id, { ...note, orderRunId: autoScan.runId, orderIndex: autoScan.notes.size });
    else if (old.source === "page-response" && note.source === "visible-dom") {
      autoScan.notes.set(note.id, { ...old, cover: old.cover || note.cover });
    } else autoScan.notes.set(note.id, { ...old, ...note });
  }
}

function publishAutoScan() {
  const fresh = [];
  for (const note of autoScan.notes.values()) {
    const version = JSON.stringify(note);
    if (autoScan.sentVersions.get(note.id) === version) continue;
    autoScan.sentVersions.set(note.id, version);
    fresh.push(note);
  }
  chrome.runtime.sendMessage({
    type: "XHS_AUTO_SCAN_PROGRESS",
    notes: fresh,
    total: autoScan.notes.size,
    rounds: autoScan.rounds,
    requests: autoScan.requests,
    hasMore: autoScan.hasMore,
    status: autoScan.status,
    runId: autoScan.runId,
    stopReason: autoScan.stopReason
  }).catch(() => {});
}

window.addEventListener("message", event => {
  if (event.source !== window || event.origin !== location.origin || event.data?.type !== "XHS_COLLECT_BATCH_V1") return;
  if (!autoScan.running) return;
  autoScan.requests++;
  if (typeof event.data.hasMore === "boolean") autoScan.hasMore = event.data.hasMore;
  collect(event.data.notes);
  publishAutoScan();
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function isVisible(element) {
  if (!(element instanceof Element)) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
}

function detectBlockingState() {
  if (/\/(?:login|signin)(?:\/|$)/i.test(location.pathname)) return "login-required";
  const roots = document.querySelectorAll([
    '[role="dialog"]',
    '[class*="login-container"]',
    '[class*="login-modal"]',
    '[class*="captcha"]',
    '[class*="verify"]',
    '[class*="risk"]',
    '[class*="security"]'
  ].join(","));
  for (const root of roots) {
    if (!isVisible(root)) continue;
    const text = String(root.textContent || "").replace(/\s+/g, " ");
    if (/登录后|请先登录|登录已失效|重新登录|手机号登录|扫码登录/.test(text)) return "login-required";
    if (/访问过于频繁|操作过于频繁|账号异常|安全验证|请完成验证|检测到异常|验证后继续/.test(text)) return "safety-warning";
  }
  for (const frame of document.querySelectorAll('iframe[src*="captcha" i], iframe[src*="verify" i], iframe[src*="risk" i]')) {
    if (isVisible(frame)) return "safety-warning";
  }
  return "";
}

async function runAutoScan() {
  let stableAtBottom = 0;
  try {
    const scrolling = document.scrollingElement || document.documentElement;
    if (scrolling.scrollTop > 100) {
      const nudge = Math.min(400, scrolling.scrollTop);
      window.scrollBy(0, -nudge);
      await wait(250);
      window.scrollBy(0, nudge);
      await wait(500);
    }
    collect(extractVisibleNotes());
    publishAutoScan();
    for (let round = 0; round < MAX_SCAN_ROUNDS && !autoScan.stopRequested; round++) {
      const blockingBeforeScroll = detectBlockingState();
      if (blockingBeforeScroll) {
        autoScan.status = "partial";
        autoScan.stopReason = blockingBeforeScroll;
        break;
      }
      const beforeCount = autoScan.notes.size;
      const beforeTop = scrolling.scrollTop;
      window.scrollBy(0, Math.max(550, Math.round(innerHeight * .85)));
      await wait(SCAN_ROUND_DELAY_MS);
      autoScan.rounds++;
      const blockingAfterScroll = detectBlockingState();
      if (blockingAfterScroll) {
        autoScan.status = "partial";
        autoScan.stopReason = blockingAfterScroll;
        break;
      }
      collect(extractVisibleNotes());
      const atBottom = scrolling.scrollTop + scrolling.clientHeight >= scrolling.scrollHeight - 30;
      stableAtBottom = atBottom && scrolling.scrollTop === beforeTop && autoScan.notes.size === beforeCount ? stableAtBottom + 1 : 0;
      publishAutoScan();
      if (autoScan.hasMore === false) {
        autoScan.status = "complete";
        break;
      }
      if (autoScan.notes.size >= MAX_SCAN_NOTES) {
        autoScan.status = "partial";
        autoScan.stopReason = "batch-limit";
        break;
      }
      if (stableAtBottom >= MAX_STABLE_ROUNDS) {
        autoScan.status = "partial";
        autoScan.stopReason = "stalled";
        break;
      }
    }
    if (autoScan.stopRequested) autoScan.status = "stopped";
    else if (autoScan.status === "running") {
      autoScan.status = "partial";
      autoScan.stopReason = "round-limit";
    }
  } catch (error) {
    autoScan.status = "error";
    chrome.runtime.sendMessage({ type: "XHS_AUTO_SCAN_ERROR", message: String(error?.message || error) }).catch(() => {});
  } finally {
    autoScan.running = false;
    collect(extractVisibleNotes());
    publishAutoScan();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "XHS_SCAN_VISIBLE_NOTES") {
    sendResponse({ notes: extractVisibleNotes(), pageUrl: location.href });
  }
  if (message?.type === "XHS_START_AUTO_SCAN") {
    if (autoScan.running) { sendResponse({ started: false, running: true }); return; }
    autoScan.running = true;
    autoScan.stopRequested = false;
    autoScan.notes.clear();
    autoScan.sentVersions.clear();
    autoScan.rounds = 0;
    autoScan.requests = 0;
    autoScan.hasMore = null;
    autoScan.status = "running";
    autoScan.runId = String(Date.now());
    autoScan.stopReason = "";
    sendResponse({ started: true, running: true, resumed: (document.scrollingElement || document.documentElement).scrollTop > 100 });
    void runAutoScan();
  }
  if (message?.type === "XHS_STOP_AUTO_SCAN") {
    autoScan.stopRequested = true;
    sendResponse({ stopping: autoScan.running });
  }
  if (message?.type === "XHS_GET_AUTO_SCAN_STATE") {
    sendResponse({ running: autoScan.running, status: autoScan.status, total: autoScan.notes.size, runId: autoScan.runId,
      rounds: autoScan.rounds, requests: autoScan.requests, hasMore: autoScan.hasMore, stopReason: autoScan.stopReason,
      notes: [...autoScan.notes.values()] });
  }
});

let mutationTimer;
const observer = new MutationObserver(() => {
  clearTimeout(mutationTimer);
  mutationTimer = setTimeout(sendSnapshot, 800);
});

observer.observe(document.documentElement, { childList: true, subtree: true });
setTimeout(sendSnapshot, 1000);
})();
