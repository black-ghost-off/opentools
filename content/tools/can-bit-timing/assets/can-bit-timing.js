// CAN Bit Timing Calculator — BRP / TSEG1 / TSEG2 / SJW for a target bitrate + sample point.
(function () {
  "use strict";

  var MIN_NTQ = 8, MAX_NTQ = 25;
  var MAX_BRP = 1024;
  var TSEG1_MAX = 16, TSEG2_MAX = 8;

  function parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    var cleaned = String(value).replace(/[\s,_]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function trim(n) {
    return Number(n.toPrecision(7)).toString();
  }

  function formatRate(hz) {
    if (hz >= 1e6) return trim(hz / 1e6) + " Mbps";
    if (hz >= 1e3) return trim(hz / 1e3) + " kbps";
    return trim(hz) + " bps";
  }

  function splitSegments(ntq, desiredSp) {
    var rest = ntq - 1;
    var tseg1 = Math.round((desiredSp / 100) * ntq) - 1;
    if (tseg1 < 1) tseg1 = 1;
    if (tseg1 > TSEG1_MAX) tseg1 = TSEG1_MAX;
    var tseg2 = rest - tseg1;
    if (tseg2 < 1) {
      tseg2 = 1;
      tseg1 = rest - tseg2;
    }
    if (tseg2 > TSEG2_MAX) {
      tseg2 = TSEG2_MAX;
      tseg1 = rest - tseg2;
    }
    if (tseg1 < 1 || tseg1 > TSEG1_MAX) return null;
    return { tseg1: tseg1, tseg2: tseg2 };
  }

  function solve(params) {
    var clock = params.clock;
    var target = params.target;
    var desiredSp = params.desiredSp;
    var acceptedError = params.acceptedError;

    var solutions = [];

    for (var ntq = MIN_NTQ; ntq <= MAX_NTQ; ntq++) {
      var brpIdeal = clock / (target * ntq);
      var candidates = [Math.floor(brpIdeal), Math.ceil(brpIdeal)];
      var seen = -1;
      for (var c = 0; c < candidates.length; c++) {
        var brp = candidates[c];
        if (brp === seen) continue;
        seen = brp;
        if (brp < 1 || brp > MAX_BRP) continue;

        var actualBitrate = clock / (brp * ntq);
        var bitrateError = Math.abs(actualBitrate - target) / target * 100;
        if (bitrateError > acceptedError + 1e-9) continue;

        var seg = splitSegments(ntq, desiredSp);
        if (!seg) continue;

        var actualSp = (1 + seg.tseg1) / ntq * 100;
        var sjw = Math.min(4, seg.tseg2);

        solutions.push({
          brp: brp, ntq: ntq, tseg1: seg.tseg1, tseg2: seg.tseg2, sjw: sjw,
          bitrate: actualBitrate, bitrateError: bitrateError,
          samplePoint: actualSp, spError: Math.abs(actualSp - desiredSp)
        });
      }
    }

    solutions.sort(function (a, b) {
      if (a.bitrateError !== b.bitrateError) return a.bitrateError - b.bitrateError;
      return a.spError - b.spError;
    });

    return solutions;
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("can-form");
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
      var target = parseNumber(form.bitrate.value);
      var desiredSp = parseNumber(form.samplePoint.value);
      var acceptedError = parseNumber(form.error.value);
      var maxResults = parseInt(parseNumber(form.maxResults.value), 10);

      if (!isFinite(clock) || clock <= 0) {
        return showMessage(message, "Enter a valid CAN clock (> 0).", "error");
      }
      if (!isFinite(target) || target <= 0) {
        return showMessage(message, "Enter a valid target bitrate (> 0).", "error");
      }
      if (!isFinite(desiredSp) || desiredSp <= 0 || desiredSp >= 100) desiredSp = 87.5;
      if (!isFinite(acceptedError) || acceptedError < 0) acceptedError = 0.5;

      var solutions = solve({ clock: clock, target: target, desiredSp: desiredSp, acceptedError: acceptedError });

      if (solutions.length === 0) {
        results.hidden = true;
        return showMessage(message, "No BRP/segment combination hits this bitrate within " + acceptedError + "% error. Try a larger error tolerance.", "error");
      }

      var best = solutions[0];

      document.getElementById("best-brp").textContent = best.brp;
      document.getElementById("best-tseg1").textContent = best.tseg1;
      document.getElementById("best-tseg2").textContent = best.tseg2;
      document.getElementById("best-sjw").textContent = best.sjw;
      document.getElementById("best-bitrate").textContent = formatRate(best.bitrate);
      document.getElementById("best-sp").textContent = trim(best.samplePoint) + " %";

      codeOut.textContent = [
        "/* bxCAN, target " + formatRate(target) + ", sample point " + desiredSp + "% */",
        "CAN_InitStruct.Prescaler = " + best.brp + ";",
        "CAN_InitStruct.BS1 = CAN_BS1_" + best.tseg1 + "TQ;",
        "CAN_InitStruct.BS2 = CAN_BS2_" + best.tseg2 + "TQ;",
        "CAN_InitStruct.SJW = CAN_SJW_" + best.sjw + "TQ;"
      ].join("\n");

      var maxRes = maxResults >= 0 ? maxResults : solutions.length;
      var limited = solutions.slice(0, maxRes);
      body.innerHTML = "";
      limited.forEach(function (s, i) {
        var tr = document.createElement("tr");
        if (i === 0) tr.className = "best";
        tr.innerHTML =
          "<td>" + (i + 1) + "</td>" +
          "<td>" + s.brp + "</td>" +
          "<td>" + s.tseg1 + "</td>" +
          "<td>" + s.tseg2 + "</td>" +
          "<td>" + s.sjw + "</td>" +
          "<td>" + formatRate(s.bitrate) + "</td>" +
          "<td>" + s.bitrateError.toPrecision(3) + "</td>" +
          "<td>" + trim(s.samplePoint) + " %</td>";
        body.appendChild(tr);
      });

      var shown = limited.length;
      var totalTxt = shown < solutions.length ? shown + " of " + solutions.length : String(solutions.length);
      resultCount.textContent = "(" + totalTxt + ")";

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
