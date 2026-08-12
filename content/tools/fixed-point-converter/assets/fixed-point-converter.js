// Fixed-Point (Q-format) Converter — float <-> Qm.n, range/resolution.
(function () {
  "use strict";

  function parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    var cleaned = String(value).replace(/[\s,_]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function trim(n) {
    return Number(n.toPrecision(10)).toString();
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("fixed-form");
    if (!form) return;

    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var codeOut = document.getElementById("code-out");
    var copyBtn = document.getElementById("copy-code");

    function run() {
      hideMessage(message);

      var totalBits = parseInt(form.totalBits.value, 10);
      var fracBits = parseInt(parseNumber(form.fracBits.value), 10);
      var signed = form.signed.checked;
      var valueType = form.valueType.value;
      var rawInput = form.value.value.trim();

      var signBit = signed ? 1 : 0;
      var intBits = totalBits - fracBits - signBit;

      if (!isFinite(fracBits) || fracBits < 0) {
        return showMessage(message, "Fractional bits must be >= 0.", "error");
      }
      if (intBits < 0) {
        return showMessage(message, "Fractional bits (+ sign bit) exceed the total bit width.", "error");
      }

      var scale = Math.pow(2, fracBits);
      var minRaw, maxRaw;
      if (signed) {
        minRaw = -Math.pow(2, totalBits - 1);
        maxRaw = Math.pow(2, totalBits - 1) - 1;
      } else {
        minRaw = 0;
        maxRaw = Math.pow(2, totalBits) - 1;
      }
      var minFloat = minRaw / scale;
      var maxFloat = maxRaw / scale;
      var resolution = 1 / scale;

      var rawSigned, sourceFloat, clamped = false;

      if (valueType === "float") {
        sourceFloat = parseNumber(rawInput);
        if (!isFinite(sourceFloat)) {
          return showMessage(message, "Enter a valid float value.", "error");
        }
        rawSigned = Math.round(sourceFloat * scale);
      } else if (valueType === "rawDec") {
        rawSigned = parseInt(parseNumber(rawInput), 10);
        if (!isFinite(rawSigned)) {
          return showMessage(message, "Enter a valid raw integer.", "error");
        }
        sourceFloat = rawSigned / scale;
      } else {
        var cleanedHex = rawInput.replace(/^0x/i, "");
        if (!/^[0-9a-fA-F]+$/.test(cleanedHex)) {
          return showMessage(message, "Enter valid hex raw bits.", "error");
        }
        var unsignedRaw = parseInt(cleanedHex, 16);
        if (signed && unsignedRaw > maxRaw) {
          rawSigned = unsignedRaw - Math.pow(2, totalBits);
        } else {
          rawSigned = unsignedRaw;
        }
        sourceFloat = rawSigned / scale;
      }

      if (rawSigned < minRaw) { rawSigned = minRaw; clamped = true; }
      if (rawSigned > maxRaw) { rawSigned = maxRaw; clamped = true; }

      var actualFloat = rawSigned / scale;
      var quantError = (valueType === "float") ? sourceFloat - actualFloat : 0;

      var rawUnsigned = rawSigned < 0 ? rawSigned + Math.pow(2, totalBits) : rawSigned;
      var hexDigits = Math.ceil(totalBits / 4);

      document.getElementById("out-format").textContent =
        "Q" + intBits + "." + fracBits + (signed ? " (signed)" : " (unsigned)") + ", " + totalBits + "-bit";
      document.getElementById("out-float").textContent = trim(actualFloat);
      document.getElementById("out-raw-dec").textContent = rawSigned.toString(10);
      document.getElementById("out-raw-hex").textContent = "0x" + rawUnsigned.toString(16).toUpperCase().padStart(hexDigits, "0");
      document.getElementById("out-raw-bin").textContent = rawUnsigned.toString(2).padStart(totalBits, "0");
      document.getElementById("out-resolution").textContent = trim(resolution);
      document.getElementById("out-range").textContent = trim(minFloat) + " \u2026 " + trim(maxFloat);
      document.getElementById("out-error").textContent = valueType === "float" ? trim(quantError) : "n/a (raw input)";

      codeOut.textContent = [
        "/* Q" + intBits + "." + fracBits + " (" + totalBits + "-bit " + (signed ? "signed" : "unsigned") + ") */",
        "#define Q_SCALE (1" + (fracBits > 0 ? " << " + fracBits : "") + ")",
        "int" + totalBits + "_t raw = " + rawSigned + ";   /* " + trim(actualFloat) + " */"
      ].join("\n");

      results.hidden = false;

      if (clamped) {
        showMessage(message, "Value was out of range and clamped to the nearest representable value.", "ok");
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });

    form.addEventListener("reset", function () {
      results.hidden = true;
      hideMessage(message);
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = codeOut.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyBtn.textContent = "Copied!";
            setTimeout(function () { copyBtn.textContent = "Copy"; }, 1500);
          });
        }
      });
    }

    run();
  });
})();
