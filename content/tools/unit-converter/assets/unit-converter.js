// Ultra Unit Converter — length, mass, temperature, data rate, data size, frequency, pressure.
(function () {
  "use strict";

  // Linear categories: value_in_unit * factor = value_in_base_unit.
  var CATEGORIES = {
    length: {
      base: "m",
      units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, "in": 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, mil: 0.0000254 },
      labels: { mm: "mm", cm: "cm", m: "m", km: "km", "in": "in", ft: "ft", yd: "yd", mi: "mi", mil: "mil" },
      defaults: ["m", "ft"]
    },
    mass: {
      base: "kg",
      units: { mg: 0.000001, g: 0.001, kg: 1, oz: 0.028349523125, lb: 0.45359237, t: 1000 },
      labels: { mg: "mg", g: "g", kg: "kg", oz: "oz", lb: "lb", t: "t (metric)" },
      defaults: ["kg", "lb"]
    },
    temperature: {
      temp: true,
      units: { C: null, F: null, K: null },
      labels: { C: "°C", F: "°F", K: "K" },
      defaults: ["C", "F"]
    },
    dataRate: {
      base: "bps",
      units: { bps: 1, kbps: 1e3, Mbps: 1e6, Gbps: 1e9, Bps: 8, KBps: 8e3, MBps: 8e6, GBps: 8e9 },
      labels: { bps: "bps", kbps: "kbps", Mbps: "Mbps", Gbps: "Gbps", Bps: "B/s", KBps: "KB/s", MBps: "MB/s", GBps: "GB/s" },
      defaults: ["Mbps", "MBps"]
    },
    dataSize: {
      base: "bit",
      units: { bit: 1, byte: 8, KB: 8 * 1024, MB: 8 * Math.pow(1024, 2), GB: 8 * Math.pow(1024, 3), TB: 8 * Math.pow(1024, 4) },
      labels: { bit: "bit", byte: "byte", KB: "KB", MB: "MB", GB: "GB", TB: "TB" },
      defaults: ["MB", "GB"]
    },
    frequency: {
      base: "Hz",
      units: { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9 },
      labels: { Hz: "Hz", kHz: "kHz", MHz: "MHz", GHz: "GHz" },
      defaults: ["MHz", "GHz"]
    },
    pressure: {
      base: "Pa",
      units: { Pa: 1, kPa: 1000, bar: 100000, psi: 6894.757293168, atm: 101325 },
      labels: { Pa: "Pa", kPa: "kPa", bar: "bar", psi: "psi", atm: "atm" },
      defaults: ["bar", "psi"]
    }
  };

  function toKelvin(unit, v) {
    if (unit === "C") return v + 273.15;
    if (unit === "F") return (v - 32) * 5 / 9 + 273.15;
    return v; // K
  }
  function fromKelvin(unit, k) {
    if (unit === "C") return k - 273.15;
    if (unit === "F") return (k - 273.15) * 9 / 5 + 32;
    return k; // K
  }

  function toBase(cat, unit, value) {
    var def = CATEGORIES[cat];
    if (def.temp) return toKelvin(unit, value);
    return value * def.units[unit];
  }
  function fromBase(cat, unit, baseValue) {
    var def = CATEGORIES[cat];
    if (def.temp) return fromKelvin(unit, baseValue);
    return baseValue / def.units[unit];
  }

  function fmt(n) {
    if (!isFinite(n)) return "";
    if (n === 0) return "0";
    var abs = Math.abs(n);
    if (abs < 1e-6 || abs >= 1e12) return n.toExponential(6);
    return parseFloat(n.toPrecision(10)).toString();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var categorySel = document.getElementById("category");
    var fromValue = document.getElementById("fromValue");
    var toValue = document.getElementById("toValue");
    var fromUnit = document.getElementById("fromUnit");
    var toUnit = document.getElementById("toUnit");
    var swapBtn = document.getElementById("swapBtn");
    var message = document.getElementById("message");

    function msg(text, type) {
      message.textContent = text;
      message.className = "msg " + type;
    }
    function clearMsg() { message.className = "msg hidden"; }

    function populateUnits(cat) {
      var def = CATEGORIES[cat];
      var keys = Object.keys(def.units);
      [fromUnit, toUnit].forEach(function (sel) {
        sel.innerHTML = "";
        keys.forEach(function (k) {
          var opt = document.createElement("option");
          opt.value = k;
          opt.textContent = def.labels[k];
          sel.appendChild(opt);
        });
      });
      fromUnit.value = def.defaults[0];
      toUnit.value = def.defaults[1];
    }

    function convert(sourceInput) {
      var cat = categorySel.value;
      var srcField = sourceInput === "to" ? toValue : fromValue;
      var srcUnitSel = sourceInput === "to" ? toUnit : fromUnit;
      var dstField = sourceInput === "to" ? fromValue : toValue;
      var dstUnitSel = sourceInput === "to" ? fromUnit : toUnit;

      var raw = srcField.value.trim();
      if (raw === "") {
        dstField.value = "";
        clearMsg();
        return;
      }
      var value = Number(raw);
      if (!isFinite(value)) {
        msg("Enter a valid number.", "error");
        return;
      }
      clearMsg();
      var base = toBase(cat, srcUnitSel.value, value);
      var result = fromBase(cat, dstUnitSel.value, base);
      dstField.value = fmt(result);
    }

    categorySel.addEventListener("change", function () {
      populateUnits(categorySel.value);
      fromValue.value = "1";
      convert("from");
    });

    fromValue.addEventListener("input", function () { convert("from"); });
    toValue.addEventListener("input", function () { convert("to"); });
    fromUnit.addEventListener("change", function () { convert("from"); });
    toUnit.addEventListener("change", function () { convert("from"); });

    swapBtn.addEventListener("click", function () {
      var u = fromUnit.value; fromUnit.value = toUnit.value; toUnit.value = u;
      var v = fromValue.value; fromValue.value = toValue.value; toValue.value = v;
      convert("from");
    });

    populateUnits(categorySel.value);
    fromValue.value = "1";
    convert("from");
  });
})();
