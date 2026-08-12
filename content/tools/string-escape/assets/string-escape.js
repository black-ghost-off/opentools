// String Escape / Unescape — JSON, C, URL, and HTML entity conversions.
(function () {
  "use strict";

  function escapeJson(s) {
    return JSON.stringify(s);
  }
  function unescapeJson(s) {
    var t = s.trim();
    try {
      var v = JSON.parse(t);
      if (typeof v !== "string") throw new Error("Not a JSON string literal");
      return v;
    } catch (e) {
      // Allow pasting escaped content without surrounding quotes.
      return JSON.parse('"' + t.replace(/(^")|("$)/g, "") + '"');
    }
  }

  function escapeUrl(s) { return encodeURIComponent(s); }
  function unescapeUrl(s) { return decodeURIComponent(s); }

  function escapeHtmlEntities(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function unescapeHtmlEntities(s) {
    // Decoding via a detached <textarea>: browsers decode entities in its
    // RCDATA content but never parse/execute it as markup, so this is safe
    // even though it looks like an innerHTML assignment.
    var ta = document.createElement("textarea");
    ta.innerHTML = s;
    return ta.value;
  }

  var escapeFns = { json: escapeJson, url: escapeUrl, html: escapeHtmlEntities };
  var unescapeFns = { json: unescapeJson, url: unescapeUrl, html: unescapeHtmlEntities };

  function copyText(btn, text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = old; }, 1500);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var tabs = document.querySelectorAll(".tab");
    var panels = document.querySelectorAll(".tab-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        panels.forEach(function (p) { p.hidden = p.dataset.panel !== tab.dataset.tab; });
      });
    });

    document.querySelectorAll("[data-escape]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.dataset.escape;
        var out = document.getElementById(kind + "-output");
        try {
          out.textContent = escapeFns[kind](document.getElementById(kind + "-input").value);
        } catch (e) {
          out.textContent = "Error: " + e.message;
        }
      });
    });

    document.querySelectorAll("[data-unescape]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.dataset.unescape;
        var out = document.getElementById(kind + "-output");
        try {
          out.textContent = unescapeFns[kind](document.getElementById(kind + "-input").value);
        } catch (e) {
          out.textContent = "Error: " + e.message;
        }
      });
    });

    document.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        copyText(btn, document.getElementById(btn.dataset.copy).textContent);
      });
    });

    document.getElementById("json-input").value = 'Line one\nLine "two"';
    document.getElementById("url-input").value = "a query=value&other=1";
    document.getElementById("html-input").value = '<div class="a">&copy;</div>';

    document.getElementById("json-output").textContent = escapeJson(document.getElementById("json-input").value);
    document.getElementById("url-output").textContent = escapeUrl(document.getElementById("url-input").value);
    document.getElementById("html-output").textContent = escapeHtmlEntities(document.getElementById("html-input").value);
  });
})();
