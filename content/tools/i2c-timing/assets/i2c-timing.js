// I2C Timing Calculator — approximate STM32 TIMINGR fields.
(function () {
  "use strict";

  var MODE_PRESETS = {
    standard: { tLow: 4700, tHigh: 4000, tRise: 1000, tFall: 300, freq: 100000 },
    fast: { tLow: 1300, tHigh: 600, tRise: 300, tFall: 300, freq: 400000 },
    fastplus: { tLow: 500, tHigh: 260, tRise: 120, tFall: 120, freq: 1000000 }
  };

  function parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    var cleaned = String(value).replace(/[\s,_]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function trim(n) {
    return Number(n.toPrecision(6)).toString();
  }

  function formatFreq(hz) {
    if (hz >= 1e6) return trim(hz / 1e6) + " MHz";
    if (hz >= 1e3) return trim(hz / 1e3) + " kHz";
    return trim(hz) + " Hz";
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function hex(n, digits) {
    return "0x" + (n >>> 0).toString(16).toUpperCase().padStart(digits, "0");
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("i2c-form");
    if (!form) return;

    var message = document.getElementById("message");
    var approxNote = document.getElementById("approx-note");
    var results = document.getElementById("results");
    var codeOut = document.getElementById("code-out");
    var copyBtn = document.getElementById("copy-code");

    function applyPreset() {
      var preset = MODE_PRESETS[form.mode.value];
      if (!preset) return;
      form.tLow.value = preset.tLow;
      form.tHigh.value = preset.tHigh;
      form.tRise.value = preset.tRise;
      form.tFall.value = preset.tFall;
    }

    function run() {
      hideMessage(message);

      var clock = parseNumber(form.clock.value);
      var tLow = parseNumber(form.tLow.value);
      var tHigh = parseNumber(form.tHigh.value);
      var tRise = parseNumber(form.tRise.value);
      var tFall = parseNumber(form.tFall.value);

      if (!isFinite(clock) || clock <= 0) {
        return showMessage(message, "Enter a valid I2C clock (> 0).", "error");
      }
      if (!isFinite(tLow) || tLow <= 0 || !isFinite(tHigh) || tHigh <= 0) {
        return showMessage(message, "Enter valid tLOW / tHIGH targets (> 0 ns).", "error");
      }
      if (!isFinite(tRise) || tRise < 0) tRise = 0;
      if (!isFinite(tFall) || tFall < 0) tFall = 0;

      var tI2cClk = 1e9 / clock; // ns per cycle

      var found = null;
      for (var presc = 0; presc <= 15; presc++) {
        var tPresc = (presc + 1) * tI2cClk;
        var scll = Math.round(tLow / tPresc) - 1;
        var sclh = Math.round(tHigh / tPresc) - 1;
        if (scll >= 0 && scll <= 255 && sclh >= 0 && sclh <= 255) {
          found = { presc: presc, tPresc: tPresc, scll: scll, sclh: sclh };
          break;
        }
      }

      if (!found) {
        results.hidden = true;
        return showMessage(message, "No PRESC value fits this clock / timing target combination.", "error");
      }

      var scldel = clamp(Math.ceil(tRise / found.tPresc) - 1, 0, 15);
      if (scldel < 0) scldel = 0;
      var sdadel = clamp(Math.ceil(tFall / found.tPresc), 0, 15);

      var actualLow = (found.scll + 1) * found.tPresc;
      var actualHigh = (found.sclh + 1) * found.tPresc;
      var actualFreq = 1e9 / (actualLow + actualHigh);

      var timingr = (found.presc << 28) | (scldel << 20) | (sdadel << 16) | (found.sclh << 8) | found.scll;

      document.getElementById("out-presc").textContent = found.presc;
      document.getElementById("out-scll").textContent = found.scll;
      document.getElementById("out-sclh").textContent = found.sclh;
      document.getElementById("out-scldel").textContent = scldel;
      document.getElementById("out-sdadel").textContent = sdadel;
      document.getElementById("out-timingr").textContent = hex(timingr, 8);
      document.getElementById("out-freq").textContent = formatFreq(actualFreq);
      document.getElementById("out-lowhigh").textContent =
        trim(actualLow) + " ns / " + trim(actualHigh) + " ns";

      codeOut.textContent = [
        "/* I2C timing, " + formatFreq(clock) + " I2CCLK, ~" + formatFreq(actualFreq) + " SCL */",
        "hi2cX.Init.Timing = " + hex(timingr, 8) + ";"
      ].join("\n");

      results.hidden = false;
      approxNote.className = "msg ok";
    }

    form.mode.addEventListener("change", function () {
      applyPreset();
      run();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });

    form.addEventListener("reset", function () {
      results.hidden = true;
      hideMessage(message);
      approxNote.className = "msg ok hidden";
      setTimeout(applyPreset, 0);
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
