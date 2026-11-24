chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onStartup.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Keep collecting when the side panel closes. The Xiaohongshu tab itself must stay open.
const CACHE_KEY = "xhsCollectionBackgroundCacheV1";
const STATUS_KEY = "xhsCollectionBackgroundStatusV1";
const TAB_KEY = "xhsCollectionScanTabV1";
const COOLDOWN_KEY = "xhsCollectionScanCooldownUntilV1";
const ANNOTATIONS_KEY = "xhsCollectionAnnotationsV1";
const BATCH_COOLDOWN_MS = 5 * 60 * 1000;
const SAFETY_COOLDOWN_MS = 30 * 60 * 1000;
let saveQueue = Promise.resolve();
let annotationQueue = Promise.resolve();

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!["XHS_AUTO_SCAN_PROGRESS", "XHS_AUTO_SCAN_ERROR"].includes(message?.type) || !sender.tab?.id) return;
  saveQueue = saveQueue.then(async () => {
    const stored = await chrome.storage.local.get([CACHE_KEY, TAB_KEY]);
    if (stored[TAB_KEY] !== sender.tab.id) return;
    const cache = stored[CACHE_KEY] || {};
    for (const note of message.notes || []) if (note?.id) cache[note.id] = { ...cache[note.id], ...note };
    const status = message.type === "XHS_AUTO_SCAN_ERROR" ? "error" : message.status;
    const updates = {
      [CACHE_KEY]: cache,
      [STATUS_KEY]: { status, total: message.total || 0, rounds: message.rounds || 0,
        requests: message.requests || 0, stopReason: message.stopReason || "",
        message: message.message || "", updatedAt: Date.now() }
    };
    if (status === "partial" && ["batch-limit", "round-limit"].includes(message.stopReason)) {
      updates[COOLDOWN_KEY] = Date.now() + BATCH_COOLDOWN_MS;
    } else if (status === "partial" && message.stopReason === "safety-warning") {
      updates[COOLDOWN_KEY] = Date.now() + SAFETY_COOLDOWN_MS;
    }
    await chrome.storage.local.set(updates);
  }).catch(error => console.warn("收藏采集保存失败", error));
});

chrome.tabs.onRemoved.addListener(tabId => {
  saveQueue = saveQueue.then(async () => {
    const stored = await chrome.storage.local.get([TAB_KEY, STATUS_KEY]);
    if (stored[TAB_KEY] !== tabId || stored[STATUS_KEY]?.status !== "running") return;
    await chrome.storage.local.set({ [STATUS_KEY]: { ...stored[STATUS_KEY], status: "stopped", updatedAt: Date.now() } });
  }).catch(error => console.warn("收藏采集状态保存失败", error));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url || !/\/(?:login|signin)(?:\/|$)/i.test(new URL(changeInfo.url).pathname)) return;
  saveQueue = saveQueue.then(async () => {
    const stored = await chrome.storage.local.get([TAB_KEY, STATUS_KEY]);
    if (stored[TAB_KEY] !== tabId || stored[STATUS_KEY]?.status !== "running") return;
    await chrome.storage.local.set({
      [STATUS_KEY]: { ...stored[STATUS_KEY], status: "partial", stopReason: "login-required", updatedAt: Date.now() }
    });
  }).catch(error => console.warn("收藏采集登录状态保存失败", error));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!["XHS_ANNOTATION_UPSERT", "XHS_ANNOTATION_DELETE"].includes(message?.type)) return;
  annotationQueue = annotationQueue.then(async () => {
    const stored = await chrome.storage.local.get(ANNOTATIONS_KEY);
    const annotations = Array.isArray(stored[ANNOTATIONS_KEY]) ? stored[ANNOTATIONS_KEY] : [];
    if (message.type === "XHS_ANNOTATION_DELETE") {
      if (typeof message.id !== "string") throw new Error("缺少摘录 ID");
      await chrome.storage.local.set({ [ANNOTATIONS_KEY]: annotations.filter(item => item.id !== message.id) });
    } else {
      const raw = message.record;
      if (!raw || typeof raw.id !== "string" || typeof raw.noteId !== "string" || typeof raw.url !== "string" ||
          !/^https:\/\/www\.xiaohongshu\.com\//.test(raw.url)) throw new Error("摘录数据无效");
      const record = { id: raw.id.slice(0, 100), noteId: raw.noteId.slice(0, 100),
        title: String(raw.title || "").slice(0, 200), url: raw.url.slice(0, 2000),
        kind: raw.kind === "note" ? "note" : "highlight", quote: String(raw.quote || "").slice(0, 2000),
        body: String(raw.body || "").slice(0, 5000), createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(), prefix: String(raw.prefix || "").slice(0, 80),
        suffix: String(raw.suffix || "").slice(0, 80) };
      const index = annotations.findIndex(item => item.id === record.id);
      if (index < 0) annotations.push(record);
      else annotations[index] = { ...annotations[index], ...record, createdAt: annotations[index].createdAt };
      await chrome.storage.local.set({ [ANNOTATIONS_KEY]: annotations });
    }
    sendResponse({ ok: true });
  }).catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});
