// Lorem Ipsum Generator — words / sentences / paragraphs from a classic word bank.
(function () {
  "use strict";

  var WORDS = ("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor " +
    "incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud " +
    "exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute " +
    "irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur " +
    "excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt " +
    "mollit anim id est laborum at vero accusamus iusto odio dignissimos ducimus " +
    "blanditiis praesentium voluptatum deleniti atque corrupti quos quas molestias " +
    "excepturi sint occaecati cupiditate provident similique culpa officia").split(" ");

  var CLASSIC_OPENING = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomWord() {
    return WORDS[randInt(0, WORDS.length - 1)];
  }

  function generateWords(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(randomWord());
    return out.join(" ");
  }

  function generateSentence(minWords, maxWords) {
    var n = randInt(minWords, maxWords);
    var words = [];
    for (var i = 0; i < n; i++) words.push(randomWord());
    var s = words.join(" ");
    return s.charAt(0).toUpperCase() + s.slice(1) + ".";
  }

  function generateSentences(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(generateSentence(6, 14));
    return out.join(" ");
  }

  function generateParagraph() {
    var count = randInt(3, 7);
    var out = [];
    for (var i = 0; i < count; i++) out.push(generateSentence(6, 14));
    return out.join(" ");
  }

  function generateParagraphs(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(generateParagraph());
    return out;
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
    var unit = document.getElementById("unit");
    var count = document.getElementById("count");
    var startClassic = document.getElementById("start-classic");
    var output = document.getElementById("output");

    function generate() {
      var n = Math.max(1, Math.min(200, parseInt(count.value, 10) || 1));
      var text;

      if (unit.value === "words") {
        var words = generateWords(n).split(" ");
        if (startClassic.checked) {
          var opening = "Lorem ipsum dolor sit amet consectetur adipiscing elit".split(" ").slice(0, n);
          words = opening.concat(words).slice(0, n);
        }
        text = words.join(" ");
      } else if (unit.value === "sentences") {
        var sentences = [];
        for (var i = 0; i < n; i++) sentences.push(generateSentence(6, 14));
        if (startClassic.checked) sentences[0] = CLASSIC_OPENING;
        text = sentences.join(" ");
      } else {
        var paragraphs = generateParagraphs(n);
        if (startClassic.checked) paragraphs[0] = CLASSIC_OPENING + " " + paragraphs[0];
        text = paragraphs.join("\n\n");
      }

      output.textContent = text;
    }

    document.getElementById("generate").addEventListener("click", generate);
    document.getElementById("copy-out").addEventListener("click", function () {
      copyText(this, output.textContent);
    });

    generate();
  });
})();
