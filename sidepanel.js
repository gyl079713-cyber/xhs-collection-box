const NOTES_KEY = "xhsCollectionOrganizerNotesV1";
const SETTINGS_KEY = "xhsCollectionOrganizerSettingsV2";
const REVEAL_KEY = "xhsCollectionRevealV1";
const ANNOTATIONS_KEY = "xhsCollectionAnnotationsV1";
const BACKGROUND_CACHE_KEY = "xhsCollectionBackgroundCacheV1";
const BACKGROUND_STATUS_KEY = "xhsCollectionBackgroundStatusV1";
const SCAN_TAB_KEY = "xhsCollectionScanTabV1";
const SCAN_COOLDOWN_KEY = "xhsCollectionScanCooldownUntilV1";
const NOTE_TAB_KEY = "xhsCollectionReaderTabV1";
const LEGACY_KEYWORDS = {
  job: "面试,招聘,秋招,春招,校招,求职,offer,简历,实习",
  food: "美食,餐厅,探店,菜谱,咖啡,烘焙",
  travel: "旅行,旅游,酒店,民宿,景点,攻略",
  learning: "学习,读书,课程,考试,教程",
  home: "家居,装修,收纳,家具"
};
const DEFAULT_CATEGORIES = [
  { id: "job", name: "求职", color: "#6656d9", keywords: "面试,招聘,秋招,春招,校招,求职,offer,简历,实习,内推,笔试,应届,转正,面经,网申,岗位,薪资,外企" },
  { id: "food", name: "美食", color: "#f3a24e", keywords: "美食,餐厅,探店,菜谱,咖啡,烘焙,好吃,火锅,奶茶,甜品,做饭,早餐,料理,食谱,外卖,小吃,面包,蛋糕" },
  { id: "travel", name: "旅行", color: "#ef697e", keywords: "旅行,旅游,酒店,民宿,景点,机票,出行,自驾,度假,海岛,游记,签证,行程,露营" },
  { id: "learning", name: "学习", color: "#5285eb", keywords: "学习,读书,课程,考试,教程,论文,考研,考公,考证,英语,雅思,托福,单词,书单,备考,复习" },
  { id: "home", name: "家居", color: "#48b8a9", keywords: "家居,装修,收纳,家具,租房,卧室,客厅,厨房,布置,打扫,清洁,搬家,公寓" },
  { id: "career", name: "职场", color: "#9074d8", keywords: "职场,工作,上班,打工,老板,同事,加班,绩效,升职,离职,跳槽,职业规划,管理,汇报,会议,领导,部门,创业" },
  { id: "tech", name: "数码科技", color: "#3e9bb8", keywords: "数码,手机,电脑,平板,ipad,macbook,相机,耳机,软件,app,人工智能,ai工具,chatgpt,claude,编程,代码,网站,插件" },
  { id: "fashion", name: "穿搭", color: "#c98663", keywords: "穿搭,搭配,衣服,裙子,鞋子,包包,通勤装,西装,牛仔,配饰,单品,ootd,优衣库" },
  { id: "beauty", name: "美妆护肤", color: "#dc76a6", keywords: "美妆,护肤,化妆,口红,粉底,防晒,面膜,香水,发型,洗发,精华,彩妆,医美,美容,修容" },
  { id: "health", name: "健康", color: "#6bbfa9", keywords: "健康,体检,医院,医生,营养,睡眠,失眠,焦虑,抑郁,心理,养生,减肥,减脂,饮食,疾病,痛经,血糖" },
  { id: "fitness", name: "运动健身", color: "#65af6a", keywords: "健身,运动,跑步,瑜伽,普拉提,游泳,骑行,徒步,撸铁,训练,增肌,马拉松,羽毛球,篮球,网球" },
  { id: "pets", name: "宠物", color: "#d7a653", keywords: "猫咪,猫猫,小猫,猫粮,猫砂,狗狗,小狗,狗粮,宠物,养猫,养狗,铲屎,撸猫,兽医,猫舍" },
  { id: "finance", name: "理财", color: "#88b04b", keywords: "理财,基金,股票,存钱,投资,保险,预算,房贷,存款,财务,收益,银行,信用卡" },
  { id: "relations", name: "情感关系", color: "#e68988", keywords: "情感,恋爱,分手,结婚,婚姻,伴侣,相亲,约会,亲密关系,友情,社交,家庭,父母,育儿" },
  { id: "entertainment", name: "影视娱乐", color: "#8a8ad5", keywords: "电影,电视剧,综艺,追剧,动漫,漫画,音乐,演唱会,明星,小说,播客,游戏,剧集,短剧,韩剧" },
  { id: "creative", name: "摄影设计", color: "#57a5a0", keywords: "摄影,拍照,修图,设计,插画,绘画,艺术,展览,手工,剪辑,写作,文案,排版" },
  { id: "life", name: "生活日常", color: "#b39970", keywords: "日常,生活,好物,购物,开箱,省钱,清单,避坑,超市,快递,便利店,周末,仪式感,生活技巧,闲置,二手" },
  { id: "other", name: "其他", color: "#96a1b3", keywords: "" }
];
const el = id => document.getElementById(id);
const hasChrome = Boolean(globalThis.chrome?.storage?.local && globalThis.chrome?.tabs);
let notes = [];
let settings = { categories: structuredClone(DEFAULT_CATEGORIES), baselineComplete: false, taxonomyVersion: 2 };
let scanTabId = null;
let mergeQueue = Promise.resolve();
let scanAdded = 0;
let revealState = { seenIds: [], currentIds: [], excludedIds: [], mode: "shuffle" };
let annotations = [];

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function keywordMatches(text, word) {
  if (!word) return false;
  if (/^[a-z0-9]+$/i.test(word)) return new RegExp(`(^|[^a-z0-9])${word}($|[^a-z0-9])`, "i").test(text);
  return text.includes(word);
}
function classify(note) {
  for (const text of [note.title, note.author].map(value => String(value || "").toLowerCase())) {
    let best = { id: "other", score: 0 };
    for (const item of settings.categories) {
      if (item.id === "other") continue;
      const words = String(item.keywords || "").split(/[,，、\n]/).map(word => word.trim().toLowerCase()).filter(Boolean);
      const score = words.reduce((sum, word) => sum + (keywordMatches(text, word) ? Math.min(word.length, 8) : 0), 0);
      if (score > best.score) best = { id: item.id, score };
    }
    if (best.score) return best.id;
  }
  return "other";
}
async function readStore(keys) {
  if (hasChrome) return chrome.storage.local.get(keys);
  return Object.fromEntries(keys.map(key => [key, JSON.parse(localStorage.getItem(key) || "null")]));
}
async function writeStore(data) {
  if (hasChrome) return chrome.storage.local.set(data);
  for (const [key, value] of Object.entries(data)) localStorage.setItem(key, JSON.stringify(value));
}
async function save() { await writeStore({ [NOTES_KEY]: notes, [SETTINGS_KEY]: settings }); }
function migrate(oldNotes, oldSettings) {
  notes = Array.isArray(oldNotes) ? oldNotes : [];
  const upgradedTaxonomy = Boolean(oldSettings?.categories?.length && (oldSettings.taxonomyVersion || 1) < 2);
  if (oldSettings?.categories?.length) {
    settings = oldSettings;
    if (upgradedTaxonomy) {
      for (const item of settings.categories) {
        const updated = DEFAULT_CATEGORIES.find(fresh => fresh.id === item.id);
        if (updated && item.keywords === LEGACY_KEYWORDS[item.id]) item.keywords = updated.keywords;
      }
      for (const item of DEFAULT_CATEGORIES) {
        if (settings.categories.some(existing => existing.id === item.id || existing.name === item.name)) continue;
        const otherIndex = settings.categories.findIndex(existing => existing.id === "other");
        settings.categories.splice(otherIndex < 0 ? settings.categories.length : otherIndex, 0, structuredClone(item));
      }
      settings.taxonomyVersion = 2;
    }
  } else {
    const names = new Set(notes.map(note => note.category).filter(Boolean));
    for (const name of names) {
      if (settings.categories.some(item => item.name === name)) continue;
      settings.categories.splice(-1, 0, { id: `legacy-${crypto.randomUUID()}`, name, color: "#8c91bc", keywords: "" });
    }
  }
  for (const note of notes) {
    if (!note.categoryId) note.categoryId = settings.categories.find(item => item.name === note.category)?.id || classify(note);
    if (!oldSettings) { note.observedDate = null; note.dateSource = "baseline"; }
  }
  if (upgradedTaxonomy) {
    for (const note of notes) if (note.categoryId === "other" && !note.manualCategory) note.categoryId = classify(note);
  }
}
async function mergeNotes(incoming) {
  const existing = new Map(notes.map(note => [note.id, note]));
  let added = 0;
  for (const raw of incoming) {
    if (!raw?.id) continue;
    if (raw.orderRunId) settings.lastOrderRunId = raw.orderRunId;
    const previous = existing.get(raw.id);
    if (previous) {
      const keepResponse = previous.source === "page-response" && raw.source === "visible-dom";
      existing.set(raw.id, { ...previous,
        title: keepResponse ? previous.title : raw.title || previous.title,
        author: keepResponse ? previous.author : raw.author || previous.author,
        url: keepResponse ? previous.url : raw.url || previous.url,
        cover: previous.cover || raw.cover,
        source: keepResponse ? previous.source : raw.source || previous.source,
        orderRunId: raw.orderRunId || previous.orderRunId,
        orderIndex: Number.isInteger(raw.orderIndex) ? raw.orderIndex : previous.orderIndex });
      continue;
    }
    existing.set(raw.id, {
      ...raw,
      categoryId: classify(raw),
      observedDate: settings.baselineComplete ? localDateKey() : null,
      dateSource: settings.baselineComplete ? "first-observed" : "baseline"
    });
    added++;
  }
  notes = [...existing.values()];
  if (!revealState.currentIds.length && notes.length) pickTen();
  await save();
  await writeStore({ [REVEAL_KEY]: revealState });
  render();
  return added;
}
function pickTen() {
  const seen = new Set(revealState.seenIds);
  const excluded = new Set(revealState.excludedIds || []);
  const remaining = notes.filter(note => !seen.has(note.id) && !excluded.has(note.id));
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  const picked = remaining.slice(0, 10);
  revealState.currentIds = picked.map(note => note.id);
  revealState.seenIds = [...seen, ...revealState.currentIds];
  revealState.mode = "shuffle";
}
async function setBlindBoxExcluded(noteId, exclude) {
  const excluded = new Set(revealState.excludedIds || []);
  if (exclude) excluded.add(noteId);
  else excluded.delete(noteId);
  revealState.excludedIds = [...excluded];
  if (exclude) {
    revealState.currentIds = revealState.currentIds.filter(id => id !== noteId);
    revealState.seenIds = revealState.seenIds.filter(id => id !== noteId);
  }
  await writeStore({ [REVEAL_KEY]: revealState });
  renderReveal();
  el("revealOpenStatus").textContent = exclude ? "已从本地盲盒移出；不会替你操作小红书收藏。" : "已恢复到盲盒，下批可再次抽到。";
}
function renderExcluded(byId) {
  const excluded = [...new Set(revealState.excludedIds || [])];
  el("excludedDetails").hidden = excluded.length === 0;
  el("excludedSummary").textContent = `已从盲盒移出 ${excluded.length} 条 · 点击管理`;
  const fragment = document.createDocumentFragment();
  for (const id of excluded) {
    const row = document.createElement("div"); row.className = "excluded-row";
    const title = document.createElement("span"); title.textContent = byId.get(id)?.title || "未命名收藏";
    const restore = document.createElement("button"); restore.type = "button"; restore.textContent = "恢复";
    restore.addEventListener("click", () => setBlindBoxExcluded(id, false).catch(error => setStatus(error.message, true)));
    row.append(title, restore); fragment.append(row);
  }
  el("excludedList").replaceChildren(fragment);
}
function renderReveal() {
  const byId = new Map(notes.map(note => [note.id, note]));
  const excluded = new Set(revealState.excludedIds || []);
  const availableCount = notes.filter(note => !excluded.has(note.id)).length;
  const knownSeen = revealState.seenIds.filter(id => byId.has(id) && !excluded.has(id)).length;
  const current = revealState.currentIds.map(id => byId.get(id)).filter(note => note && !excluded.has(note.id));
  const root = el("revealList");
  const signature = `${availableCount}:${knownSeen}|${current.map(note => `${note.id}:${note.title}:${annotations.filter(item => item.noteId === note.id).length}`).join("|")}`;
  if (root.dataset.signature !== signature) {
  const fragment = document.createDocumentFragment();
  for (const [index, note] of current.entries()) {
    const row = document.createElement("div"); row.className = "reveal-row";
    const number = document.createElement("b"); number.textContent = String(index + 1).padStart(2, "0");
    const body = document.createElement("div");
    const link = document.createElement("a"); link.href = safeNoteUrl(note.url); link.target = "_blank"; link.rel = "noopener noreferrer";
    link.textContent = note.title || "未命名收藏";
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openNoteInReaderTab(note.url).catch(error => { el("revealOpenStatus").textContent = `打开笔记失败：${error.message}`; });
    });
    body.append(link);
    const count = annotations.filter(item => item.noteId === note.id).length;
    if (count) {
      const badge = document.createElement("button"); badge.className = "note-badge";
      badge.textContent = `Notes ${count}`;
      badge.addEventListener("click", () => { switchView("notes"); const group = el(`note-group-${note.id}`); if (group) { group.open = true; group.scrollIntoView({ block: "start" }); } });
      body.append(badge);
    }
    const exclude = document.createElement("button"); exclude.type = "button"; exclude.className = "exclude-note";
    exclude.textContent = "×";
    exclude.setAttribute("aria-label", `将“${note.title || "未命名收藏"}”移出盲盒`);
    exclude.title = "从本地盲盒移出；不会取消小红书收藏";
    exclude.addEventListener("click", () => setBlindBoxExcluded(note.id, true).catch(error => setStatus(error.message, true)));
    row.append(number, body, exclude); fragment.append(row);
  }
  root.replaceChildren(fragment);
  if (!current.length) root.textContent = !notes.length ? "还没有采集到收藏。先在下方启动自动采集。" : !availableCount ? "收藏都已移出盲盒；可在下方恢复。" : knownSeen >= availableCount ? "本轮已经全部出现。点“重新洗牌”再来一轮。" : "这批已清空，点“再随机拆十条”继续。";
  root.dataset.signature = signature;
  }
  el("revealProgress").textContent = `本轮已出现 ${knownSeen} / ${availableCount}`;
  el("nextTen").disabled = !availableCount || knownSeen >= availableCount;
  el("resetTen").hidden = !availableCount || knownSeen < availableCount;
  renderExcluded(byId);
}
function switchView(view) {
  const isNotes = view === "notes";
  el("randomView").hidden = isNotes;
  el("notesView").hidden = !isNotes;
  el("randomTab").classList.toggle("active", !isNotes);
  el("notesTab").classList.toggle("active", isNotes);
  el("randomTab").setAttribute("aria-selected", String(!isNotes));
  el("notesTab").setAttribute("aria-selected", String(isNotes));
  if (isNotes) renderNotes();
}
function safeNoteUrl(url) {
  try { const parsed = new URL(url); return parsed.protocol === "https:" && parsed.hostname === "www.xiaohongshu.com" ? parsed.href : "#"; }
  catch (_) { return "#"; }
}
function exportSafeNoteUrl(url) {
  const safeUrl = safeNoteUrl(url);
  if (safeUrl === "#") return "";
  const parsed = new URL(safeUrl);
  parsed.searchParams.delete("xsec_token");
  parsed.searchParams.delete("xsec_source");
  return parsed.href;
}
function sanitizeExportRecord(record) {
  return record && typeof record === "object" ? { ...record, url: exportSafeNoteUrl(record.url) } : record;
}
async function openNoteInReaderTab(url) {
  const safeUrl = safeNoteUrl(url);
  if (safeUrl === "#") throw new Error("笔记链接无效");
  if (!hasChrome) { window.open(safeUrl, "xhs-collection-reader"); return; }
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  const stored = await readStore([NOTE_TAB_KEY]);
  const readerId = stored[NOTE_TAB_KEY];
  if (Number.isInteger(readerId)) {
    try {
      const reader = await chrome.tabs.get(readerId);
      if (reader.windowId === active?.windowId && /https:\/\/www\.xiaohongshu\.com\/(?:explore\/|discovery\/item\/)/.test(reader.url || "")) {
        await chrome.tabs.update(readerId, { url: safeUrl, active: true });
        el("revealOpenStatus").textContent = "";
        return;
      }
    } catch (_) { /* Reader tab was closed. */ }
  }
  const reader = await chrome.tabs.create({ url: safeUrl, active: true, windowId: active?.windowId });
  await writeStore({ [NOTE_TAB_KEY]: reader.id });
  el("revealOpenStatus").textContent = "";
}
async function mutateAnnotation(message) {
  if (!hasChrome) throw new Error("请在 Chrome 扩展中保存 Note");
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "保存失败");
}
function renderNotes() {
  const openGroups = new Set([...el("notesList").querySelectorAll("details[open]")].map(item => item.id));
  el("notesBadge").textContent = annotations.length ? String(annotations.length) : "";
  el("notesCount").textContent = `${annotations.length} 条`;
  const grouped = new Map();
  for (const item of annotations) {
    if (!item?.noteId) continue;
    if (!grouped.has(item.noteId)) grouped.set(item.noteId, []);
    grouped.get(item.noteId).push(item);
  }
  const groups = [...grouped.entries()].sort((a, b) => String(b[1][b[1].length - 1]?.updatedAt || "").localeCompare(String(a[1][a[1].length - 1]?.updatedAt || "")));
  const fragment = document.createDocumentFragment();
  for (const [noteId, items] of groups) {
    const note = notes.find(value => value.id === noteId);
    const title = note?.title || items[0]?.title || "未命名笔记";
    const details = document.createElement("details"); details.className = "note-group"; details.id = `note-group-${noteId}`;
    details.open = openGroups.has(details.id);
    const summary = document.createElement("summary"); summary.textContent = `${title} · ${items.length} 条`;
    const source = document.createElement("a"); source.href = safeNoteUrl(note?.url || items[0]?.url); source.target = "_blank"; source.rel = "noopener noreferrer"; source.textContent = "打开原笔记 ↗";
    details.append(summary, source);
    for (const item of items.sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))) {
      const card = document.createElement("div"); card.className = "saved-note";
      if (item.quote) { const quote = document.createElement("blockquote"); quote.textContent = item.quote; card.append(quote); }
      if (item.body) { const body = document.createElement("p"); body.textContent = item.body; card.append(body); }
      const actions = document.createElement("div"); actions.className = "saved-note-actions";
      const edit = document.createElement("button"); edit.className = "quiet"; edit.textContent = item.body ? "编辑 Note" : "写 Note";
      edit.addEventListener("click", () => {
        const input = document.createElement("textarea"); input.maxLength = 5000; input.value = item.body || ""; input.placeholder = "写下你的想法…";
        const saveButton = document.createElement("button"); saveButton.className = "secondary"; saveButton.textContent = "保存";
        saveButton.addEventListener("click", async () => {
          try { await mutateAnnotation({ type: "XHS_ANNOTATION_UPSERT", record: { ...item, body: input.value.trim() } }); el("notesStatus").textContent = "Note 已保存。"; }
          catch (error) { el("notesStatus").textContent = error.message; }
        });
        actions.replaceChildren(input, saveButton); input.focus();
      });
      const remove = document.createElement("button"); remove.className = "quiet danger"; remove.textContent = "删除";
      remove.addEventListener("click", async () => {
        if (!window.confirm("删除这条划线或 Note？")) return;
        try { await mutateAnnotation({ type: "XHS_ANNOTATION_DELETE", id: item.id }); }
        catch (error) { el("notesStatus").textContent = error.message; }
      });
      actions.append(edit, remove); card.append(actions); details.append(card);
    }
    fragment.append(details);
  }
  el("notesList").replaceChildren(fragment);
  if (!grouped.size) el("notesList").textContent = "还没有划线或 Note。打开一篇小红书笔记试试。";
}
function render() {
  renderReveal();
  renderNotes();
}
function setStatus(message, error = false) { el("backgroundStatus").textContent = message; el("backgroundStatus").className = error ? "footnote error" : "footnote"; }
function describePartialScan(prefix, stopReason) {
  if (stopReason === "batch-limit") return `${prefix}；达到本轮约 500 条保护上限，已进入 5 分钟冷却。`;
  if (stopReason === "round-limit") return `${prefix}；达到本轮 100 次滚动保护上限，已进入 5 分钟冷却。`;
  if (stopReason === "login-required") return `${prefix}；检测到登录失效或登录提示，已立即停止。请重新登录后再试。`;
  if (stopReason === "safety-warning") return `${prefix}；检测到安全验证或访问异常，已立即停止。请先处理页面提示并至少等待 30 分钟。`;
  return `${prefix}；页面暂未继续加载，可保持此页不刷新后再次续采。`;
}
function showBackgroundStatus(state) {
  if (!state) return;
  const count = state.total || 0;
  const prefix = `已读取 ${count} 条，滚动 ${state.rounds || 0} 次`;
  const descriptions = {
    running: `${prefix}；小红书标签页正在自动加载。`,
    complete: `${prefix}；列表已返回“没有更多”，本轮完成。`,
    stopped: `${prefix}；已停止，已读内容保留。`,
    partial: describePartialScan(prefix, state.stopReason),
    error: `采集遇到问题：${state.message || "请回到收藏页重试"}`
  };
  el("backgroundStatus").textContent = descriptions[state.status] || "";
  el("quickScan").disabled = state.status === "running";
  el("stopScanButton").hidden = state.status !== "running";
}
async function scan() {
  el("quickScan").disabled = true; setStatus("正在启动自动采集…");
  try {
    if (!hasChrome) { setStatus("请在 Chrome 扩展侧边栏中扫描小红书页面"); el("quickScan").disabled = false; return; }
    const cooldown = await readStore([SCAN_COOLDOWN_KEY]);
    const remainingMs = Number(cooldown[SCAN_COOLDOWN_KEY] || 0) - Date.now();
    if (remainingMs > 0) throw new Error(`采集正在冷却，请约 ${Math.ceil(remainingMs / 60000)} 分钟后再试`);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !new URL(tab.url || "about:blank").hostname.endsWith("xiaohongshu.com") || !new URL(tab.url).pathname.startsWith("/user/profile/")) throw new Error("请先打开小红书个人主页的“收藏”标签");
    scanTabId = tab.id;
    scanAdded = 0;
    await writeStore({ [SCAN_TAB_KEY]: tab.id, [BACKGROUND_STATUS_KEY]: { status: "running", total: 0, rounds: 0 } });
    showBackgroundStatus({ status: "running" });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content-script.js"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: "MAIN", files: ["probe-main.js"] });
    const response = await chrome.tabs.sendMessage(tab.id, { type: "XHS_START_AUTO_SCAN" });
    if (response?.running) {
      el("stopScanButton").hidden = false;
      setStatus(response.started ? (response.resumed ? "已从收藏页当前滚动位置继续采集。" : "已从收藏页当前位置开始采集。") : "此页面正在采集。可点击停止。");
    } else throw new Error("未能启动采集，请刷新收藏页后重试");
  } catch (error) { el("quickScan").disabled = false; el("stopScanButton").hidden = true; setStatus(error?.message || "采集失败，请刷新页面再试", true); await writeStore({ [BACKGROUND_STATUS_KEY]: { status: "error", message: error?.message || "采集失败" } }); }
}

