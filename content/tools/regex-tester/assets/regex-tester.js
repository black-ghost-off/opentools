// Regex Tester — live match highlighting, capture groups, replace preview.
(function () {
  "use strict";

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
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
    var patternInput = document.getElementById("pattern");
    var testString = document.getElementById("test-string");
    var replacement = document.getElementById("replacement");
    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var highlighted = document.getElementById("highlighted");
    var matchCount = document.getElementById("match-count");
    var groupsWrap = document.getElementById("groups-wrap");
    var groupsBody = document.getElementById("groups-body");
    var replaceOut = document.getElementById("replace-out");
    var flagIds = ["flag-g", "flag-i", "flag-m", "flag-s", "flag-u"];
    var flagChars = { "flag-g": "g", "flag-i": "i", "flag-m": "m", "flag-s": "s", "flag-u": "u" };

    function buildFlags() {
      var flags = "";
      flagIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el.checked) flags += flagChars[id];
      });
      return flags;
    }

    function run() {
      message.className = "msg hidden";
      results.hidden = true;
      replaceOut.textContent = "";

      var pattern = patternInput.value;
      var flags = buildFlags();
      var text = testString.value;

      if (pattern === "") {
        message.textContent = "Enter a regular expression pattern.";
        message.className = "msg error";
        return;
      }

      var re;
      try {
        re = new RegExp(pattern, flags);
      } catch (e) {
        message.textContent = "Invalid pattern: " + e.message;
        message.className = "msg error";
        return;
      }

      // Build highlighted output + match table.
      var html = "";
      var lastIndex = 0;
      var count = 0;
      groupsBody.innerHTML = "";

      if (flags.indexOf("g") === -1) {
        var m = re.exec(text);
        if (m) {
          html = escapeHtml(text.slice(0, m.index)) +
            '<mark>' + escapeHtml(m[0]) + "</mark>" +
            escapeHtml(text.slice(m.index + m[0].length));
          appendGroupRow(m, 0);
          count = 1;
        } else {
          html = escapeHtml(text);
        }
      } else {
        var match;
        var iterations = 0;
        while ((match = re.exec(text)) !== null) {
          html += escapeHtml(text.slice(lastIndex, match.index));
          html += '<mark>' + escapeHtml(match[0]) + "</mark>";
          lastIndex = match.index + (match[0].length || 1); // guard against zero-length match loops
          if (match[0].length === 0) re.lastIndex++;
          appendGroupRow(match, count);
          count++;
          iterations++;
          if (iterations > 5000) break; // safety guard
        }
        html += escapeHtml(text.slice(lastIndex));
      }

      highlighted.innerHTML = html || "<em>No content.</em>";
      matchCount.textContent = count + " match" + (count === 1 ? "" : "es") + ".";
      groupsWrap.hidden = count === 0;
      results.hidden = false;

      // Replace preview.
      try {
        var replaceFlags = flags.indexOf("g") === -1 ? flags + "g" : flags; // preview all occurrences
        var replaceRe = new RegExp(pattern, replaceFlags);
        replaceOut.textContent = text.replace(replaceRe, replacement.value);
      } catch (e) {
        replaceOut.textContent = "(error: " + e.message + ")";
      }
    }

    function appendGroupRow(match, idx) {
      var groups = [];
      for (var i = 1; i < match.length; i++) {
        groups.push("$" + i + " = " + (match[i] === undefined ? "(undefined)" : JSON.stringify(match[i])));
      }
      if (match.groups) {
        Object.keys(match.groups).forEach(function (name) {
          groups.push(name + " = " + JSON.stringify(match.groups[name]));
        });
      }
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (idx + 1) + "</td>" +
        '<td style="text-align:left">' + escapeHtml(match[0]) + "</td>" +
        '<td style="text-align:left">' + (groups.length ? escapeHtml(groups.join(", ")) : "&ndash;") + "</td>" +
        "<td>" + match.index + "</td>";
      groupsBody.appendChild(tr);
    }

    [patternInput, testString, replacement].forEach(function (el) {
      el.addEventListener("input", run);
    });
    flagIds.forEach(function (id) {
      document.getElementById(id).addEventListener("change", run);
    });
    document.getElementById("copy-replace").addEventListener("click", function () {
      copyText(this, replaceOut.textContent);
    });

    patternInput.value = "\\b[A-Z][a-z]+\\b";
    testString.value = "The Quick Brown Fox jumps over the Lazy Dog.";
    replacement.value = "[$&]";
    run();
  });
})();
