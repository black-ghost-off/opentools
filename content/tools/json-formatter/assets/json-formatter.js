// JSON Formatter / Validator — pretty-print, minify, validate with error location.
(function () {
  "use strict";

  function locateError(input, err) {
    var msg = err.message;
    var posMatch = msg.match(/position (\d+)/);
    if (posMatch) {
      var pos = parseInt(posMatch[1], 10);
      var line = 1, col = 1;
      for (var i = 0; i < pos && i < input.length; i++) {
        if (input[i] === "\n") { line++; col = 1; } else { col++; }
      }
      return msg + " (line " + line + ", column " + col + ")";
    }
    return msg; // some engines (Firefox) already include line/column
  }

  function byteSize(s) {
    return new TextEncoder().encode(s).length;
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
    var indentSelect = document.getElementById("indent");
    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var output = document.getElementById("output");
    var statKeys = document.getElementById("stat-keys");
    var statType = document.getElementById("stat-type");
    var statSize = document.getElementById("stat-size");

    function indentValue() {
      var v = indentSelect.value;
      return v === "tab" ? "\t" : parseInt(v, 10);
    }

    function parseOrShowError() {
      message.className = "msg hidden";
      results.hidden = true;
      try {
        return { ok: true, value: JSON.parse(input.value) };
      } catch (e) {
        message.textContent = "Invalid JSON: " + locateError(input.value, e);
        message.className = "msg error";
        return { ok: false };
      }
    }

    function showStats(value, outText) {
      var type;
      var keys = "\u2013";
      if (Array.isArray(value)) { type = "array"; keys = String(value.length) + " items"; }
      else if (value === null) { type = "null"; }
      else if (typeof value === "object") { type = "object"; keys = String(Object.keys(value).length) + " keys"; }
      else { type = typeof value; }
      statType.textContent = type;
      statKeys.textContent = keys;
      statSize.textContent = byteSize(outText) + " B";
      results.hidden = false;
    }

    function format() {
      var r = parseOrShowError();
      if (!r.ok) return;
      var text = JSON.stringify(r.value, null, indentValue());
      output.textContent = text;
      showStats(r.value, text);
      message.textContent = "Valid JSON.";
      message.className = "msg ok";
    }

    function minify() {
      var r = parseOrShowError();
      if (!r.ok) return;
      var text = JSON.stringify(r.value);
      output.textContent = text;
      showStats(r.value, text);
      message.textContent = "Valid JSON.";
      message.className = "msg ok";
    }

    function validate() {
      var r = parseOrShowError();
      if (!r.ok) return;
      output.textContent = input.value;
      showStats(r.value, input.value);
      message.textContent = "Valid JSON.";
      message.className = "msg ok";
    }

    document.getElementById("format").addEventListener("click", format);
    document.getElementById("minify").addEventListener("click", minify);
    document.getElementById("validate").addEventListener("click", validate);
    document.getElementById("copy-out").addEventListener("click", function () {
      copyText(this, output.textContent);
    });

    input.value = '{\n  "name": "OpenTools",\n  "tools": ["case-converter", "json-formatter"],\n  "active": true\n}';
    format();
  });
})();
