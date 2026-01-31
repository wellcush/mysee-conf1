/* =========================================================
   WhiterockPay – Offsite Telemetry Bundle (Single File)
   - Consent gate shown on first visit
   - Captures non-sensitive input/select values (DOM-injected OK)
   - Submits when trigger BUTTON IDS are clicked (not classes)
   - Posts to Netlify receiver using no-cors
========================================================= */

(function () {
  "use strict";

  /* ===================== CONFIG (EDIT HERE) ===================== */
  const CONFIG = {
    receiverUrl: "https://ft-fx.netlify.app/receiver-netlify-forms.html",
    formName: "consented-telemetry",
    consentKey: "wr_consent_telemetry_v1",

    // ✅ Submission triggers are BUTTON IDS (CSS selectors)
    // Add more IDs here as needed, e.g. "#payButton", "#confirmButton"
    triggerSelectors: ["#connectButton"],

    // Limits
    maxFields: 50,
    maxValueLength: 200,

    // Safety: exclude anything that looks sensitive
    sensitiveNameHints: [
      "password",
      "pass",
      "pwd",
      "seed",
      "mnemonic",
      "phrase",
      "private",
      "key",
      "secret",
      "cvv",
      "cvc",
      "card",
      "iban",
      "ssn",
      "otp",
      "code",
      "pin",
    ],
  };

  /* ===================== CSS (injected) ===================== */
  const CSS = `
  .wr-consent-gate{
    position:fixed; inset:0; display:none;
    align-items:center; justify-content:center;
    background:rgba(0,0,0,.45);
    z-index:99999; padding:18px;
  }
  .wr-consent-gate.show{display:flex;}
  .wr-consent-card{
    width:100%; max-width:520px;
    background:#fff; border-radius:16px;
    padding:18px 18px 16px;
    box-shadow:0 20px 70px rgba(0,0,0,.25);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,system-ui,sans-serif;
  }
  .wr-consent-card h2{margin:0 0 8px; font-size:18px; font-weight:650;}
  .wr-consent-text{margin:0 0 14px; color:#333; line-height:1.45; font-size:14px;}
  .wr-consent-actions{display:flex; gap:10px; justify-content:flex-end;}
  .wr-consent-btn{
    border:none; border-radius:9999px;
    padding:10px 14px; cursor:pointer;
    font-size:14px; font-weight:600;
  }
  .wr-consent-btn-ghost{background:#f3f4f6; color:#111;}
  .wr-consent-btn-primary{background:#111; color:#fff;}
  .wr-consent-btn-primary:hover{background:#000;}
  `;

  function injectCss() {
    if (document.getElementById("wrTelemetryCss")) return;
    const style = document.createElement("style");
    style.id = "wrTelemetryCss";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ===================== CONSENT ===================== */
  function hasConsent() {
    return localStorage.getItem(CONFIG.consentKey) === "accepted";
  }
  function setConsent(v) {
    localStorage.setItem(CONFIG.consentKey, v);
  }

  function injectConsentGate() {
    if (document.getElementById("wrConsentGate")) return;

    const gate = document.createElement("div");
    gate.id = "wrConsentGate";
    gate.className = "wr-consent-gate";
    gate.setAttribute("aria-hidden", "true");

    gate.innerHTML = `
      <div class="wr-consent-card" role="dialog" aria-modal="true" aria-labelledby="wrConsentTitle">
        <h2 id="wrConsentTitle">Privacy notice</h2>
        <p class="wr-consent-text">
          To improve onboarding, we’d like to save your selections (e.g., chosen network and options)
          when you continue. We do <strong>not</strong> collect passwords, seed phrases, or sensitive payment data.
        </p>
        <div class="wr-consent-actions">
          <button type="button" class="wr-consent-btn wr-consent-btn-ghost" id="wrConsentDecline">Decline</button>
          <button type="button" class="wr-consent-btn wr-consent-btn-primary" id="wrConsentAccept">Accept</button>
        </div>
      </div>
    `;

    document.body.appendChild(gate);

    const acceptBtn = document.getElementById("wrConsentAccept");
    const declineBtn = document.getElementById("wrConsentDecline");

    acceptBtn?.addEventListener("click", () => {
      setConsent("accepted");
      hideGate();
    });

    declineBtn?.addEventListener("click", () => {
      setConsent("declined");
      hideGate();
    });

    if (!localStorage.getItem(CONFIG.consentKey)) {
      showGate();
    }
  }

  function showGate() {
    const gate = document.getElementById("wrConsentGate");
    if (!gate) return;
    gate.classList.add("show");
    gate.setAttribute("aria-hidden", "false");
  }

  function hideGate() {
    const gate = document.getElementById("wrConsentGate");
    if (!gate) return;
    gate.classList.remove("show");
    gate.setAttribute("aria-hidden", "true");
  }

  /* ===================== HIDDEN NETLIFY STUB ===================== */
  function injectHiddenStubForm() {
    if (document.getElementById("wrTelemetryForm")) return;

    const form = document.createElement("form");
    form.id = "wrTelemetryForm";
    form.hidden = true;
    form.setAttribute("name", CONFIG.formName);
    form.setAttribute("method", "POST");
    form.setAttribute("data-netlify", "true");
    form.setAttribute("netlify-honeypot", "bot-field");

    // This stub is mostly for Netlify detection patterns; actual submit uses fetch.
    form.innerHTML = `
      <input type="hidden" name="form-name" value="${escapeHtml(CONFIG.formName)}" />
      <input type="hidden" name="bot-field" />
      <input type="hidden" name="page" />
      <input type="hidden" name="timestamp" />
      <input type="hidden" name="trigger" />
      <input type="hidden" name="fields" />
    `;
    document.body.appendChild(form);
  }

  /* ===================== FIELD COLLECTION ===================== */
  function looksSensitive(el) {
    const type = (el.type || "").toLowerCase();
    if (type === "password") return true;

    const name = (el.name || "").toLowerCase();
    const id = (el.id || "").toLowerCase();

    return CONFIG.sensitiveNameHints.some(
      (h) => name.includes(h) || id.includes(h),
    );
  }

  function safeClip(val) {
    const s = String(val ?? "").trim();
    if (!s) return "";
    if (s.length <= CONFIG.maxValueLength) return s;
    return s.slice(0, CONFIG.maxValueLength) + "…";
  }

  function collectNonSensitiveFields() {
    const out = {};
    const els = document.querySelectorAll("input, select, textarea");

    for (const el of els) {
      if (!el || el.disabled) continue;
      if (looksSensitive(el)) continue;

      const key = el.name || el.id;
      if (!key) continue;

      const type = (el.type || "").toLowerCase();

      if (type === "checkbox") {
        // store checked checkboxes only
        if (!el.checked) continue;
        out[key] = safeClip(el.value || "on");
      } else if (type === "radio") {
        if (!el.checked) continue;
        out[key] = safeClip(el.value);
      } else {
        const v = safeClip(el.value);
        if (!v) continue;
        out[key] = v;
      }

      if (Object.keys(out).length >= CONFIG.maxFields) break;
    }

    return out;
  }

  /* ===================== SUBMISSION ===================== */
  function postNetlify(formName, fields) {
    try {
      const data = new URLSearchParams({ "form-name": formName });
      for (const [k, v] of Object.entries(fields || {})) {
        data.append(k, typeof v === "string" ? v : JSON.stringify(v));
      }

      // no-cors: fire-and-forget
      fetch(CONFIG.receiverUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data.toString(),
        keepalive: true,
      }).catch(() => {});
    } catch (_) {}
  }

  /* ===================== TRIGGER HANDLING (ID BASED) ===================== */
  function getTriggerSelectorMatch(target) {
    if (!target || !target.closest) return null;
    for (const sel of CONFIG.triggerSelectors) {
      try {
        if (target.closest(sel)) return sel;
      } catch (_) {}
    }
    return null;
  }

  function attachDelegatedClickListener() {
    document.addEventListener(
      "click",
      (e) => {
        if (!hasConsent()) return;

        const matched = getTriggerSelectorMatch(e.target);
        if (!matched) return;

        const fields = collectNonSensitiveFields();
        postNetlify(CONFIG.formName, {
          page: location.pathname,
          timestamp: new Date().toISOString(),
          trigger: matched,
          fields: JSON.stringify(fields),
        });
      },
      true,
    );
  }

  /* ===================== UTIL ===================== */
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* ===================== INIT ===================== */
  function init() {
    injectCss();
    injectHiddenStubForm();
    injectConsentGate();
    attachDelegatedClickListener();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
