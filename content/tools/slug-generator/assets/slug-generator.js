// Slug Generator — Unicode-aware slugify.
(function () {
  "use strict";

  function slugify(input, sep, lowercase, maxLen) {
    var s = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    if (lowercase) s = s.toLowerCase();
    s = s.replace(/[^a-zA-Z0-9]+/g, sep);
    var escaped = sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp("^" + escaped + "+|" + escaped + "+$", "g"), "");
    s = s.replace(new RegExp(escaped + "{2,}", "g"), sep);
    if (maxLen > 0 && s.length > maxLen) {
      s = s.slice(0, maxLen).replace(new RegExp(escaped + "+$"), "");
    }
    return s;
  }

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
    var input = document.getElementById("input");
    var separator = document.getElementById("separator");
    var lowercase = document.getElementById("lowercase");
    var maxLength = document.getElementById("max-length");
    var output = document.getElementById("output");

    function render() {
      var maxLen = parseInt(maxLength.value, 10) || 0;
      output.textContent = slugify(input.value, separator.value, lowercase.checked, maxLen);
    }

    [input, separator, lowercase, maxLength].forEach(function (el) {
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    document.getElementById("copy-out").addEventListener("click", function () {
      copyText(this, output.textContent);
    });

    input.value = "Café du Monde — 10 Best Résumés!";
    render();
  });
})();
