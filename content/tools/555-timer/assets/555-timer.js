// 555 Timer Calculator — astable and monostable modes.
(function () {
  "use strict";

  function parseSI(s) {
    if (!s || !s.trim()) return NaN;
    s = s.trim().toLowerCase();
    var m = s.match(/^([+-]?\d*\.?\d+)\s*([kmguµnpf]?)$/);
    if (!m) return NaN;
    var v = parseFloat(m[1]);
    var suf = m[2];
    var map = { k: 1e3, m: 1e-3, g: 1e9, u: 1e-6, µ: 1e-6, n: 1e-9, p: 1e-12 };
    if (suf && map[suf] !== undefined) v *= map[suf];
    return v;
  }

  function fmtHz(f) {
    if (!isFinite(f)) return "—";
    if (f >= 1e6) return (f / 1e6).toPrecision(4) + " MHz";
    if (f >= 1e3) return (f / 1e3).toPrecision(4) + " kHz";
    return f.toPrecision(4) + " Hz";
  }

  function fmtTime(s) {
    if (!isFinite(s)) return "—";
    if (s >= 1) return s.toPrecision(4) + " s";
    if (s >= 1e-3) return (s * 1e3).toPrecision(4) + " ms";
    if (s >= 1e-6) return (s * 1e6).toPrecision(4) + " µs";
    return (s * 1e9).toPrecision(4) + " ns";
  }

  function fmtR(ohm) {
    if (!isFinite(ohm)) return "—";
    if (ohm >= 1e6) return (ohm / 1e6).toPrecision(4) + " MΩ";
    if (ohm >= 1e3) return (ohm / 1e3).toPrecision(4) + " kΩ";
    return ohm.toPrecision(4) + " Ω";
  }

  function stat(label, value) {
    return '<div class="stat"><div class="label">' + label + '</div><div class="value small">' + value + '</div></div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form       = document.getElementById("timer555-form");
    var modeSel    = document.getElementById("mode555");
    var astableDiv = document.getElementById("astable-fields");
    var monoDiv    = document.getElementById("monostable-fields");
    var msg        = document.getElementById("message");
    var results    = document.getElementById("results");
    var summary    = document.getElementById("out-summary");

    modeSel.addEventListener("change", function () {
      astableDiv.hidden = modeSel.value !== "astable";
      monoDiv.hidden    = modeSel.value !== "monostable";
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.className = "msg hidden";

      if (modeSel.value === "astable") {
        var Ra = parseSI(document.getElementById("ra").value);
        var Rb = parseSI(document.getElementById("rb").value);
        var C  = parseSI(document.getElementById("c555").value);

        if ([Ra, Rb, C].some(function(x){ return isNaN(x) || x <= 0; })) {
          msg.className = "msg error"; msg.textContent = "Enter valid positive Ra, Rb, C values.";
          results.hidden = true; return;
        }

        var tHigh = 0.693 * (Ra + Rb) * C;
        var tLow  = 0.693 * Rb * C;
        var period = tHigh + tLow;
        var freq   = 1 / period;
        var duty   = tHigh / period * 100;

        summary.innerHTML =
          stat("Frequency", fmtHz(freq)) +
          stat("Period", fmtTime(period)) +
          stat("t_HIGH", fmtTime(tHigh)) +
          stat("t_LOW", fmtTime(tLow)) +
          stat("Duty cycle", duty.toPrecision(4) + " %");

        document.getElementById("out-formula").textContent =
          "t_HIGH = 0.693 × (Ra + Rb) × C\n      = " + fmtTime(tHigh) +
          "\nt_LOW  = 0.693 × Rb × C\n      = " + fmtTime(tLow) +
          "\nT = t_HIGH + t_LOW = " + fmtTime(period) +
          "\nf = 1 / T = " + fmtHz(freq) +
          "\nDuty = t_HIGH / T × 100 = " + duty.toPrecision(4) + " %\n\n" +
          "Ra=" + fmtR(Ra) + "  Rb=" + fmtR(Rb) + "  C=" + (C * 1e9).toPrecision(3) + " nF";

      } else {
        var Rm = parseSI(document.getElementById("rm").value);
        var Cm = parseSI(document.getElementById("cm").value);

        if ([Rm, Cm].some(function(x){ return isNaN(x) || x <= 0; })) {
          msg.className = "msg error"; msg.textContent = "Enter valid positive R, C values.";
          results.hidden = true; return;
        }

        var tPulse = 1.1 * Rm * Cm;

        summary.innerHTML =
          stat("Pulse width", fmtTime(tPulse)) +
          stat("R", fmtR(Rm)) +
          stat("C", (Cm * 1e6).toPrecision(3) + " µF");

        document.getElementById("out-formula").textContent =
          "t = 1.1 × R × C\n  = 1.1 × " + fmtR(Rm) + " × " + (Cm * 1e6).toPrecision(3) + " µF\n  = " + fmtTime(tPulse);
      }

      results.hidden = false;
    });

    form.addEventListener("reset", function () {
      msg.className = "msg hidden"; results.hidden = true;
    });
  });
})();
