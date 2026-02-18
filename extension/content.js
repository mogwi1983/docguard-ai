(function () {
  const API_URL = "http://localhost:3000/api/analyze";

  let panel = null;
  let debounceTimer = null;
  const DEBOUNCE_MS = 500;

  function getActiveTextarea() {
    const active = document.activeElement;
    if (active && (active.tagName === "TEXTAREA" || active.isContentEditable)) {
      return active;
    }
    const textareas = document.querySelectorAll("textarea");
    for (const ta of textareas) {
      if (ta.offsetParent !== null && ta.value) return ta;
    }
    return null;
  }

  function getText(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA") return el.value || "";
    if (el.isContentEditable) return el.innerText || el.textContent || "";
    return "";
  }

  function analyzeNote(text) {
    if (!text.trim()) return Promise.resolve(null);
    return fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteText: text, conditionType: "mdd" }),
    })
      .then((r) => r.json())
      .catch(() => null);
  }

  function createPanel() {
    if (panel) return panel;
    const container = document.createElement("div");
    container.id = "docguard-ai-panel";
    container.innerHTML = `
      <div style="
        position: fixed;
        top: 80px;
        right: 20px;
        width: 320px;
        max-height: 80vh;
        overflow-y: auto;
        background: #0f1729;
        border: 1px solid #29375d;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        z-index: 2147483647;
        font-family: system-ui, sans-serif;
        color: #e2e8f0;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #29375d;
          background: #1b274a;
          border-radius: 12px 12px 0 0;
        ">
          <strong style="color: #fff;">DocGuard AI</strong>
          <button id="docguard-close" style="
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px;
            font-size: 18px;
            line-height: 1;
          ">×</button>
        </div>
        <div id="docguard-content" style="padding: 16px;">
          <p style="color: #94a3b8; font-size: 14px;">Paste or type clinical note in EHR, then use Ctrl+Shift+D to analyze.</p>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    panel = container;

    container.querySelector("#docguard-close").addEventListener("click", () => {
      container.style.display = "none";
    });

    return container;
  }

  function renderResult(data) {
    const content = document.getElementById("docguard-content");
    if (!content) return;

    const present = data.presentComponents || [];
    const missing = data.missingComponents || [];
    const labels = {
      major_keyword: '"Major" keyword (MDD)',
      severity: "Severity (mild / moderate / severe)",
      episode_type: "Episode type (single / recurrent)",
    };
    const components = ["major_keyword", "severity", "episode_type"];

    let html = `
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: #94a3b8; font-size: 11px; text-transform: uppercase;">MDD Checklist</div>
        ${components
          .map(
            (c) =>
              `<div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px;">
                <span style="color: ${present.includes(c) ? "#34d399" : "#f87171"}; font-weight: bold;">${present.includes(c) ? "✓" : "✕"}</span>
                <span style="color: ${present.includes(c) ? "#e2e8f0" : "#64748b"}">${labels[c]}</span>
              </div>`
          )
          .join("")}
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 600; margin-bottom: 6px; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Suggested</div>
        <div style="background: #1e293b; padding: 10px; border-radius: 6px; font-size: 12px; font-family: monospace;">${data.suggestedText || "-"}</div>
        <div style="margin-top: 6px; font-size: 12px;"><code style="background: #1e293b; padding: 2px 6px; border-radius: 4px;">${data.icd10 || ""}</code></div>
      </div>
    `;
    content.innerHTML = html;
  }

  function runAnalysis() {
    const el = getActiveTextarea();
    const text = getText(el);
    const p = createPanel();
    p.style.display = "block";
    startObserving(el);

    const content = document.getElementById("docguard-content");
    if (content) {
      content.innerHTML = '<p style="color: #94a3b8;">Analyzing...</p>';
    }

    analyzeNote(text).then((data) => {
      if (data) {
        renderResult(data);
      } else {
        if (content) {
          content.innerHTML =
            '<p style="color: #f87171;">Could not reach DocGuard API. Ensure the web app is running at localhost:3000.</p>';
        }
      }
    });
  }

  function debouncedAnalyze() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runAnalysis, DEBOUNCE_MS);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === "toggle") {
      runAnalysis();
      sendResponse({ ok: true });
    }
    return true;
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
      e.preventDefault();
      runAnalysis();
    }
  });

  let observedEl = null;
  function startObserving(el) {
    if (observedEl === el) return;
    if (observedEl) {
      observedEl.removeEventListener("input", debouncedAnalyze);
      observedEl.removeEventListener("change", debouncedAnalyze);
    }
    observedEl = el;
    if (el) {
      el.addEventListener("input", debouncedAnalyze);
      el.addEventListener("change", debouncedAnalyze);
    }
  }
  document.addEventListener("focusin", () => {
    const el = getActiveTextarea();
    startObserving(el);
  });
})();
