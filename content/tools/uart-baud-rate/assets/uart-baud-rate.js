// Baud Rate / UART Register Calculator (STM32 BRR + AVR UBRR)
(function () {
  "use strict";

  function parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    var cleaned = String(value).replace(/[\s,_]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function trim(n) {
    return Number(n.toPrecision(7)).toString();
  }

  function pct(actual, target) {
    return Math.abs(actual - target) / target * 100;
  }

  function hex(n, digits) {
    return "0x" + n.toString(16).toUpperCase().padStart(digits, "0");
  }

  // --- STM32 ---------------------------------------------------------
  function stm32(fck, baud, over8) {
    var raw = Math.round(over8 ? fck / baud : fck / baud);
    if (raw < 1) return null;
    var mantissa, frac, brr, actual;
    if (over8) {
      mantissa = Math.floor(raw / 8);
      frac = raw & 0x7;
      brr = (mantissa << 4) | (frac << 1);
      actual = fck / raw;
    } else {
      mantissa = Math.floor(raw / 16);
      frac = raw & 0xf;
      brr = raw;
      actual = fck / raw;
    }
    if (mantissa > 0xfff) return null; // mantissa is 12 bits
    return { mantissa: mantissa, frac: frac, brr: brr, actual: actual, error: pct(actual, baud) };
  }

  // --- AVR -------------------------------------------------------------
  function avr(fosc, baud, double) {
    var div = double ? 8 : 16;
    var ubrr = Math.round(fosc / (div * baud)) - 1;
    if (ubrr < 0) ubrr = 0;
    var actual = fosc / (div * (ubrr + 1));
    return { ubrr: ubrr, actual: actual, error: pct(actual, baud), overflow: ubrr > 4095 };
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("uart-form");
    if (!form) return;

    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var stm32Body = document.getElementById("stm32-body");
    var avrBody = document.getElementById("avr-body");
    var codeOut = document.getElementById("code-out");
    var copyBtn = document.getElementById("copy-code");

    function addRow(tbody, cells, best) {
      var tr = document.createElement("tr");
      if (best) tr.className = "best";
      tr.innerHTML = cells.map(function (c) { return "<td>" + c + "</td>"; }).join("");
      tbody.appendChild(tr);
    }

    function run() {
      hideMessage(message);

      var clock = parseNumber(form.clock.value);
      var baud = parseNumber(form.baud.value);

      if (!isFinite(clock) || clock <= 0) {
        return showMessage(message, "Enter a valid clock frequency (> 0).", "error");
      }
      if (!isFinite(baud) || baud <= 0) {
        return showMessage(message, "Enter a valid target baud rate (> 0).", "error");
      }

      var s16 = stm32(clock, baud, false);
      var s8 = stm32(clock, baud, true);
      var aNorm = avr(clock, baud, false);
      var aDbl = avr(clock, baud, true);

      if (!s16 && !s8) {
        results.hidden = true;
        return showMessage(message, "Baud rate is not reachable from this clock (mantissa overflow).", "error");
      }

      stm32Body.innerHTML = "";
      var s16Err = s16 ? s16.error : Infinity;
      var s8Err = s8 ? s8.error : Infinity;
      var stm32Best = s8Err < s16Err ? "over8" : "over16";

      if (s16) {
        addRow(stm32Body, [
          "Over-sampling 16", s16.mantissa, s16.frac, hex(s16.brr, 4),
          trim(s16.actual) + " Bd", s16.error.toPrecision(3)
        ], stm32Best === "over16");
      }
      if (s8) {
        addRow(stm32Body, [
          "Over-sampling 8", s8.mantissa, s8.frac, hex(s8.brr, 4),
          trim(s8.actual) + " Bd", s8.error.toPrecision(3)
        ], stm32Best === "over8");
      }

      avrBody.innerHTML = "";
      var avrBest = aDbl.error < aNorm.error ? "double" : "normal";
      addRow(avrBody, [
        "Normal (U2X=0)", aNorm.ubrr + (aNorm.overflow ? " \u26a0\ufe0f" : ""),
        trim(aNorm.actual) + " Bd", aNorm.error.toPrecision(3)
      ], avrBest === "normal");
      addRow(avrBody, [
        "Double speed (U2X=1)", aDbl.ubrr + (aDbl.overflow ? " \u26a0\ufe0f" : ""),
        trim(aDbl.actual) + " Bd", aDbl.error.toPrecision(3)
      ], avrBest === "double");

      var best = stm32Best === "over8" ? s8 : s16;
      var lines = [
        "/* STM32 HAL, target " + baud + " Bd from " + trim(clock) + " Hz */",
        stm32Best === "over8" ? "huartX.Init.OverSampling = UART_OVERSAMPLING_8;" : "huartX.Init.OverSampling = UART_OVERSAMPLING_16;",
        "huartX.Instance->BRR = " + hex(best.brr, 4) + ";   /* mantissa=" + best.mantissa + " frac=" + best.frac + " */",
        "",
        "/* AVR, " + (avrBest === "double" ? "double speed (UCSRnA |= (1<<U2Xn))" : "normal speed") + " */",
        "#define UBRR_VALUE " + (avrBest === "double" ? aDbl.ubrr : aNorm.ubrr)
      ];
      codeOut.textContent = lines.join("\n");

      results.hidden = false;

      if (aNorm.overflow && aDbl.overflow) {
        showMessage(message, "AVR UBRR exceeds the 12-bit register range (0\u20134095) for both modes.", "error");
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
