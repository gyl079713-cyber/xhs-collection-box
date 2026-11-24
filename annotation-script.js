(() => {
  if (globalThis.__XHS_COLLECTION_ANNOTATIONS__) return;
  globalThis.__XHS_COLLECTION_ANNOTATIONS__ = true;

  const KEY = "xhsCollectionAnnotationsV1";
  const MARK = "xhs-collection-saved-highlight";
  let annotations = [];
  let painted = new Map();
  let activeNoteId = "";
  let pendingRange = null;
  let repaintTimer;

  const host = document.createElement("div");
  host.id = "xhs-collection-annotation-ui";
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  document.documentElement.append(host);
  const shadow = host.attachShadow({ mode: "closed" });
  const uiStyle = document.createElement("style");
  uiStyle.textContent = `:host{--surface:#fff;--text:#253046;--border:#dce2ea;--muted:#59657a;--quiet:#eef1f6;--accent:#526f9f;--shadow:#17203324}:host([data-theme="dark"]){--surface:#252a34;--text:#edf1f8;--border:#474f5d;--muted:#b8c3d2;--quiet:#394352;--accent:#789bd0;--shadow:#0008}.box{position:fixed;z-index:1;pointer-events:auto;max-width:min(330px,calc(100vw - 24px));background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 35px var(--shadow);padding:10px;font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.box button{border:0;border-radius:8px;padding:7px 12px;background:var(--accent);color:#fff;font:600 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.box button.light{background:var(--quiet);color:var(--text)}.box textarea{box-sizing:border-box;display:block;width:100%;min-height:82px;margin:9px 0;border:1px solid var(--border);border-radius:8px;padding:8px;background:var(--surface);color:var(--text);font:13px sans-serif;resize:vertical}.box .quote{max-height:90px;overflow:auto;color:var(--muted);line-height:1.45}.box .actions{display:flex;gap:7px;justify-content:flex-end}.box .title{font-weight:700;margin-bottom:6px}`;
  const box = document.createElement("div");
  box.className = "box";
  box.hidden = true;
  shadow.append(uiStyle, box);
  const pageStyle = document.createElement("style");
  document.head.append(pageStyle);

  function isDarkPage() {
    const theme = `${document.documentElement.getAttribute("data-theme") || ""} ${document.body?.getAttribute("data-theme") || ""} ${document.documentElement.className || ""} ${document.body?.className || ""}`;
    if (/\bdark\b/i.test(theme)) return true;
    if (/\blight\b/i.test(theme)) return false;
    const color = getComputedStyle(bodyRoot() || document.body || document.documentElement).color.match(/\d+(?:\.\d+)?/g);
    if (color?.length >= 3) {
      const [r, g, b] = color.slice(0, 3).map(Number);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness > 155) return true;
      if (brightness < 115) return false;
    }
    return matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function applyTheme() {
    const dark = isDarkPage();
    const theme = dark ? "dark" : "light";
    if (host.dataset.theme === theme) return;
    host.dataset.theme = theme;
    pageStyle.textContent = dark
      ? `::highlight(${MARK}){background-color:rgba(139,181,238,.17);text-decoration-line:underline;text-decoration-color:rgba(151,194,248,.62);text-decoration-thickness:1px}`
      : `::highlight(${MARK}){background-color:rgba(80,116,174,.12);text-decoration-line:underline;text-decoration-color:rgba(69,106,166,.56);text-decoration-thickness:1px}`;
  }

  function noteId() {
    return location.pathname.match(/\/(?:explore|discovery\/item)\/([^/?#]+)/)?.[1] || "";
  }
  function bodyRoot() {
    return document.querySelector("#detail-desc, #noteContainer .desc, #noteContainer .note-text");
  }
  function noteTitle() {
    return (document.querySelector("#detail-title")?.textContent || document.title || "小红书笔记").trim().slice(0, 200);
  }
  function place(x, y) {
    box.style.left = `${Math.max(12, Math.min(x, innerWidth - 342))}px`;
    box.style.top = `${Math.max(12, Math.min(y, innerHeight - 185))}px`;
    box.hidden = false;
  }
  function hide() { box.hidden = true; box.replaceChildren(); pendingRange = null; }
  function button(label, onClick, light = false) {
    const item = document.createElement("button");
    item.type = "button";
    item.textContent = label;
    if (light) item.className = "light";
    item.addEventListener("mousedown", event => event.preventDefault());
    item.addEventListener("click", event => { event.stopPropagation(); onClick(); });
    return item;
  }
  function contextAround(range) {
    const text = range.startContainer?.textContent || "";
    const before = text.slice(Math.max(0, range.startOffset - 40), range.startOffset);
    const after = range.endContainer === range.startContainer ? text.slice(range.endOffset, range.endOffset + 40) : "";
    return { prefix: before, suffix: after };
  }
  async function upsert(record) {
    const result = await chrome.runtime.sendMessage({ type: "XHS_ANNOTATION_UPSERT", record });
    if (!result?.ok) throw new Error(result?.error || "保存失败");
  }
  function showSelectionAction(range, quote) {
    pendingRange = range.cloneRange();
    const rect = pendingRange.getBoundingClientRect();
    box.replaceChildren(button("Note", async () => {
      const id = noteId();
      if (!id || !pendingRange) return;
      const savedRange = pendingRange.cloneRange();
      const record = { id: crypto.randomUUID(), kind: "highlight", noteId: id,
        title: noteTitle(), url: location.href, quote, body: "", createdAt: new Date().toISOString(),
        ...contextAround(savedRange) };
      try {
        await upsert(record);
        window.getSelection()?.removeAllRanges();
        hide();
        repaint();
      } catch (error) {
        box.replaceChildren(document.createTextNode(`保存失败：${error.message}`));
      }
    }));
    place(rect.right + 6, rect.bottom + 8);
  }
  function showEditor(record, x, y) {
    const isNew = !record?.id;
    const current = record || { id: crypto.randomUUID(), kind: "note", noteId: noteId(), title: noteTitle(),
      url: location.href, quote: "", body: "", createdAt: new Date().toISOString() };
    const title = document.createElement("div"); title.className = "title";
    title.textContent = current.quote ? "给这处划线写 Note" : "给这篇笔记写 Note";
    const quote = document.createElement("div"); quote.className = "quote";
    if (current.quote) quote.textContent = `“${current.quote}”`;
    const input = document.createElement("textarea"); input.placeholder = "写下你的想法…";
    input.value = current.body || ""; input.maxLength = 5000;
    const actions = document.createElement("div"); actions.className = "actions";
    actions.append(button("取消", hide, true), button("保存 Note", async () => {
      const body = input.value.trim();
      if (isNew && !body) { input.focus(); return; }
      try { await upsert({ ...current, body }); hide(); }
      catch (error) { input.setCustomValidity(error.message); input.reportValidity(); }
    }));
    box.replaceChildren(title, quote, input, actions);
    place(x, y);
    input.focus();
  }
  function textNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.trim() || node.parentElement?.closest("script,style,textarea,input,button,[contenteditable],#xhs-collection-annotation-ui")) continue;
      nodes.push(node);
    }
    return nodes;
  }
  function findRange(record) {
    const quote = record.quote;
    if (!quote || quote.length > 2000) return null;
    const roots = [bodyRoot()].filter(Boolean);
    for (const root of roots) {
      if (!root || root === host) continue;
      const nodes = textNodes(root);
      let full = "";
      const offsets = [];
      for (const node of nodes) { offsets.push(full.length); full += node.textContent; if (full.length > 300000) break; }
      let index = full.indexOf(quote);
      if (index < 0) continue;
      if (record.prefix || record.suffix) {
        let next = index;
        while (next >= 0) {
          const prefix = full.slice(Math.max(0, next - (record.prefix || "").length), next);
          const suffix = full.slice(next + quote.length, next + quote.length + (record.suffix || "").length);
          if ((!record.prefix || prefix.endsWith(record.prefix)) && (!record.suffix || suffix.startsWith(record.suffix))) { index = next; break; }
          next = full.indexOf(quote, next + 1);
        }
      }
      const start = offsets.findIndex((offset, i) => offset <= index && index < offset + nodes[i].textContent.length);
      const endIndex = index + quote.length - 1;
      const end = offsets.findIndex((offset, i) => offset <= endIndex && endIndex < offset + nodes[i].textContent.length);
      if (start < 0 || end < 0) continue;
      const range = document.createRange();
      range.setStart(nodes[start], index - offsets[start]);
      range.setEnd(nodes[end], index + quote.length - offsets[end]);
      return range;
    }
    return null;
  }
  function repaint() {
    applyTheme();
    const id = noteId();
    activeNoteId = id;
    painted = new Map();
    if (!globalThis.CSS?.highlights || typeof Highlight === "undefined") return;
    const ranges = [];
    for (const record of annotations) {
      if (record.noteId !== id || record.kind !== "highlight") continue;
      const range = findRange(record);
      if (!range) continue;
      painted.set(record.id, { record, range });
      ranges.push(range);
    }
    if (ranges.length) CSS.highlights.set(MARK, new Highlight(...ranges));
    else CSS.highlights.delete(MARK);
  }
  function scheduleRepaint() { clearTimeout(repaintTimer); repaintTimer = setTimeout(repaint, 700); }

  document.addEventListener("mouseup", event => {
    if (!noteId() || host.contains(event.target)) return;
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection?.rangeCount || selection.isCollapsed) return;
      const quote = selection.toString().trim();
      if (quote.length < 2 || quote.length > 2000) return;
      const range = selection.getRangeAt(0);
      const root = bodyRoot();
      if (!root || !root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
      if (range.commonAncestorContainer.parentElement?.closest("input,textarea,button,[contenteditable],#xhs-collection-annotation-ui")) return;
      showSelectionAction(range, quote);
    }, 0);
  }, true);
  document.addEventListener("click", event => {
    if (host.contains(event.target)) return;
    if (!box.hidden) hide();
    if (!noteId() || window.getSelection()?.toString().trim()) return;
    for (const { record, range } of painted.values()) {
      if ([...range.getClientRects()].some(rect => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom)) {
        showEditor(record, event.clientX + 8, event.clientY + 12);
        break;
      }
    }
  }, true);
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "XHS_OPEN_NOTE_EDITOR") return;
    if (!noteId()) { sendResponse({ opened: false, error: "请先打开一篇小红书笔记" }); return; }
    showEditor(null, Math.max(12, innerWidth / 2 - 150), Math.max(12, innerHeight / 3));
    sendResponse({ opened: true });
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[KEY]) {
      annotations = Array.isArray(changes[KEY].newValue) ? changes[KEY].newValue : [];
      scheduleRepaint();
    }
  });
  chrome.storage.local.get(KEY).then(stored => {
    annotations = Array.isArray(stored[KEY]) ? stored[KEY] : [];
    repaint();
  });
  new MutationObserver(scheduleRepaint).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(scheduleRepaint).observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
  new MutationObserver(scheduleRepaint).observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", scheduleRepaint);
  window.addEventListener("popstate", scheduleRepaint);
  setInterval(() => { if (noteId() !== activeNoteId) repaint(); }, 1200);
})();