async function stopScan() {
  if (!scanTabId) return;
  el("stopScanButton").disabled = true;
  try { await chrome.tabs.sendMessage(scanTabId, { type: "XHS_STOP_AUTO_SCAN" }); setStatus("正在停止；已采集的数据会保留。"); }
  catch (error) { setStatus(error?.message || "停止失败", true); el("stopScanButton").disabled = false; }
}

function receiveProgress(message, sender) {
  if (sender.tab?.id !== scanTabId || !["XHS_AUTO_SCAN_PROGRESS", "XHS_AUTO_SCAN_ERROR"].includes(message?.type)) return;
  mergeQueue = mergeQueue.then(async () => {
    if (message.type === "XHS_AUTO_SCAN_ERROR") { setStatus(`采集出错：${message.message}`, true); return; }
    const added = message.notes?.length ? await mergeNotes(message.notes) : 0;
    scanAdded += added;
    const count = message.total || 0;
    const prefix = `本轮已读 ${count} 条，新增 ${scanAdded} 条，滚动 ${message.rounds || 0} 次，收到 ${message.requests || 0} 页响应`;
    if (message.status === "running") setStatus(`${prefix}；正在继续加载…`);
    else if (message.status === "complete") setStatus(`${prefix}；列表已返回“没有更多”，本轮采集完成。`);
    else if (message.status === "stopped") setStatus(`${prefix}；已停止，数据已保留。`);
    else if (message.status === "partial") setStatus(describePartialScan(prefix, message.stopReason));
    if (message.status !== "running") {
      el("quickScan").disabled = false;
      el("stopScanButton").hidden = true;
      el("stopScanButton").disabled = false;
    }
  }).catch(error => setStatus(`保存采集结果失败：${error.message}`, true));
}

