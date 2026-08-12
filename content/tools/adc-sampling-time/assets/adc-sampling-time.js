// ADC Sampling Time Calculator — conversion time & sample rate.
(function () {
  "use strict";

  var SAMPLING_OPTIONS = [3, 15, 28, 56, 84, 112, 144, 480];

  function parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    var cleaned = String(value).replace(/[\s,_]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function trim(n) {
    return Number(n.toPrecision(6)).toString();
  }

  function formatTime(s) {
    if (s >= 1) return trim(s) + " s";
    if (s >= 1e-3) return trim(s * 1e3) + " ms";
    if (s >= 1e-6) return trim(s * 1e6) + " \u00b5s";
    return trim(s * 1e9) + " ns";
  }

  function formatRate(hz) {
    if (hz >= 1e6) return trim(hz / 1e6) + " Msps";
    if (hz >= 1e3) return trim(hz / 1e3) + " ksps";
    return trim(hz) + " sps";
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("adc-form");
    if (!form) return;

    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var body = document.getElementById("results-body");

    function run() {
      hideMessage(message);

      var clock = parseNumber(form.clock.value);
      var resolution = parseNumber(form.resolution.value);
      var samplingCycles = parseNumber(form.samplingCycles.value);
      var channels = parseInt(parseNumber(form.channels.value), 10);

      if (!isFinite(clock) || clock <= 0) {
        return showMessage(message, "Enter a valid ADC clock (> 0).", "error");
      }
      if (!isFinite(channels) || channels < 1) channels = 1;

      var resCycles = resolution / 2 + 0.5;
      var totalCycles = samplingCycles + resCycles;
      var tConv = totalCycles / clock;
      var rate = 1 / tConv;
      var scanTime = tConv * channels;
      var scanRate = 1 / scanTime;

      document.getElementById("out-tconv").textContent = formatTime(tConv);
      document.getElementById("out-rate").textContent = formatRate(rate);
      document.getElementById("out-scantime").textContent = formatTime(scanTime);
      document.getElementById("out-scanrate").textContent = formatRate(scanRate) + " (scans/s)";

      body.innerHTML = "";
      SAMPLING_OPTIONS.forEach(function (sc) {
        var total = sc + resCycles;
        var tc = total / clock;
        var r = 1 / tc;
        var tr = document.createElement("tr");
        if (sc === samplingCycles) tr.className = "best";
        tr.innerHTML =
          "<td>" + sc + "</td>" +
          "<td>" + total + "</td>" +
          "<td>" + formatTime(tc) + "</td>" +
          "<td>" + formatRate(r) + "</td>";
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

    run();
  });
})();
