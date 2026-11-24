(() => {
  if (window.__XHS_DATE_PROBE_VERSION__ === 2) return;
  window.__XHS_DATE_PROBE_VERSION__ = 2;
  window.__XHS_DATE_PROBE__ = true;
  const matches = url => /\/note\/collect\/page(?:\?|$)/.test(String(url || ""));
  function report(data, transport) {
    try {
      const root = data?.data || data;
      const list = root?.notes || root?.items || root?.note_list || root?.feeds;
      const item = Array.isArray(list) ? list[0] : null;
      const collected = Array.isArray(list) ? list.map(raw => {
        const card = raw?.note_card || raw?.noteCard || raw || {};
        const id = String(raw?.note_id || raw?.id || card?.note_id || card?.noteId || "");
        if (!id) return null;
        const token = raw?.xsec_token || raw?.xsecToken || "";
        const cover = card.cover || {};
        const image = typeof cover === "string" ? cover : cover.url_default || cover.urlDefault || cover.info_list?.[0]?.url || cover.infoList?.[0]?.url || "";
        const user = card.user || {};
        return {
          id,
          title: String(card.display_title || card.displayTitle || card.title || "未命名收藏"),
          author: String(user.nickname || user.nick_name || user.nickName || "未知作者"),
          cover: String(image),
          url: `${location.origin}/explore/${encodeURIComponent(id)}${token ? `?xsec_token=${encodeURIComponent(token)}` : ""}`,
          source: "page-response"
        };
      }).filter(Boolean) : [];
      window.postMessage({ type: "XHS_COLLECT_BATCH_V1", origin: location.origin, notes: collected,
        hasMore: root?.has_more ?? root?.hasMore ?? null }, location.origin);
      const fields = [];
      function visit(value, path, depth) {
        if (!value || typeof value !== "object" || depth > 4) return;
        for (const [key, child] of Object.entries(value)) {
          const next = `${path}.${key}`;
          if (/time|date|timestamp/i.test(key) && ["string", "number"].includes(typeof child)) fields.push({ path: next, sample: String(child).slice(0, 50) });
          if (child && typeof child === "object" && !Array.isArray(child)) visit(child, next, depth + 1);
        }
      }
      visit(item, "item", 0);
      window.postMessage({ type: "XHS_DATE_PROBE_V1", origin: location.origin, report: {
        observedAt: new Date().toISOString(),
        endpoint: `/note/collect/page (${transport})`,
        itemCount: Array.isArray(list) ? list.length : null,
        rootKeys: root && typeof root === "object" ? Object.keys(root).slice(0, 30) : [],
        itemKeys: item && typeof item === "object" ? Object.keys(item).slice(0, 30) : [],
        timeFields: fields.slice(0, 30)
      } }, location.origin);
    } catch (_) { /* Diagnostic observation must not alter the page. */ }
  }
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__xhsProbeUrl = String(url || "");
    return originalOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    if (matches(this.__xhsProbeUrl)) this.addEventListener("loadend", () => {
      try { report(this.responseType === "json" ? this.response : JSON.parse(this.responseText), "XHR"); } catch (_) {}
    }, { once: true });
    return originalSend.apply(this, args);
  };
  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") window.fetch = function (...args) {
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url;
    const result = originalFetch.apply(this, args);
    if (matches(requestUrl)) result.then(response => response.clone().json().then(data => report(data, "fetch")).catch(() => {})).catch(() => {});
    return result;
  };
})();
