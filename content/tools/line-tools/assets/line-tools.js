// Line Sort / Dedupe Tool — trim, filter, dedupe, sort, shuffle, reverse lines.
(function () {
  "use strict";

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

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var input = document.getElementById("input");
    var sortMode = document.getElementById("sort-mode");
    var caseInsensitive = document.getElementById("case-insensitive");
    var trim = document.getElementById("trim");
    var removeEmpty = document.getElementById("remove-empty");
    var dedupe = document.getElementById("dedupe");
    var dedupeCi = document.getElementById("dedupe-ci");
    var reverse = document.getElementById("reverse");
    var results = document.getElementById("results");
    var output = document.getElementById("output");
    var statIn = document.getElementById("stat-in");
    var statOut = document.getElementById("stat-out");
    var statRemoved = document.getElementById("stat-removed");

    function cmp(a, b) {
      var x = caseInsensitive.checked ? a.toLowerCase() : a;
      var y = caseInsensitive.checked ? b.toLowerCase() : b;
      return x < y ? -1 : x > y ? 1 : 0;
    }

    function process(forceShuffle) {
      var lines = input.value.split(/\r?\n/);
      var inputCount = lines.length;

      if (trim.checked) lines = lines.map(function (l) { return l.trim(); });
      if (removeEmpty.checked) lines = lines.filter(function (l) { return l.trim() !== ""; });

      if (dedupe.checked) {
        var seen = new Set();
        lines = lines.filter(function (l) {
          var key = dedupeCi.checked ? l.toLowerCase() : l;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      if (forceShuffle) {
        shuffleArray(lines);
      } else {
        switch (sortMode.value) {
          case "asc": lines.sort(cmp); break;
          case "desc": lines.sort(function (a, b) { return -cmp(a, b); }); break;
          case "len-asc": lines.sort(function (a, b) { return a.length - b.length; }); break;
          case "len-desc": lines.sort(function (a, b) { return b.length - a.length; }); break;
          default: break;
        }
      }

      if (reverse.checked) lines.reverse();

      output.textContent = lines.join("\n");
      statIn.textContent = String(inputCount);
      statOut.textContent = String(lines.length);
      statRemoved.textContent = String(inputCount - lines.length);
      results.hidden = false;
    }

    document.getElementById("process").addEventListener("click", function () { process(false); });
    document.getElementById("shuffle").addEventListener("click", function () { process(true); });
    document.getElementById("copy-out").addEventListener("click", function () {
      copyText(this, output.textContent);
    });

    input.value = "banana\napple\nCherry\napple\nDate\nbanana\n";
    process(false);
  });
})();
