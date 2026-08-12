// Base Converter — bin/oct/dec/hex with bit-width and two's-complement.
(function () {
  "use strict";

  function clean(str, base) {
    var s = str.trim().toLowerCase().replace(/[\s_]/g, "");
    var neg = false;
    if (s[0] === "-") { neg = true; s = s.slice(1); }
    if (base === 2 && s.startsWith("0b")) s = s.slice(2);
    if (base === 8 && s.startsWith("0o")) s = s.slice(2);
    if (base === 16 && s.startsWith("0x")) s = s.slice(2);
    return { body: s, neg: neg };
  }

  var VALID = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^[0-9]+$/,
    16: /^[0-9a-f]+$/
  };

  function parseValue(str, base) {
    var c = clean(str, base);
    if (c.body === "") return null;
    if (!VALID[base].test(c.body)) return NaN;
    var v = 0n;
    var b = BigInt(base);
    for (var i = 0; i < c.body.length; i++) {
      v = v * b + BigInt(parseInt(c.body[i], base));
    }
    return c.neg ? -v : v;
  }

  function popcount(v) {
    var n = v < 0n ? -v : v;
    var count = 0;
    while (n > 0n) { count += Number(n & 1n); n >>= 1n; }
    return count;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var inputs = Array.prototype.slice.call(document.querySelectorAll("input[data-base]"));
    var widthSel = document.getElementById("width");
    var signedSel = document.getElementById("signed");
    var message = document.getElementById("message");
    var results = document.getElementById("results");

    function msg(text, type) {
      message.textContent = text;
      message.className = "msg " + type;
    }
    function clearMsg() { message.className = "msg hidden"; }

    function widthInfo() {
      var w = parseInt(widthSel.value, 10);
      var signed = signedSel.value === "signed";
      return { w: w, signed: signed };
    }

    // Turn the entered value into the canonical stored (masked) bit pattern.
    // Bit-pattern bases (2/8/16) are raw patterns; only decimal is a signed int.
    function normalize(value, sourceBase) {
      var info = widthInfo();
      if (info.w === 0) return { stored: value, info: info, ok: true };

      var bits = BigInt(info.w);
      var mask = (1n << bits) - 1n;
      var min = -(1n << (bits - 1n));
      var max = (1n << (bits - 1n)) - 1n;

      if (sourceBase === 10) {
        // Decimal is interpreted per the chosen signedness.
        if (info.signed) {
          if (value < min || value > max) return { ok: false, info: info };
        } else {
          if (value < 0n || value > mask) return { ok: false, info: info };
        }
        return { stored: value & mask, info: info, ok: true };
      }

      // Binary / octal / hex: raw bit pattern.
      if (value < 0n) {
        // A typed negative pattern is only valid if it fits the signed range.
        if (value < min) return { ok: false, info: info };
      } else if (value > mask) {
        return { ok: false, info: info };
      }
      return { stored: value & mask, info: info, ok: true };
    }

    // Convert stored bit pattern back to a signed/unsigned display integer.
    function displayValue(stored, info) {
      if (info.w === 0 || !info.signed) return stored;
      var bits = BigInt(info.w);
      var signBit = 1n << (bits - 1n);
      if (stored & signBit) return stored - (1n << bits);
      return stored;
    }

    function render(from, value, sourceBase) {
      var norm = normalize(value, sourceBase);
      if (!norm.ok) {
        msg("Value out of range for the selected width / sign.", "error");
        results.hidden = true;
        return;
      }
      clearMsg();

      var info = norm.info;
      var stored = norm.stored;              // unsigned bit pattern
      var disp = displayValue(stored, info); // signed/unsigned integer for decimal

      var out = {
        2: stored.toString(2),
        8: stored.toString(8),
        10: disp.toString(10),
        16: stored.toString(16).toUpperCase()
      };

      inputs.forEach(function (inp) {
        var base = parseInt(inp.dataset.base, 10);
        if (inp.id === from) return;
        inp.value = out[base];
      });

      // Details
      var bitStr = stored.toString(2);
      if (info.w > 0) bitStr = bitStr.padStart(info.w, "0");
      document.getElementById("popcount").textContent = popcount(stored);
      document.getElementById("widthOut").textContent =
        info.w > 0 ? info.w + "-bit " + (info.signed ? "signed" : "unsigned") : "unbounded";

      var byteHex = stored.toString(16).toUpperCase();
      if (byteHex.length % 2) byteHex = "0" + byteHex;
      var pairs = byteHex.match(/.{2}/g) || ["00"];
      document.getElementById("bytesBE").textContent = pairs.join(" ");
      document.getElementById("bytesLE").textContent = pairs.slice().reverse().join(" ");

      // 4-bit grouping from the right
      var grouped = bitStr.split("").reverse().join("")
        .replace(/(.{4})/g, "$1 ").trim()
        .split("").reverse().join("");
      document.getElementById("binGroup").textContent = grouped;

      results.hidden = false;
    }

    function handle(e) {
      var inp = e.target;
      var base = parseInt(inp.dataset.base, 10);
      if (inp.value.trim() === "") {
        inputs.forEach(function (o) { if (o !== inp) o.value = ""; });
        results.hidden = true;
        clearMsg();
        return;
      }
      var value = parseValue(inp.value, base);
      if (value === null) return;
      if (typeof value === "number" && isNaN(value)) {
        msg("Invalid digits for the " + ({2:"binary",8:"octal",10:"decimal",16:"hex"}[base]) + " field.", "error");
        results.hidden = true;
        return;
      }
      render(inp.id, value, base);
    }

    inputs.forEach(function (inp) { inp.addEventListener("input", handle); });

    function recompute() {
      var active = inputs.find(function (i) { return i.value.trim() !== ""; });
      if (!active) return;
      var base = parseInt(active.dataset.base, 10);
      var value = parseValue(active.value, base);
      if (value !== null && !(typeof value === "number" && isNaN(value))) {
        render("", value, base);
      }
    }
    widthSel.addEventListener("change", recompute);
    signedSel.addEventListener("change", recompute);

    // Seed with a default value.
    document.getElementById("dec").value = "1000";
    render("dec", 1000n, 10);
  });
})();
