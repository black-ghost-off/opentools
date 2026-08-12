// Text Diff Checker — LCS-based diff, word-level or line-level.
(function () {
  "use strict";

  var MAX_CHARS = 20000;
  var MAX_CELLS = 4000000; // guard against O(n*m) blow-up

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  // Standard LCS diff over two token arrays.
  function diffArrays(a, b) {
    var n = a.length, m = b.length;
    var dp = new Array(n + 1);
    for (var i = n; i >= 0; i--) {
      dp[i] = new Array(m + 1).fill(0);
    }
    for (i = n - 1; i >= 0; i--) {
      for (var j = m - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var out = [];
    i = 0;
    var jj = 0;
    while (i < n && jj < m) {
      if (a[i] === b[jj]) {
        out.push({ type: "same", value: a[i] });
        i++; jj++;
      } else if (dp[i + 1][jj] >= dp[i][jj + 1]) {
        out.push({ type: "del", value: a[i] });
        i++;
      } else {
        out.push({ type: "add", value: b[jj] });
        jj++;
      }
    }
    while (i < n) { out.push({ type: "del", value: a[i] }); i++; }
    while (jj < m) { out.push({ type: "add", value: b[jj] }); jj++; }
    return out;
  }

  function tokenizeWords(s) {
    return s.match(/\s+|[^\s]+/g) || [];
  }

  function tokenizeLines(s) {
    return s.split("\n");
  }

  function showMessage(el, text) {
    el.textContent = text;
    el.className = "msg error";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var original = document.getElementById("original");
    var changed = document.getElementById("changed");
    var mode = document.getElementById("mode");
    var runBtn = document.getElementById("run");
    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var diffOut = document.getElementById("diff-out");
    var statAdded = document.getElementById("stat-added");
    var statRemoved = document.getElementById("stat-removed");
    var statSame = document.getElementById("stat-same");

    function run() {
      message.className = "msg hidden";
      results.hidden = true;

      var a = original.value;
      var b = changed.value;

      if (a.length > MAX_CHARS || b.length > MAX_CHARS) {
        showMessage(message, "Input too large (limit " + MAX_CHARS + " characters per box). Please shorten the text.");
        return;
      }

      var isWord = mode.value === "word";
      var ta = isWord ? tokenizeWords(a) : tokenizeLines(a);
      var tb = isWord ? tokenizeWords(b) : tokenizeLines(b);

      if (ta.length * tb.length > MAX_CELLS) {
        showMessage(message, "Too many tokens to diff efficiently. Please shorten the text or switch mode.");
        return;
      }

      var diff = diffArrays(ta, tb);
      var added = 0, removed = 0, same = 0;
      var html = "";

      if (isWord) {
        diff.forEach(function (d) {
          if (d.type === "same") { same++; html += escapeHtml(d.value); }
          else if (d.type === "add") { added++; html += '<span class="diff-add">' + escapeHtml(d.value) + "</span>"; }
          else { removed++; html += '<span class="diff-del">' + escapeHtml(d.value) + "</span>"; }
        });
      } else {
        diff.forEach(function (d) {
          if (d.type === "same") { same++; html += "<div>" + (escapeHtml(d.value) || "&nbsp;") + "</div>"; }
          else if (d.type === "add") {
            added++;
            html += '<div class="diff-line-add">+ ' + (escapeHtml(d.value) || "&nbsp;") + "</div>";
          } else {
            removed++;
            html += '<div class="diff-line-del">- ' + (escapeHtml(d.value) || "&nbsp;") + "</div>";
          }
        });
      }

      diffOut.innerHTML = html || "<em>No content.</em>";
      statAdded.textContent = String(added);
      statRemoved.textContent = String(removed);
      statSame.textContent = String(same);
      results.hidden = false;
    }

    runBtn.addEventListener("click", run);

    original.value = "The quick brown fox jumps over the lazy dog.";
    changed.value = "The quick brown fox leaps over the sleepy dog.";
    run();
  });
})();
