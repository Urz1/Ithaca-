// Ithaca Extension Options Logic
document.addEventListener("DOMContentLoaded", async () => {
  const optLocal = document.getElementById("opt-local");
  const optProd = document.getElementById("opt-prod");
  const optCustom = document.getElementById("opt-custom");
  const inputCustom = document.getElementById("input-custom-url");
  const btnSave = document.getElementById("btn-save");
  const statusMsg = document.getElementById("status-msg");

  const DEFAULT_BASE = "http://localhost:3000";

  function toggleCustomInput() {
    if (optCustom.checked) {
      inputCustom.style.display = "block";
      inputCustom.focus();
    } else {
      inputCustom.style.display = "none";
    }
  }

  optLocal.addEventListener("change", toggleCustomInput);
  optProd.addEventListener("change", toggleCustomInput);
  optCustom.addEventListener("change", toggleCustomInput);

  // Load saved settings
  if (typeof chrome !== "undefined" && chrome.storage?.sync) {
    chrome.storage.sync.get({ apiBase: DEFAULT_BASE }, (items) => {
      const saved = items.apiBase || DEFAULT_BASE;
      if (saved === "http://localhost:3000") {
        optLocal.checked = true;
      } else if (saved === "https://ithaca.rhizan.com") {
        optProd.checked = true;
      } else {
        optCustom.checked = true;
        inputCustom.value = saved;
        inputCustom.style.display = "block";
      }
    });
  } else {
    optLocal.checked = true;
  }

  // Save settings
  btnSave.addEventListener("click", () => {
    let chosenBase = DEFAULT_BASE;
    if (optLocal.checked) {
      chosenBase = "http://localhost:3000";
    } else if (optProd.checked) {
      chosenBase = "https://ithaca.rhizan.com";
    } else if (optCustom.checked) {
      const val = inputCustom.value.trim().replace(/\/+$/, "");
      if (!val || (!val.startsWith("http://") && !val.startsWith("https://"))) {
        statusMsg.textContent = "Please enter a valid HTTP or HTTPS URL.";
        statusMsg.style.color = "#f87171";
        return;
      }
      chosenBase = val;
    }

    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.set({ apiBase: chosenBase }, () => {
        // Also clear active base session cache so new base takes effect immediately
        if (chrome.storage.session) {
          chrome.storage.session.remove(["activeApiBase"]);
        }
        statusMsg.textContent = `✓ Settings saved. Active endpoint: ${chosenBase}`;
        statusMsg.style.color = "#4ade80";
        setTimeout(() => {
          statusMsg.textContent = "";
        }, 3500);
      });
    } else {
      statusMsg.textContent = `✓ Active endpoint set to: ${chosenBase}`;
      statusMsg.style.color = "#4ade80";
    }
  });
});
