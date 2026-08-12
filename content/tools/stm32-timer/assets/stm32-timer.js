// STM32 Timer Calculator
// f_update = f_timer / ((PSC + 1) * (ARR + 1))
(function () {
  "use strict";

  var MAX_ITER = 2000000; // safety cap on the PSC sweep

  function parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    var cleaned = String(value).replace(/[\s,_]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function formatFreq(hz) {
    if (hz >= 1e6) return (hz / 1e6).toPrecision(7).replace(/\.?0+$/, "") + " MHz";
    if (hz >= 1e3) return (hz / 1e3).toPrecision(7).replace(/\.?0+$/, "") + " kHz";
    return hz.toPrecision(7).replace(/\.?0+$/, "") + " Hz";
  }

  function formatPeriod(hz) {
    if (hz <= 0) return "\u2013";
    var s = 1 / hz;
    if (s >= 1) return trim(s) + " s";
    if (s >= 1e-3) return trim(s * 1e3) + " ms";
    if (s >= 1e-6) return trim(s * 1e6) + " \u00b5s";
    return trim(s * 1e9) + " ns";
  }

  function trim(n) {
    return Number(n.toPrecision(6)).toString();
  }

  function computeCcr(arr, duty) {
    // CCR for a given duty cycle. ARR+1 counts per period.
    var ccr = Math.round((arr + 1) * (duty / 100));
    if (ccr < 0) ccr = 0;
    if (ccr > arr + 1) ccr = arr + 1;
    return ccr;
  }

  function solve(params) {
    var clock = params.clock;
    var target = params.target;
    var maxCount = params.maxCount;
    var acceptedError = params.acceptedError;
    var duty = params.duty;

    var solutions = [];
    var iterations = 0;
    var truncated = false;

    for (var psc = 0; psc <= maxCount; psc++) {
      if (++iterations > MAX_ITER) {
        truncated = true;
        break;
      }
      var divisor = psc + 1;
      var idealArrPlus1 = clock / (target * divisor);

      // Once the ideal ARR+1 drops below 1, larger PSC only makes it smaller.
      if (idealArrPlus1 < 1) break;

      var candidates = [Math.floor(idealArrPlus1), Math.ceil(idealArrPlus1)];
      var seen = -1;
      for (var c = 0; c < candidates.length; c++) {
        var arrPlus1 = candidates[c];
        if (arrPlus1 === seen) continue;
        seen = arrPlus1;
        if (arrPlus1 < 1) continue;
        var arr = arrPlus1 - 1;
        if (arr > maxCount) continue;

        var actual = clock / (divisor * arrPlus1);
        var err = Math.abs(actual - target) / target * 100;
        if (err <= acceptedError + 1e-12) {
          solutions.push({
            psc: psc,
            arr: arr,
            ccr: computeCcr(arr, duty),
            freq: actual,
            error: err
          });
        }
      }
    }

    // Best = lowest error, then lower PSC (higher ARR = finer resolution).
    solutions.sort(function (a, b) {
      if (a.error !== b.error) return a.error - b.error;
      return a.psc - b.psc;
    });

    return { solutions: solutions, truncated: truncated };
  }

  function buildCode(best, params) {
    return [
      "/* STM32 timer setup (HAL) */",
      "/* Timer clock: " + formatFreq(params.clock) + ", target: " + formatFreq(params.target) + " */",
      "htimX.Init.Prescaler = " + best.psc + ";   /* PSC */",
      "htimX.Init.Period    = " + best.arr + ";   /* ARR */",
      "/* PWM compare value for " + params.duty + "% duty: */",
      "/* __HAL_TIM_SET_COMPARE(&htimX, TIM_CHANNEL_1, " + best.ccr + "); */"
    ].join("\n");
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("stm32-form");
    if (!form) return;

    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var body = document.getElementById("results-body");
    var codeOut = document.getElementById("code-out");
    var resultCount = document.getElementById("result-count");
    var copyBtn = document.getElementById("copy-code");

    function run() {
      hideMessage(message);

      var clock = parseNumber(form.clock.value);
      var target = parseNumber(form.target.value);
      var bits = parseInt(form.bits.value, 10);
      var acceptedError = parseNumber(form.error.value);
      var duty = parseNumber(form.duty.value);
      var maxResults = parseInt(parseNumber(form.maxResults.value), 10);

      if (!isFinite(clock) || clock <= 0) {
        return showMessage(message, "Enter a valid timer base clock (> 0).", "error");
      }
      if (!isFinite(target) || target <= 0) {
        return showMessage(message, "Enter a valid target frequency (> 0).", "error");
      }
      if (!isFinite(acceptedError) || acceptedError < 0) acceptedError = 0;
      if (!isFinite(duty) || duty < 0) duty = 0;
      if (duty > 100) duty = 100;

      var maxCount = Math.pow(2, bits) - 1;

      if (target > clock) {
        return showMessage(message, "Target frequency cannot exceed the timer clock.", "error");
      }

      var out = solve({
        clock: clock,
        target: target,
        maxCount: maxCount,
        acceptedError: acceptedError,
        duty: duty
      });

      if (out.solutions.length === 0) {
        results.hidden = true;
        var hint = acceptedError === 0
          ? " Try increasing the accepted error."
          : "";
        return showMessage(
          message,
          "No PSC/ARR combination found within " + acceptedError + "% error." + hint,
          "error"
        );
      }

      var solutions = out.solutions;
      var best = solutions[0];

      document.getElementById("best-psc").textContent = best.psc;
      document.getElementById("best-arr").textContent = best.arr;
      document.getElementById("best-ccr").textContent = best.ccr;
      document.getElementById("best-freq").textContent = formatFreq(best.freq);
      document.getElementById("best-period").textContent = formatPeriod(best.freq);
      document.getElementById("best-error").textContent = best.error.toPrecision(3) + " %";

      codeOut.textContent = buildCode(best, { clock: clock, target: target, duty: duty });

      var limited = maxResults >= 0 ? solutions.slice(0, maxResults) : solutions;
      body.innerHTML = "";
      limited.forEach(function (s, i) {
        var tr = document.createElement("tr");
        if (i === 0) tr.className = "best";
        tr.innerHTML =
          "<td>" + (i + 1) + "</td>" +
          "<td>" + s.psc + "</td>" +
          "<td>" + s.arr + "</td>" +
          "<td>" + s.ccr + "</td>" +
          "<td>" + trim(s.freq) + "</td>" +
          "<td>" + formatPeriod(s.freq) + "</td>" +
          "<td>" + s.error.toPrecision(3) + "</td>";
        body.appendChild(tr);
      });

      var shown = limited.length;
      var totalTxt = shown < solutions.length ? shown + " of " + solutions.length : String(solutions.length);
      resultCount.textContent = "(" + totalTxt + ")";

      results.hidden = false;

      if (out.truncated) {
        showMessage(message, "Search stopped early (very large sweep). Results may be incomplete.", "ok");
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

    // Compute once with defaults so the page is useful immediately.
    run();
  });
})();
