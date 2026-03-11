const DEFAULT_BASE_URL = "https://manuqueue--manuqueue.us-central1.hosted.app";

const baseUrlInput = document.getElementById("baseUrl");
const saveBtn = document.getElementById("saveBtn");
const openBtn = document.getElementById("openBtn");
const captureBtn = document.getElementById("captureBtn");
const statusEl = document.getElementById("status");

function setStatus(message, tone = "neutral") {
  statusEl.textContent = message;
  statusEl.classList.remove("error", "success");
  if (tone === "error") {
    statusEl.classList.add("error");
  }
  if (tone === "success") {
    statusEl.classList.add("success");
  }
}

function normalizeBaseUrl(rawValue) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    parsed.pathname = "";
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function toVendorDomain(urlString) {
  try {
    const parsed = new URL(urlString);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url) {
        reject(new Error("No active tab URL found."));
        return;
      }
      resolve(tab);
    });
  });
}

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

function storageSet(values) {
  return new Promise((resolve) => {
    chrome.storage.local.set(values, () => resolve());
  });
}

async function initialize() {
  const savedUrl = await storageGet("manuqueueBaseUrl");
  baseUrlInput.value = typeof savedUrl === "string" && savedUrl ? savedUrl : DEFAULT_BASE_URL;
}

saveBtn.addEventListener("click", async () => {
  const normalized = normalizeBaseUrl(baseUrlInput.value);
  if (!normalized) {
    setStatus("Please enter a valid http(s) ManuQueue URL.", "error");
    return;
  }

  await storageSet({ manuqueueBaseUrl: normalized });
  baseUrlInput.value = normalized;
  setStatus("Base URL saved.", "success");
});

openBtn.addEventListener("click", async () => {
  const normalized = normalizeBaseUrl(baseUrlInput.value) || DEFAULT_BASE_URL;
  chrome.tabs.create({ url: normalized });
});

captureBtn.addEventListener("click", async () => {
  const baseUrl = normalizeBaseUrl(baseUrlInput.value);
  if (!baseUrl) {
    setStatus("Set a valid ManuQueue base URL first.", "error");
    return;
  }

  captureBtn.disabled = true;
  setStatus("Capturing current tab...");

  try {
    const tab = await getActiveTab();
    const tabUrl = tab.url;
    const tabTitle = typeof tab.title === "string" ? tab.title.trim() : "";
    const vendorDomain = toVendorDomain(tabUrl);

    if (!vendorDomain) {
      throw new Error("Could not determine vendor domain from tab URL.");
    }

    const payload = {
      contractVersion: "v1",
      source: "browser-extension",
      vendorDomain,
      pageUrl: tabUrl,
      capturedAt: new Date().toISOString(),
      selectedItems: tabTitle ? [{ title: tabTitle }] : [],
    };

    const response = await fetch(`${baseUrl}/api/vendor/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        body && typeof body.error === "string"
          ? body.error
          : `Capture failed (${response.status}).`;
      if (response.status === 401 || response.status === 403) {
        setStatus(
          `${message} Open ManuQueue and login as ADMIN in this browser, then retry.`,
          "error",
        );
      } else {
        setStatus(message, "error");
      }
      return;
    }

    setStatus("Capture saved. Open New Order and click 'Use Latest Capture'.", "success");
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Capture failed.",
      "error",
    );
  } finally {
    captureBtn.disabled = false;
  }
});

void initialize();
