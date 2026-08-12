// SPI Baud Prescaler — closest achievable SPI clock from peripheral clock + prescaler.
(function () {
  "use strict";

  var PRESCALERS = [2, 4, 8, 16, 32, 64, 128, 256];

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

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("spi-form");
    if (!form) return;

    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var body = document.getElementById("results-body");
    var codeOut = document.getElementById("code-out");
    var copyBtn = document.getElementById("copy-code");

    function run() {
      hideMessage(message);

      var clock = parseNumber(form.clock.value);
      var target = parseNumber(form.target.value);
      var constraint = form.constraint.value;

      if (!isFinite(clock) || clock <= 0) {
        return showMessage(message, "Enter a valid peripheral clock (> 0).", "error");
      }
      if (!isFinite(target) || target <= 0) {
        return showMessage(message, "Enter a valid target SPI clock (> 0).", "error");
      }

      var options = PRESCALERS.map(function (p) {
        var freq = clock / p;
        return { presc: p, freq: freq, error: Math.abs(freq - target) / target * 100, over: freq > target };
      });

      var candidates = options;
      if (constraint === "notExceed") {
        var eligible = options.filter(function (o) { return o.freq <= target; });
        if (eligible.length > 0) candidates = eligible;
      }

      candidates = candidates.slice().sort(function (a, b) { return a.error - b.error; });
      var best = candidates[0];

      document.getElementById("best-presc").textContent = "/" + best.presc + " (BR=" + PRESCALERS.indexOf(best.presc) + ")";
      document.getElementById("best-freq").textContent = formatFreq(best.freq);
      document.getElementById("best-error").textContent = best.error.toPrecision(3) + " %";

      codeOut.textContent = [
        "/* STM32 HAL, target " + formatFreq(target) + " from " + formatFreq(clock) + " */",
        "hspiX.Init.BaudRatePrescaler = SPI_BAUDRATEPRESCALER_" + best.presc + ";   /* " + formatFreq(best.freq) + " actual */"
      ].join("\n");

      var sorted = options.slice().sort(function (a, b) { return a.presc - b.presc; });
      body.innerHTML = "";
      sorted.forEach(function (o) {
        var tr = document.createElement("tr");
        if (o.presc === best.presc) tr.className = "best";
        tr.innerHTML =
          "<td>/" + o.presc + "</td>" +
          "<td>" + formatFreq(o.freq) + "</td>" +
          "<td>" + o.error.toPrecision(3) + "</td>";
        body.appendChild(tr);
      });

      results.hidden = false;
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
