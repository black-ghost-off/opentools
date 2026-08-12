// Case Converter — split text into words, rejoin in common naming conventions.
(function () {
  "use strict";

  function splitWords(str) {
    return str
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/([a-zA-Z])([0-9])/g, "$1 $2")
      .replace(/([0-9])([a-zA-Z])/g, "$1 $2")
      .replace(/[_\-.]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .map(function (w) { return w.toLowerCase(); });
  }

  function cap(w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }

  function camelCase(words) {
    return words.map(function (w, i) { return i === 0 ? w : cap(w); }).join("");
  }

  function pascalCase(words) {
    return words.map(cap).join("");
  }

  function titleCase(words) {
    return words.map(cap).join(" ");
  }

  function sentenceCase(words) {
    var s = words.join(" ");
    return s ? cap(s) : s;
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
    var outs = {
      camel: document.getElementById("out-camel"),
      pascal: document.getElementById("out-pascal"),
      snake: document.getElementById("out-snake"),
      constant: document.getElementById("out-constant"),
      kebab: document.getElementById("out-kebab"),
      dot: document.getElementById("out-dot"),
      title: document.getElementById("out-title"),
      sentence: document.getElementById("out-sentence"),
      lower: document.getElementById("out-lower"),
      upper: document.getElementById("out-upper")
    };

    function render() {
      var words = splitWords(input.value);
      outs.camel.textContent = camelCase(words);
      outs.pascal.textContent = pascalCase(words);
      outs.snake.textContent = words.join("_");
      outs.constant.textContent = words.join("_").toUpperCase();
      outs.kebab.textContent = words.join("-");
      outs.dot.textContent = words.join(".");
      outs.title.textContent = titleCase(words);
      outs.sentence.textContent = sentenceCase(words);
      outs.lower.textContent = words.join(" ");
      outs.upper.textContent = words.join(" ").toUpperCase();
    }

    input.addEventListener("input", render);

    document.querySelectorAll(".copy-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = document.getElementById(btn.dataset.target);
        copyText(btn, target ? target.textContent : "");
      });
    });

    input.value = "Hello World_example-text";
    render();
  });
})();