async function restoreScanState() {
  if (!hasChrome) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.includes("xiaohongshu.com/user/profile/")) return;
  scanTabId = tab.id;
  let state;
  try { state = await chrome.tabs.sendMessage(tab.id, { type: "XHS_GET_AUTO_SCAN_STATE" }); }
  catch (_) { return; }
  if (state?.notes?.length) await mergeNotes(state.notes);
  if (!state?.running) return;
  el("quickScan").disabled = true;
  el("stopScanButton").hidden = false;
  setStatus(`本轮已读 ${state.total || 0} 条，滚动 ${state.rounds || 0} 次；正在继续加载…`);
}
function exportData() {
  const exportNotes = notes.map(sanitizeExportRecord);
  const exportAnnotations = annotations.map(sanitizeExportRecord);
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), notes: exportNotes, settings, annotations: exportAnnotations, revealState }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `collection-atlas-${localDateKey()}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importDataFile(file) {
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data?.notes) || !Array.isArray(data?.annotations) || !data.settings || typeof data.settings !== "object" || !Array.isArray(data.settings.categories) || !data.revealState || typeof data.revealState !== "object") {
      throw new Error("请选择插件导出的完整 JSON 备份");
    }
    const importedNotes = data.notes.filter(item => item && typeof item.id === "string" && item.id);
    const importedAnnotations = data.annotations.filter(item => item && typeof item.id === "string" && typeof item.noteId === "string" && safeNoteUrl(item.url) !== "#");
    const currentNoteIds = new Set(notes.map(item => item.id));
    const currentAnnotationIds = new Set(annotations.map(item => item.id));
    const mergedNotes = [...new Map([...importedNotes, ...notes].map(item => [item.id, item])).values()];
    const mergedAnnotations = [...new Map([...importedAnnotations, ...annotations].map(item => [item.id, item])).values()];
    const knownIds = new Set(mergedNotes.map(item => item.id));
    const mergeIds = (...lists) => [...new Set(lists.flatMap(list => Array.isArray(list) ? list : []))].filter(id => typeof id === "string" && knownIds.has(id));
    const excludedIds = mergeIds(data.revealState.excludedIds, revealState.excludedIds);
    const excludedSet = new Set(excludedIds);
    const currentIds = mergeIds(revealState.currentIds?.length ? revealState.currentIds : data.revealState.currentIds).filter(id => !excludedSet.has(id));
    const mergedReveal = { seenIds: mergeIds(data.revealState.seenIds, revealState.seenIds), currentIds, excludedIds, mode: "shuffle" };
    const mergedSettings = notes.length ? settings : data.settings;
    await writeStore({ [NOTES_KEY]: mergedNotes, [SETTINGS_KEY]: mergedSettings, [ANNOTATIONS_KEY]: mergedAnnotations, [REVEAL_KEY]: mergedReveal });
    notes = mergedNotes; settings = mergedSettings; annotations = mergedAnnotations; revealState = mergedReveal;
    render();
    el("notesStatus").textContent = `已恢复 ${importedNotes.filter(item => !currentNoteIds.has(item.id)).length} 条收藏和 ${importedAnnotations.filter(item => !currentAnnotationIds.has(item.id)).length} 条划线或 Note；已有数据已保留。`;
  } catch (error) { el("notesStatus").textContent = `恢复失败：${error.message}`; }
}
function exportNotesMarkdown() {
  const groups = new Map();
  for (const item of annotations) {
    if (!groups.has(item.noteId)) groups.set(item.noteId, []);
    groups.get(item.noteId).push(item);
  }
  const lines = ["# 我的收藏 Notes", ""];
  for (const [noteId, items] of groups) {
    const note = notes.find(value => value.id === noteId);
    const title = note?.title || items[0]?.title || "未命名笔记";
    lines.push(`## ${title.replace(/[\r\n]+/g, " ")}`, "", `原文：${exportSafeNoteUrl(note?.url || items[0]?.url)}`, "");
    for (const item of items) {
      if (item.quote) lines.push(...item.quote.split(/\r?\n/).map(line => `> ${line}`), "");
      if (item.body) lines.push(item.body, "");
      lines.push("---", "");
    }
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `collection-notes-${localDateKey()}.md`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importNotesFile(file) {
  try {
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : data.annotations;
    if (!Array.isArray(incoming)) throw new Error("请选择含 annotations 的插件 JSON 备份");
    const merged = new Map(annotations.map(item => [item.id, item]));
    let count = 0;
    for (const item of incoming) {
      if (!item || typeof item.id !== "string" || typeof item.noteId !== "string" || safeNoteUrl(item.url) === "#") continue;
      if (!merged.has(item.id)) count++;
      merged.set(item.id, { ...item, quote: String(item.quote || "").slice(0, 2000), body: String(item.body || "").slice(0, 5000) });
    }
    await writeStore({ [ANNOTATIONS_KEY]: [...merged.values()] });
    el("notesStatus").textContent = `已导入 ${count} 条新划线或 Note。`;
  } catch (error) { el("notesStatus").textContent = `导入失败：${error.message}`; }
}
async function openCurrentNoteEditor() {
  try {
    if (!hasChrome) throw new Error("请在 Chrome 扩展中使用");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/xiaohongshu\.com\/(?:explore\/|discovery\/item\/)/.test(tab.url || "")) throw new Error("请先打开一篇小红书笔记");
    let result;
    try { result = await chrome.tabs.sendMessage(tab.id, { type: "XHS_OPEN_NOTE_EDITOR" }); }
    catch (_) {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["annotation-script.js"] });
      result = await chrome.tabs.sendMessage(tab.id, { type: "XHS_OPEN_NOTE_EDITOR" });
    }
    if (!result?.opened) throw new Error(result?.error || "请刷新小红书笔记后重试");
    el("notesStatus").textContent = "已在原笔记页面打开写 Note 窗口。";
  } catch (error) { el("notesStatus").textContent = error.message; }
}
el("quickScan").addEventListener("click", scan);
el("randomTab").addEventListener("click", () => switchView("random"));
el("notesTab").addEventListener("click", () => switchView("notes"));
el("noteCurrentPage").addEventListener("click", openCurrentNoteEditor);
el("exportNotes").addEventListener("click", exportNotesMarkdown);
el("importData").addEventListener("click", () => el("importDataFile").click());
el("importDataFile").addEventListener("change", async event => { if (event.target.files?.[0]) await importDataFile(event.target.files[0]); event.target.value = ""; });
el("importNotes").addEventListener("click", () => el("importNotesFile").click());
el("importNotesFile").addEventListener("change", async event => { if (event.target.files?.[0]) await importNotesFile(event.target.files[0]); event.target.value = ""; });
el("stopScanButton").addEventListener("click", stopScan);
el("nextTen").addEventListener("click", async () => { pickTen(); await writeStore({ [REVEAL_KEY]: revealState }); renderReveal(); });
el("resetTen").addEventListener("click", async () => { revealState = { seenIds: [], currentIds: [], excludedIds: revealState.excludedIds || [], mode: "shuffle" }; pickTen(); await writeStore({ [REVEAL_KEY]: revealState }); renderReveal(); });
el("exportButton").addEventListener("click", exportData);
if (hasChrome) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[ANNOTATIONS_KEY]) { annotations = Array.isArray(changes[ANNOTATIONS_KEY].newValue) ? changes[ANNOTATIONS_KEY].newValue : []; renderReveal(); renderNotes(); }
    if (area === "local" && changes[BACKGROUND_STATUS_KEY]) showBackgroundStatus(changes[BACKGROUND_STATUS_KEY].newValue);
    if (area === "local" && changes[BACKGROUND_CACHE_KEY]) {
      const oldCache = changes[BACKGROUND_CACHE_KEY].oldValue || {};
      const newCache = changes[BACKGROUND_CACHE_KEY].newValue || {};
      const updated = Object.entries(newCache).filter(([id, note]) => JSON.stringify(note) !== JSON.stringify(oldCache[id])).map(([, note]) => note);
      if (updated.length) mergeQueue = mergeQueue.then(() => mergeNotes(updated)).catch(error => setStatus(`保存采集结果失败：${error.message}`, true));
    }
  });
}
(async () => {
  const stored = await readStore([NOTES_KEY, SETTINGS_KEY, REVEAL_KEY, BACKGROUND_CACHE_KEY, BACKGROUND_STATUS_KEY, SCAN_TAB_KEY, ANNOTATIONS_KEY]);
  migrate(stored[NOTES_KEY], stored[SETTINGS_KEY]);
  revealState = stored[REVEAL_KEY] || { seenIds: [], currentIds: [], excludedIds: [], mode: "shuffle" };
  scanTabId = Number.isInteger(stored[SCAN_TAB_KEY]) ? stored[SCAN_TAB_KEY] : null;
  if (revealState.mode !== "shuffle") revealState = { seenIds: Array.isArray(revealState.seenIds) ? revealState.seenIds : [], currentIds: [], excludedIds: Array.isArray(revealState.excludedIds) ? revealState.excludedIds : [], mode: "shuffle" };
  if (!Array.isArray(revealState.excludedIds)) revealState.excludedIds = [];
  annotations = Array.isArray(stored[ANNOTATIONS_KEY]) ? stored[ANNOTATIONS_KEY] : [];
  const existingIds = new Set(annotations.map(item => item.id));
  if (!settings.memoryNotesMigrated) {
    for (const [noteId, value] of Object.entries(settings.memoryNotes || {})) {
      const note = notes.find(item => item.id === noteId);
      const id = `legacy-memory-${noteId}`;
      if (!String(value).trim() || existingIds.has(id)) continue;
      annotations.push({ id, kind: "note", noteId, title: note?.title || "旧版笔记", url: note?.url || `https://www.xiaohongshu.com/explore/${encodeURIComponent(noteId)}`,
        quote: "", body: String(value).trim(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    settings.memoryNotesMigrated = true;
  }
  await writeStore({ [ANNOTATIONS_KEY]: annotations });
  if (stored[BACKGROUND_CACHE_KEY]) await mergeNotes(Object.values(stored[BACKGROUND_CACHE_KEY]));
  if (!revealState.currentIds.length && notes.length && revealState.seenIds.length < notes.length) pickTen();
  await save(); await writeStore({ [REVEAL_KEY]: revealState }); render();
  showBackgroundStatus(stored[BACKGROUND_STATUS_KEY]);
  if (hasChrome) {
    chrome.runtime.onMessage.addListener(receiveProgress);
    if (stored[BACKGROUND_STATUS_KEY]?.status === "running" && stored[SCAN_TAB_KEY]) {
      try { await chrome.tabs.get(stored[SCAN_TAB_KEY]); }
      catch (_) { const interrupted = { ...stored[BACKGROUND_STATUS_KEY], status: "stopped" }; await writeStore({ [BACKGROUND_STATUS_KEY]: interrupted }); showBackgroundStatus(interrupted); }
    }
  }
  await restoreScanState();
})().catch(error => setStatus(error.message, true));
