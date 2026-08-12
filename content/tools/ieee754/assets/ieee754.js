// IEEE-754 Float Inspector — float <-> bit pattern for single/double.
(function () {
  "use strict";

  var precision = 32;

  function layout() {
    return precision === 32
      ? { bytes: 4, expBits: 8, manBits: 23, bias: 127 }
      : { bytes: 8, expBits: 11, manBits: 52, bias: 1023 };
  }

  function floatToBits(f) {
    var buf = new ArrayBuffer(8);
    var dv = new DataView(buf);
    if (precision === 32) {
      dv.setFloat32(0, f, false);
      return dv.getUint32(0, false) >>> 0;
    }
    dv.setFloat64(0, f, false);
    var hi = dv.getUint32(0, false) >>> 0;
    var lo = dv.getUint32(4, false) >>> 0;
    return (BigInt(hi) << 32n) | BigInt(lo);
  }

  function bitsToFloat(bits) {
    var buf = new ArrayBuffer(8);
    var dv = new DataView(buf);
    if (precision === 32) {
      dv.setUint32(0, Number(bits) >>> 0, false);
      return dv.getFloat32(0, false);
    }
    var b = BigInt(bits);
    dv.setUint32(0, Number((b >> 32n) & 0xFFFFFFFFn) >>> 0, false);
    dv.setUint32(4, Number(b & 0xFFFFFFFFn) >>> 0, false);
    return dv.getFloat64(0, false);
  }

  function toBig(bits) { return typeof bits === "bigint" ? bits : BigInt(bits >>> 0); }

  document.addEventListener("DOMContentLoaded", function () {
    var precSel = document.getElementById("precision");
    var floatIn = document.getElementById("floatIn");
    var hexIn = document.getElementById("hexIn");
    var message = document.getElementById("message");

    function msg(t) { message.textContent = t; message.className = "msg error"; }
    function clearMsg() { message.className = "msg hidden"; }

    function classify(f) {
      if (Number.isNaN(f)) return "NaN";
      if (f === Infinity) return "+Infinity";
      if (f === -Infinity) return "-Infinity";
      if (f === 0) return (1 / f === -Infinity) ? "Negative zero" : "Zero";
      var L = layout();
      var bits = toBig(floatToBits(f));
      var exp = (bits >> BigInt(L.manBits)) & ((1n << BigInt(L.expBits)) - 1n);
      return exp === 0n ? "Subnormal" : "Normal";
    }

    function renderFromBits(bits) {
      var L = layout();
      var big = toBig(bits);
      var totalBits = L.bytes * 8;
      var bin = big.toString(2).padStart(totalBits, "0");

      var sign = bin[0];
      var exp = bin.slice(1, 1 + L.expBits);
      var man = bin.slice(1 + L.expBits);

      document.getElementById("bits-view").innerHTML =
        '<span class="tag sign">' + sign + '</span> ' +
        '<span class="tag exp">' + exp + '</span> ' +
        '<span class="tag man">' + man + '</span>';

      var expVal = parseInt(exp, 2);
      document.getElementById("f-sign").textContent = sign + (sign === "1" ? " (−)" : " (+)");
      document.getElementById("f-exp").textContent = expVal;
      var allOnes = (1 << L.expBits) - 1;
      var actual = expVal === 0 ? (1 - L.bias) + " (denorm)"
        : expVal === allOnes ? "special"
        : (expVal - L.bias);
      document.getElementById("f-expu").textContent = actual;
      document.getElementById("f-man").textContent = "0x" + BigInt("0b" + (man || "0")).toString(16).toUpperCase();

      var f = bitsToFloat(bits);
      document.getElementById("v-stored").textContent = Number.isNaN(f) ? "NaN" : String(f);
      document.getElementById("v-hex").textContent = "0x" + big.toString(16).toUpperCase().padStart(L.bytes * 2, "0");
      document.getElementById("v-class").textContent = classify(f);

      floatIn.value = Number.isNaN(f) ? "NaN" : (f === Infinity ? "Infinity" : f === -Infinity ? "-Infinity" : String(f));
      hexIn.value = big.toString(16).toUpperCase().padStart(L.bytes * 2, "0");
    }

    function fromFloat() {
      clearMsg();
      var raw = floatIn.value.trim();
      var f;
      if (/^[-+]?inf(inity)?$/i.test(raw)) f = raw[0] === "-" ? -Infinity : Infinity;
      else if (/^nan$/i.test(raw)) f = NaN;
      else {
        f = Number(raw);
        if (raw === "" || Number.isNaN(f)) { msg("Enter a valid number."); return; }
      }
      renderFromBits(floatToBits(f));
    }

    function fromHex() {
      clearMsg();
      var L = layout();
      var s = hexIn.value.trim().toLowerCase().replace(/^0x/, "").replace(/[\s_]/g, "");
      if (s === "" || !/^[0-9a-f]+$/.test(s)) { msg("Enter a valid hex pattern."); return; }
      if (s.length > L.bytes * 2) { msg("Too many hex digits for " + precision + "-bit."); return; }
      renderFromBits(BigInt("0x" + s));
    }

    floatIn.addEventListener("input", fromFloat);
    hexIn.addEventListener("input", fromHex);
    precSel.addEventListener("change", function () {
      precision = parseInt(precSel.value, 10);
      fromFloat();
    });

    fromFloat();
  });
})();
