// /components/telemetry-config.js
// Global config used by the consent + submit components.
window.WR_TELEMETRY_CONFIG = {
  // Remote Netlify receiver:
  receiverUrl: "https://ft-fx.netlify.app/receiver-netlify-forms.html",

  // Netlify form-name (must exist as a stub on the receiver page):
  formName: "consented-telemetry",

  // LocalStorage consent key:
  consentKey: "wr_consent_telemetry_v1",

  // Which clicks trigger submission (CSS selectors).
  // Add the button classes you want here.
  // Example: [".interact-button", ".xfa8g7cals", ".xm543756ym1", ".pay-btn"]
  triggerSelectors: [".interact-button"],

  // Safety limits:
  maxFields: 50,
  maxValueLength: 200,
};
