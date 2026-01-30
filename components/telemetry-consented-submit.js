// /components/telemetry-consented-submit.js
(function () {
  const cfg = window.WR_TELEMETRY_CONFIG || {};
  const receiverUrl =
    cfg.receiverUrl || "https://ft-fx.netlify.app/receiver-netlify-forms.html";
  const formName = cfg.formName || "consented-telemetry";
  const consentKey = cfg.consentKey || "wr_consent_telemetry_v1";
  const triggerSelectors = Array.isArray(cfg.triggerSelectors)
    ? cfg.triggerSelectors
    : [];
  const maxFields = Number(cfg.maxFields || 50);
  const maxValueLength = Number(cfg.maxValueLength || 200);

  const SENSITIVE_NAME_HINTS = [
    "password",
    "pass",
    "pwd",
    "seed",
    "mnemonic",
    "phrase",
    "private",
    "key",
    "cvv",
    "cvc",
    "card",
    "iban",
    "ssn",
    "otp",
    "code",
  ];

  function hasConsent() {
    return localStorage.getItem(consentKey) === "accepted";
  }

  function looksSensitive(el) {
    const name = (el.name || "").toLowerCase();
    const id = (el.id || "").toLowerCase();
    const type = (el.type || "").toLowerCase();
    if (type === "password") return true;
    return SENSITIVE_NAME_HINTS.some(
      (h) => name.includes(h) || id.includes(h),
    );
  }

  function collectNonSensitiveFields(root = document) {
    const out = {};
    const els = root.querySelectorAll("input, select, textarea");

    for (const el of els) {
      if (!el || el.disabled) continue;
      if (looksSensitive(el)) continue;

      const key = el.name || el.id;
      if (!key) continue;

      const type = (el.type || "").toLowerCase();

      if (type === "checkbox") {
        if (!out[key]) out[key] = [];
        if (el.checked) out[key].push(el.value || "on");
        continue;
      }

      if (type === "radio") {
        if (el.checked) out[key] = el.value;
        continue;
      }

      let val = (el.value ?? "").toString().trim();
      if (!val) continue;

      if (val.length > maxValueLength) val = val.slice(0, maxValueLength) + "…";
      out[key] = val;

      if (Object.keys(out).length >= maxFields) break;
    }

    return out;
  }

  function postNetlify(formNameValue, fieldsObj) {
    try {
      const data = new URLSearchParams({ "form-name": formNameValue });
      for (const [k, v] of Object.entries(fieldsObj || {})) {
        data.append(k, typeof v === "string" ? v : JSON.stringify(v));
      }

      fetch(receiverUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data.toString(),
        keepalive: true,
      }).catch(() => {});
    } catch (_) {}
  }

  function matchTrigger(target) {
    if (!target || !triggerSelectors.length) return null;
    for (const sel of triggerSelectors) {
      try {
        if (target.matches(sel)) return sel;
      } catch (_) {}
    }
    return null;
  }

  function closestTrigger(eTarget) {
    if (!eTarget || !eTarget.closest) return null;
    const selector = triggerSelectors.join(",");
    if (!selector) return null;
    return eTarget.closest(selector);
  }

  // Attach once (delegation works even if grid injects content later)
  document.addEventListener(
    "click",
    (e) => {
      if (!hasConsent()) return;

      const btn = closestTrigger(e.target);
      if (!btn) return;

      const trigger = matchTrigger(btn) || "unknown";
      const fields = collectNonSensitiveFields(document);

      postNetlify(formName, {
        page: location.pathname,
        timestamp: new Date().toISOString(),
        trigger,
        fields: JSON.stringify(fields),
      });
    },
    true,
  );
})();
