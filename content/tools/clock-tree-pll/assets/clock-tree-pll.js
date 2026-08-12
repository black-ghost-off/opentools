// Clock Tree / PLL Calculator — solve M/N/P/Q dividers for a target SYSCLK.
(function () {
  "use strict";

  var P_OPTIONS = [2, 4, 6, 8];
  var MAX_SOLUTIONS = 5000;

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
    return Number(n.toPrecision(7)).toString();
  }

  function bestQ(vcoOut) {
    var best = null;
    for (var q = 2; q <= 15; q++) {
      var f = vcoOut / q;
      var err = Math.abs(f - 48e6) / 48e6 * 100;
      if (!best || err < best.error) best = { q: q, freq: f, error: err };
    }
    return best;
  }

  function solve(params) {
    var input = params.input;
    var target = params.target;
    var vcoInMin = params.vcoInMin;
    var vcoInMax = params.vcoInMax;
    var vcoOutMin = params.vcoOutMin;
    var vcoOutMax = params.vcoOutMax;
    var mMax = params.mMax;
    var nMax = params.nMax;

    var solutions = [];

    for (var m = 2; m <= mMax; m++) {
      var vcoIn = input / m;
      if (vcoIn < vcoInMin || vcoIn > vcoInMax) continue;

      for (var pi = 0; pi < P_OPTIONS.length; pi++) {
        var p = P_OPTIONS[pi];
        var nIdeal = (target * p) / vcoIn;
        var candidates = [Math.floor(nIdeal), Math.ceil(nIdeal)];
        var seen = -1;
        for (var c = 0; c < candidates.length; c++) {
          var n = candidates[c];
          if (n === seen) continue;
          seen = n;
          if (n < 50 || n > nMax) continue;

          var vcoOut = vcoIn * n;
          if (vcoOut < vcoOutMin || vcoOut > vcoOutMax) continue;

          var sysclk = vcoOut / p;
          var error = Math.abs(sysclk - target) / target * 100;
          var q = bestQ(vcoOut);

          solutions.push({
            m: m, n: n, p: p, vcoIn: vcoIn, vcoOut: vcoOut,
            sysclk: sysclk, error: error, q: q
          });
          if (solutions.length > MAX_SOLUTIONS) return { solutions: solutions, truncated: true };
        }
      }
    }

    solutions.sort(function (a, b) {
      if (a.error !== b.error) return a.error - b.error;
      return Math.abs(a.vcoIn - 2e6) - Math.abs(b.vcoIn - 2e6);
    });

    return { solutions: solutions, truncated: false };
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("pll-form");
    if (!form) return;

    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var body = document.getElementById("results-body");
    var codeOut = document.getElementById("code-out");
    var resultCount = document.getElementById("result-count");
    var copyBtn = document.getElementById("copy-code");

    function run() {
      hideMessage(message);

      var input = parseNumber(form.input.value);
      var target = parseNumber(form.target.value);
      var vcoInMin = parseNumber(form.vcoInMin.value) * 1e6;
      var vcoInMax = parseNumber(form.vcoInMax.value) * 1e6;
      var vcoOutMin = parseNumber(form.vcoOutMin.value) * 1e6;
      var vcoOutMax = parseNumber(form.vcoOutMax.value) * 1e6;
      var mMax = parseInt(parseNumber(form.mMax.value), 10);
      var nMax = parseInt(parseNumber(form.nMax.value), 10);
      var maxResults = parseInt(parseNumber(form.maxResults.value), 10);

      if (!isFinite(input) || input <= 0) {
        return showMessage(message, "Enter a valid input clock (> 0).", "error");
      }
      if (!isFinite(target) || target <= 0) {
        return showMessage(message, "Enter a valid target SYSCLK (> 0).", "error");
      }
      if (!isFinite(vcoInMin) || !isFinite(vcoInMax) || vcoInMin <= 0 || vcoInMax <= vcoInMin) {
        return showMessage(message, "VCO input range is invalid.", "error");
      }
      if (!isFinite(vcoOutMin) || !isFinite(vcoOutMax) || vcoOutMin <= 0 || vcoOutMax <= vcoOutMin) {
        return showMessage(message, "VCO output range is invalid.", "error");
      }
      if (!isFinite(mMax) || mMax < 2) mMax = 63;
      if (!isFinite(nMax) || nMax < 50) nMax = 432;

      var out = solve({
        input: input, target: target,
        vcoInMin: vcoInMin, vcoInMax: vcoInMax,
        vcoOutMin: vcoOutMin, vcoOutMax: vcoOutMax,
        mMax: mMax, nMax: nMax
      });

      if (out.solutions.length === 0) {
        results.hidden = true;
        return showMessage(message, "No M/N/P combination satisfies the VCO constraints for this target.", "error");
      }

      var solutions = out.solutions;
      var best = solutions[0];

      document.getElementById("best-m").textContent = best.m;
      document.getElementById("best-n").textContent = best.n;
      document.getElementById("best-p").textContent = best.p;
      document.getElementById("best-q").textContent = best.q.q;
      document.getElementById("best-sysclk").textContent = formatFreq(best.sysclk);
      document.getElementById("best-error").textContent = best.error.toPrecision(3) + " %";
      document.getElementById("best-vco").textContent = formatFreq(best.vcoIn) + " / " + formatFreq(best.vcoOut);
      document.getElementById("best-usb").textContent = formatFreq(best.q.freq) + " (" + best.q.error.toPrecision(3) + "% err)";

      codeOut.textContent = [
        "/* PLL config for SYSCLK \u2248 " + formatFreq(best.sysclk) + " from " + formatFreq(input) + " */",
        "RCC_OscInitStruct.PLL.PLLM = " + best.m + ";",
        "RCC_OscInitStruct.PLL.PLLN = " + best.n + ";",
        "RCC_OscInitStruct.PLL.PLLP = RCC_PLLP_DIV" + best.p + ";",
        "RCC_OscInitStruct.PLL.PLLQ = " + best.q.q + ";   /* USB/SDIO \u2248 " + formatFreq(best.q.freq) + " */"
      ].join("\n");

      var maxRes = maxResults >= 0 ? maxResults : solutions.length;
      var limited = solutions.slice(0, maxRes);
      body.innerHTML = "";
      limited.forEach(function (s, i) {
        var tr = document.createElement("tr");
        if (i === 0) tr.className = "best";
        tr.innerHTML =
          "<td>" + (i + 1) + "</td>" +
          "<td>" + s.m + "</td>" +
          "<td>" + s.n + "</td>" +
          "<td>" + s.p + "</td>" +
          "<td>" + s.q.q + "</td>" +
          "<td>" + formatFreq(s.vcoIn) + "</td>" +
          "<td>" + formatFreq(s.vcoOut) + "</td>" +
          "<td>" + formatFreq(s.sysclk) + "</td>" +
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

    run();
  });
})();
