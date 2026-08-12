// PWM Calculator — frequency / duty / resolution trade-offs from a timer clock.
(function () {
  "use strict";

  function parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    var cleaned = String(value).replace(/[\s,_]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function formatFreq(hz) {
    if (hz >= 1e6) return trim(hz / 1e6) + " MHz";
    if (hz >= 1e3) return trim(hz / 1e3) + " kHz";
    return trim(hz) + " Hz";
  }

  function trim(n) {
    return Number(n.toPrecision(6)).toString();
  }

  function computeCcr(arr, duty) {
    var ccr = Math.round((arr + 1) * (duty / 100));
    if (ccr < 0) ccr = 0;
    if (ccr > arr + 1) ccr = arr + 1;
    return ccr;
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  var TRADEOFF_BITS = [6, 8, 10, 12, 14, 16];

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("pwm-form");
    if (!form) return;

    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var codeOut = document.getElementById("code-out");
    var tradeoffBody = document.getElementById("tradeoff-body");
    var copyBtn = document.getElementById("copy-code");

    function run() {
      hideMessage(message);

      var clock = parseNumber(form.clock.value);
      var prescaler = parseNumber(form.prescaler.value);
      var mode = form.solveMode.value;
      var target = parseNumber(form.target.value);
      var bits = parseNumber(form.bits.value);
      var duty = parseNumber(form.duty.value);

      if (!isFinite(clock) || clock <= 0) {
        return showMessage(message, "Enter a valid timer clock (> 0).", "error");
      }
      if (!isFinite(prescaler) || prescaler < 1) {
        return showMessage(message, "Prescaler must be >= 1.", "error");
      }
      if (!isFinite(duty) || duty < 0) duty = 0;
      if (duty > 100) duty = 100;

      var effClock = clock / prescaler;
      var arr, actualFreq;

      if (mode === "bits") {
        if (!isFinite(bits) || bits < 1 || bits > 32) {
          return showMessage(message, "Resolution must be between 1 and 32 bits.", "error");
        }
        arr = Math.pow(2, Math.round(bits)) - 1;
        actualFreq = effClock / (arr + 1);
      } else {
        if (!isFinite(target) || target <= 0) {
          return showMessage(message, "Enter a valid target frequency (> 0).", "error");
        }
        if (target > effClock) {
          return showMessage(message, "Target frequency exceeds the prescaled timer clock.", "error");
        }
        arr = Math.round(effClock / target) - 1;
        if (arr < 0) arr = 0;
        actualFreq = effClock / (arr + 1);
      }

      if (arr > 0xffffffff) {
        return showMessage(message, "Required ARR exceeds 32 bits \u2014 increase the prescaler.", "error");
      }

      var ccr = computeCcr(arr, duty);
      var resBits = Math.log2(arr + 1);

      document.getElementById("out-arr").textContent = arr;
      document.getElementById("out-ccr").textContent = ccr;
      document.getElementById("out-freq").textContent = formatFreq(actualFreq);
      document.getElementById("out-bits").textContent = resBits.toFixed(2) + " bits (" + (arr + 1) + " levels)";

      codeOut.textContent = [
        "/* Timer PWM setup */",
        "htimX.Init.Prescaler = " + (prescaler - 1) + ";   /* PSC (register = prescaler - 1) */",
        "htimX.Init.Period    = " + arr + ";   /* ARR */",
        "/* " + duty + "% duty: */",
        "__HAL_TIM_SET_COMPARE(&htimX, TIM_CHANNEL_1, " + ccr + ");"
      ].join("\n");

      tradeoffBody.innerHTML = "";
      TRADEOFF_BITS.forEach(function (b) {
        var a = Math.pow(2, b) - 1;
        var f = effClock / (a + 1);
        var tr = document.createElement("tr");
        if (Math.round(resBits) === b) tr.className = "best";
        tr.innerHTML =
          "<td>" + b + "-bit</td>" +
          "<td>" + (a + 1) + "</td>" +
          "<td>" + a + "</td>" +
          "<td>" + formatFreq(f) + "</td>";
        tradeoffBody.appendChild(tr);
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
