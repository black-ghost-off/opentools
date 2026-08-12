// Word & Character Counter — live text statistics.
(function () {
  "use strict";

  function countStats(text) {
    var trimmed = text.trim();
    var words = trimmed === "" ? 0 : (trimmed.match(/\S+/g) || []).length;
    var chars = text.length;
    var charsNoSpaces = text.replace(/\s/g, "").length;
    var sentences = trimmed === "" ? 0 : (trimmed.match(/[^.!?]*[.!?]+/g) || (trimmed ? [trimmed] : [])).length;
    var paragraphs = trimmed === "" ? 0 : trimmed.split(/\n\s*\n/).filter(function (p) { return p.trim() !== ""; }).length;
    var lines = text === "" ? 0 : text.split("\n").length;
    return { words: words, chars: chars, charsNoSpaces: charsNoSpaces, sentences: sentences, paragraphs: paragraphs, lines: lines };
  }

  function formatSeconds(words, wpm) {
    var seconds = Math.ceil((words / wpm) * 60);
    if (seconds < 60) return seconds + " s";
    var min = Math.floor(seconds / 60);
    var sec = seconds % 60;
    return min + " min " + sec + " s";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var input = document.getElementById("input");
    var els = {
      words: document.getElementById("stat-words"),
      chars: document.getElementById("stat-chars"),
      charsNs: document.getElementById("stat-chars-ns"),
      sentences: document.getElementById("stat-sentences"),
      paragraphs: document.getElementById("stat-paragraphs"),
      lines: document.getElementById("stat-lines"),
      reading: document.getElementById("stat-reading"),
      speaking: document.getElementById("stat-speaking")
    };

    function render() {
      var s = countStats(input.value);
      els.words.textContent = String(s.words);
      els.chars.textContent = String(s.chars);
      els.charsNs.textContent = String(s.charsNoSpaces);
      els.sentences.textContent = String(s.sentences);
      els.paragraphs.textContent = String(s.paragraphs);
      els.lines.textContent = String(s.lines);
      els.reading.textContent = formatSeconds(s.words, 200);
      els.speaking.textContent = formatSeconds(s.words, 130);
    }

    input.addEventListener("input", render);
    input.value = "OpenTools is a collection of free, browser-based calculators for embedded and hardware engineers.\n\nEverything runs locally in your browser.";
    render();
  });
})();
