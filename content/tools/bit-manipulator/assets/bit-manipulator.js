// Bit Manipulator — visual bit toggling, shifts, rotations, masks, endian swap.
(function () {
  "use strict";

  var value = 0n;
  var width = 16;

  function mask() { return (1n << BigInt(width)) - 1n; }

  function parseHexy(str) {
    var s = str.trim().toLowerCase().replace(/[\s_]/g, "");
    var base = 16;
    if (s.startsWith("0x")) s = s.slice(2);
    else if (s.startsWith("0b")) { s = s.slice(2); base = 2; }
    if (s === "") return 0n;
    if (base === 2 && !/^[01]+$/.test(s)) return null;
    if (base === 16 && !/^[0-9a-f]+$/.test(s)) return null;
    var v = 0n, b = BigInt(base);
    for (var i = 0; i < s.length; i++) v = v * b + BigInt(parseInt(s[i], base));
    return v & mask();
  }

  function popcount(v) {
    var n = v, c = 0;
    while (n > 0n) { c += Number(n & 1n); n >>= 1n; }
    return c;
  }

  function signed(v) {
    var signBit = 1n << BigInt(width - 1);
    return (v & signBit) ? v - (1n << BigInt(width)) : v;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var grid = document.getElementById("bit-grid");
    var valueInput = document.getElementById("value");
    var widthSel = document.getElementById("width");
    var maskInput = document.getElementById("mask");

    function buildGrid() {
      grid.innerHTML = "";
      for (var i = width - 1; i >= 0; i--) {
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "bit-cell";
        cell.dataset.bit = i;
        cell.innerHTML = '<span class="bit-val">0</span><span class="bit-idx">' + i + "</span>";
        grid.appendChild(cell);
        if (i % 8 === 0 && i !== 0) {
          var sep = document.createElement("span");
          sep.className = "bit-sep";
          grid.appendChild(sep);
        }
      }
    }

    function render() {
      var cells = grid.querySelectorAll(".bit-cell");
      cells.forEach(function (c) {
        var i = BigInt(c.dataset.bit);
        var on = (value >> i) & 1n;
        c.classList.toggle("on", on === 1n);
        c.querySelector(".bit-val").textContent = on.toString();
      });

      var hex = value.toString(16).toUpperCase().padStart(width / 4, "0");
      valueInput.value = "0x" + hex;
      document.getElementById("out-hex").textContent = "0x" + hex;
      document.getElementById("out-dec").textContent = value.toString(10);
      document.getElementById("out-sdec").textContent = signed(value).toString(10);
      document.getElementById("out-pop").textContent = popcount(value);

      var bin = value.toString(2).padStart(width, "0");
      var grouped = bin.split("").reverse().join("").replace(/(.{4})/g, "$1 ").trim()
        .split("").reverse().join("");
      document.getElementById("out-bin").textContent = grouped;
    }

    function setValue(v) { value = v & mask(); render(); }

    grid.addEventListener("click", function (e) {
      var cell = e.target.closest(".bit-cell");
      if (!cell) return;
      var i = BigInt(cell.dataset.bit);
      value ^= (1n << i);
      value &= mask();
      render();
    });

    valueInput.addEventListener("input", function () {
      var v = parseHexy(valueInput.value);
      if (v === null) return;
      value = v & mask();
      render();
    });

    widthSel.addEventListener("change", function () {
      width = parseInt(widthSel.value, 10);
      value &= mask();
      buildGrid();
      render();
    });

    document.querySelectorAll("[data-op]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var op = btn.dataset.op;
        var w = BigInt(width);
        var m = mask();
        switch (op) {
          case "not": value = ~value & m; break;
          case "lsh": value = (value << 1n) & m; break;
          case "rsh": value = value >> 1n; break;
          case "rol": value = ((value << 1n) | (value >> (w - 1n))) & m; break;
          case "ror": value = ((value >> 1n) | (value << (w - 1n))) & m; break;
          case "rev": {
            var r = 0n;
            for (var i = 0n; i < w; i++) { r = (r << 1n) | ((value >> i) & 1n); }
            value = r & m;
            break;
          }
          case "swap": {
            var bytes = width / 8;
            var s = 0n;
            for (var b = 0; b < bytes; b++) {
              var byte = (value >> BigInt(b * 8)) & 0xFFn;
              s |= byte << BigInt((bytes - 1 - b) * 8);
            }
            value = s & m;
            break;
          }
          case "clear": value = 0n; break;
          case "set": value = m; break;
        }
        render();
      });
    });

    document.querySelectorAll("[data-mask]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mv = parseHexy(maskInput.value);
        if (mv === null) return;
        var op = btn.dataset.mask;
        if (op === "and") value &= mv;
        else if (op === "or") value |= mv;
        else if (op === "xor") value ^= mv;
        value &= mask();
        render();
      });
    });

    buildGrid();
    setValue(0xFFn);
  });
})();
