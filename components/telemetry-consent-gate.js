// /components/telemetry-consent-gate.js
(function () {
  const cfg = window.WR_TELEMETRY_CONFIG || {};
  const consentKey = cfg.consentKey || "wr_consent_telemetry_v1";
  const formName = cfg.formName || "consented-telemetry";

  function hasConsent() {
    return localStorage.getItem(consentKey) === "accepted";
  }

  function setConsent(value) {
    localStorage.setItem(consentKey, value);
  }

  function injectHiddenFormStub() {
    if (document.getElementById("wrTelemetryForm")) return;

    const form = document.createElement("form");
    form.id = "wrTelemetryForm";
    form.setAttribute("name", formName);
    form.setAttribute("method", "POST");
    form.setAttribute("data-netlify", "true");
    form.setAttribute("netlify-honeypot", "bot-field");
    form.hidden = true;

    form.innerHTML = `
      <input type="hidden" name="form-name" value="${escapeHtml(formName)}" />
      <input type="hidden" name="bot-field" />
      <input type="hidden" name="page" />
      <input type="hidden" name="timestamp" />
      <input type="hidden" name="trigger" />
      <input type="hidden" name="fields" />
    `;

    document.body.appendChild(form);
  }

  function injectConsentGate() {
    if (document.getElementById("consentGate")) return;

    const gate = document.createElement("div");
    gate.id = "consentGate";
    gate.className = "consent-gate";
    gate.setAttribute("aria-hidden", "true");

    gate.innerHTML = `
      <div class="consent-card" role="dialog" aria-modal="true" aria-labelledby="consentTitle">
        <h2 id="consentTitle">Privacy notice</h2>
        <p class="consent-text">
          To improve onboarding, we’d like to save your selections (e.g., chosen network and options)
          when you continue. We do <strong>not</strong> collect passwords or sensitive payment data.
        </p>
        <div class="consent-actions">
          <button id="consentDecline" class="consent-btn consent-btn-ghost" type="button">Decline</button>
          <button id="consentAccept" class="consent-btn consent-btn-primary" type="button">Accept</button>
        </div>
      </div>
    `;

    document.body.appendChild(gate);

    const btnAccept = document.getElementById("consentAccept");
    const btnDecline = document.getElementById("consentDecline");

    btnAccept?.addEventListener("click", () => {
      setConsent("accepted");
      hideGate();
    });

    btnDecline?.addEventListener("click", () => {
      setConsent("declined");
      hideGate();
    });
  }

  function showGate() {
    const gate = document.getElementById("consentGate");
    if (!gate) return;
    gate.classList.add("show");
    gate.setAttribute("aria-hidden", "false");
  }

  function hideGate() {
    const gate = document.getElementById("consentGate");
    if (!gate) return;
    gate.classList.remove("show");
    gate.setAttribute("aria-hidden", "true");
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.addEventListener("load", () => {
    injectHiddenFormStub();
    injectConsentGate();
    if (!hasConsent()) showGate();
  });
})();
