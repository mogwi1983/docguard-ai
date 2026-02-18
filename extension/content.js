(function () {
  const API_URL = "http://localhost:3001/api/analyze";

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

  function detectCondition(text) {
    const n = (text || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (/\bmdd\b|\bmajor\s+depressive\s+disorder\b/.test(n)) return "mdd";
    if (/\bchf\b|\bcongestive\s+heart\s+failure\b|\bheart\s+failure\b/.test(n)) return "chf";
    if (/\bcopd\b|\bchronic\s+obstructive\s+pulmonary\b|\bemphysema\b/.test(n)) return "copd";
    if (/\bckd\b|\bchronic\s+kidney\s+disease\b|\besrd\b|\bend\s+stage\s+renal\b/.test(n)) return "ckd";
    if (/\btype\s*2\s+diabetes\b|\bt2dm\b|\bdiabetes\s+mellitus\b|\bdiabetic\b/.test(n)) return "diabetes";
    return "auto";
  }

  function analyzeNote(text) {
    if (!text.trim()) return Promise.resolve(null);
    const conditionType = detectCondition(text);
    return fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteText: text, conditionType }),
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

  const COMPONENT_LABELS = {
    mdd: { major_keyword: '"Major" keyword (MDD)', severity: "Severity (mild / moderate / severe)", episode_type: "Episode type (single / recurrent)" },
    chf: { type: "Type (systolic/diastolic)", acuity: "Acuity (acute/chronic)" },
    copd: { severity: "Severity (GOLD 1-4)", exacerbation_status: "Exacerbation status" },
    ckd: { stage: "Stage (1-5, ESRD)" },
    diabetes: { type: "Type 2", complication: "Complication (with/without)" },
  };

  function renderResult(data) {
    const content = document.getElementById("docguard-content");
    if (!content) return;

    const present = data.presentComponents || [];
    const missing = data.missingComponents || [];
    const cond = data.conditionType || "mdd";
    const labels = COMPONENT_LABELS[cond] || COMPONENT_LABELS.mdd;
    const components = [...present, ...missing].filter((c, i, arr) => arr.indexOf(c) === i);

    const conditionTitles = { mdd: "MDD", chf: "CHF", copd: "COPD", ckd: "CKD", diabetes: "Diabetes" };
    const title = conditionTitles[cond] || "Checklist";

    let html = `
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Detected: ${title} — Checklist</div>
        ${components
          .map(
            (c) =>
              `<div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px;">
                <span style="color: ${present.includes(c) ? "#34d399" : "#f87171"}; font-weight: bold;">${present.includes(c) ? "✓" : "✕"}</span>
                <span style="color: ${present.includes(c) ? "#e2e8f0" : "#64748b"}">${labels[c] || c}</span>
              </div>`
          )
          .join("")}
      </div>
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 600; margin-bottom: 6px; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Suggested</div>
        <div style="background: #1e293b; padding: 10px; border-radius: 6px; font-size: 12px; font-family: monospace;">${data.suggestedText || "-"}</div>
        <div style="margin-top: 6px; font-size: 12px;"><code style="background: #1e293b; padding: 2px 6px; border-radius: 4px;">${data.icd10 || ""}</code></div>
      </div>
      ${(data.rafDollarImpact || 0) > 0 ? `
      <div style="margin-top: 12px; padding: 8px; background: #451a1a; border-radius: 6px; font-size: 11px; color: #fca5a5;">
        RAF impact: ~$${Math.round(data.rafDollarImpact).toLocaleString()}/patient/year if corrected
      </div>
      ` : ""}
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
            '<p style="color: #f87171;">Could not reach DocGuard API. Ensure the web app is running at localhost:3001.</p>';
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
