// Clipboard fallback: every tool's "Copy" button calls
// navigator.clipboard.writeText(...).then(...). That call silently does
// nothing when the page isn't in a secure context (e.g. opened via file://)
// or when the browser rejects the write (permission/focus issues) because
// none of the call sites attach a .catch(). Patch writeText here, once, so
// every existing call site gets a legacy execCommand("copy") fallback for
// free instead of duplicating this logic in every tool.
(function () {
  "use strict";

  function execCommandCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  function fallbackWriteText(text) {
    return execCommandCopy(text)
      ? Promise.resolve()
      : Promise.reject(new Error("Copy to clipboard failed"));
  }

  try {
    if (!navigator.clipboard) {
      navigator.clipboard = { writeText: fallbackWriteText };
    } else {
      var nativeWriteText = navigator.clipboard.writeText;
      navigator.clipboard.writeText = function (text) {
        if (!nativeWriteText) return fallbackWriteText(text);
        return nativeWriteText.call(navigator.clipboard, text).catch(function () {
          return fallbackWriteText(text);
        });
      };
    }
  } catch (e) {
    /* Patching navigator.clipboard isn't allowed in some environments;
       copy buttons fall back to the native (possibly no-op) behaviour. */
  }
})();

// Shared site behaviour: theme toggle with persistence.
(function () {
  "use strict";

  var STORAGE_KEY = "opentools-theme";
  var root = document.documentElement;

  function applyTheme(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }

  var stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    stored = null;
  }

  if (stored) {
    applyTheme(stored);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyTheme("dark");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var isDark = root.getAttribute("data-theme") === "dark";
      var next = isDark ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        /* ignore */
      }
    });
  });
})();
