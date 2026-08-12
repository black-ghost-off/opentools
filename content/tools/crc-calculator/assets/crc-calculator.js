// CRC Calculator — generic bit-by-bit CRC-8/16/32 engine with configurable parameters.
(function () {
  "use strict";

  var PRESETS = {
    crc32: { width: 32, poly: "04C11DB7", init: "FFFFFFFF", xorout: "FFFFFFFF", refin: true, refout: true },
    crc32c: { width: 32, poly: "1EDC6F41", init: "FFFFFFFF", xorout: "FFFFFFFF", refin: true, refout: true },
    crc16ccitt: { width: 16, poly: "1021", init: "FFFF", xorout: "0000", refin: false, refout: false },
    crc16modbus: { width: 16, poly: "8005", init: "FFFF", xorout: "0000", refin: true, refout: true },
    crc16xmodem: { width: 16, poly: "1021", init: "0000", xorout: "0000", refin: false, refout: false },
    crc8: { width: 8, poly: "07", init: "00", xorout: "00", refin: false, refout: false },
    crc8maxim: { width: 8, poly: "31", init: "00", xorout: "00", refin: true, refout: true }
  };

  function reflect(x, bits) {
    var r = 0;
    for (var i = 0; i < bits; i++) {
      r = (r << 1) | (x & 1);
      x >>>= 1;
    }
    return r >>> 0;
  }

  function crcCompute(bytes, width, poly, init, refin, refout, xorout) {
    var mask = width === 32 ? 0xFFFFFFFF : ((1 << width) - 1);
    var topBit = 1 << (width - 1);
    var reg = (init >>> 0) & mask;

    for (var idx = 0; idx < bytes.length; idx++) {
      var b = bytes[idx] & 0xff;
      if (refin) b = reflect(b, 8);
      reg = (reg ^ (b * Math.pow(2, width - 8))) >>> 0;
      reg = reg & mask;
      for (var i = 0; i < 8; i++) {
        var bitSet = (reg & topBit) !== 0;
        reg = ((reg << 1) >>> 0) & mask;
        if (bitSet) reg = (reg ^ poly) >>> 0;
        reg = reg & mask;
      }
    }

    reg = reg & mask;
    if (refout) reg = reflect(reg, width);
    reg = (reg ^ xorout) >>> 0;
    reg = (reg & mask) >>> 0;
    return reg;
  }

  function textToBytes(str) {
    var utf8 = unescape(encodeURIComponent(str));
    var bytes = [];
    for (var i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
    return bytes;
  }

  function hexToBytes(str) {
    var cleaned = str.replace(/0x/gi, " ").replace(/[,\s_]+/g, " ").trim();
    if (cleaned === "") return [];
    var parts = cleaned.split(" ");
    var isSingleBlob = parts.length === 1 && parts[0].length % 2 === 0 && parts[0].length > 2;
    if (isSingleBlob) parts = parts[0].match(/.{1,2}/g);
    var bytes = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === "") continue;
      if (!/^[0-9a-fA-F]{1,2}$/.test(p)) return null;
      bytes.push(parseInt(p, 16));
    }
    return bytes;
  }

  function parseHexField(str, bits) {
    var cleaned = str.trim().replace(/^0x/i, "");
    if (!/^[0-9a-fA-F]*$/.test(cleaned) || cleaned === "") return NaN;
    var v = parseInt(cleaned, 16);
    if (bits === 32) return v >>> 0;
    return v;
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  function hex0x(v) {
    return "0x" + (v >>> 0).toString(16).toUpperCase();
  }

  function bytesLiteral(bytes, opener, closer) {
    var items = bytes.map(function (b) { return "0x" + b.toString(16).toUpperCase().padStart(2, "0"); });
    return opener + items.join(", ") + closer;
  }

  function buildPython(width, poly, init, refin, refout, xorout, bytes, expected, hexDigits) {
    return [
      "def reflect(x: int, bits: int) -> int:",
      "    r = 0",
      "    for _ in range(bits):",
      "        r = (r << 1) | (x & 1)",
      "        x >>= 1",
      "    return r",
      "",
      "",
      "def crc(data: bytes, width=" + width + ", poly=" + hex0x(poly) + ", init=" + hex0x(init) + ",",
      "        refin=" + (refin ? "True" : "False") + ", refout=" + (refout ? "True" : "False") + ", xorout=" + hex0x(xorout) + ") -> int:",
      "    mask = (1 << width) - 1",
      "    top_bit = 1 << (width - 1)",
      "    reg = init & mask",
      "    for byte in data:",
      "        b = reflect(byte, 8) if refin else byte",
      "        reg ^= b << (width - 8)",
      "        reg &= mask",
      "        for _ in range(8):",
      "            bit_set = reg & top_bit",
      "            reg = (reg << 1) & mask",
      "            if bit_set:",
      "                reg ^= poly",
      "            reg &= mask",
      "    if refout:",
      "        reg = reflect(reg, width)",
      "    return (reg ^ xorout) & mask",
      "",
      "",
      "data = bytes(" + bytesLiteral(bytes, "[", "]") + ")",
      "print(hex(crc(data)))  # -> " + "0x" + expected.toString(16).toUpperCase().padStart(hexDigits, "0")
    ].join("\n");
  }

  function buildC(width, poly, init, refin, refout, xorout, bytes, expected, hexDigits) {
    return [
      "#include <stdint.h>",
      "#include <stddef.h>",
      "#include <stdio.h>",
      "",
      "static uint32_t reflect(uint32_t x, int bits) {",
      "    uint32_t r = 0;",
      "    for (int i = 0; i < bits; i++) {",
      "        r = (r << 1) | (x & 1);",
      "        x >>= 1;",
      "    }",
      "    return r;",
      "}",
      "",
      "uint32_t crc_compute(const uint8_t *data, size_t len) {",
      "    const int width = " + width + ";",
      "    const uint32_t poly   = " + hex0x(poly) + "u;",
      "    const uint32_t init   = " + hex0x(init) + "u;",
      "    const int refin  = " + (refin ? 1 : 0) + ";",
      "    const int refout = " + (refout ? 1 : 0) + ";",
      "    const uint32_t xorout = " + hex0x(xorout) + "u;",
      "",
      "    uint32_t mask = (width == 32) ? 0xFFFFFFFFu : ((1u << width) - 1u);",
      "    uint32_t top_bit = 1u << (width - 1);",
      "    uint32_t reg = init & mask;",
      "",
      "    for (size_t i = 0; i < len; i++) {",
      "        uint32_t b = refin ? reflect(data[i], 8) : data[i];",
      "        reg ^= (b << (width - 8)) & mask;",
      "        for (int bit = 0; bit < 8; bit++) {",
      "            uint32_t bit_set = reg & top_bit;",
      "            reg = (reg << 1) & mask;",
      "            if (bit_set) reg ^= poly;",
      "            reg &= mask;",
      "        }",
      "    }",
      "    if (refout) reg = reflect(reg, width);",
      "    return (reg ^ xorout) & mask;",
      "}",
      "",
      "int main(void) {",
      "    uint8_t data[] = " + bytesLiteral(bytes, "{ ", " }") + ";",
      "    uint32_t crc = crc_compute(data, sizeof(data));",
      "    printf(\"0x%0" + hexDigits + "X\\n\", crc);   /* -> " + "0x" + expected.toString(16).toUpperCase().padStart(hexDigits, "0") + " */",
      "    return 0;",
      "}"
    ].join("\n");
  }

  function buildRust(width, poly, init, refin, refout, xorout, bytes, expected, hexDigits) {
    return [
      "fn reflect(mut x: u32, bits: u32) -> u32 {",
      "    let mut r = 0u32;",
      "    for _ in 0..bits {",
      "        r = (r << 1) | (x & 1);",
      "        x >>= 1;",
      "    }",
      "    r",
      "}",
      "",
      "fn crc_compute(data: &[u8]) -> u32 {",
      "    const WIDTH: u32 = " + width + ";",
      "    const POLY: u32 = " + hex0x(poly) + ";",
      "    const INIT: u32 = " + hex0x(init) + ";",
      "    const REFIN: bool = " + (refin ? "true" : "false") + ";",
      "    const REFOUT: bool = " + (refout ? "true" : "false") + ";",
      "    const XOROUT: u32 = " + hex0x(xorout) + ";",
      "",
      "    let mask: u32 = if WIDTH == 32 { 0xFFFF_FFFF } else { (1u32 << WIDTH) - 1 };",
      "    let top_bit: u32 = 1u32 << (WIDTH - 1);",
      "    let mut reg: u32 = INIT & mask;",
      "",
      "    for &byte in data {",
      "        let b = if REFIN { reflect(byte as u32, 8) } else { byte as u32 };",
      "        reg ^= (b << (WIDTH - 8)) & mask;",
      "        for _ in 0..8 {",
      "            let bit_set = reg & top_bit != 0;",
      "            reg = (reg << 1) & mask;",
      "            if bit_set { reg ^= POLY; }",
      "        }",
      "    }",
      "    if REFOUT { reg = reflect(reg, WIDTH); }",
      "    (reg ^ XOROUT) & mask",
      "}",
      "",
      "fn main() {",
      "    let data: &[u8] = &" + bytesLiteral(bytes, "[", "]") + ";",
      "    let crc = crc_compute(data);",
      "    println!(\"{:#X}\", crc);   // -> " + "0x" + expected.toString(16).toUpperCase().padStart(hexDigits, "0"),
      "}"
    ].join("\n");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("crc-form");
    if (!form) return;

    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var codeOut = document.getElementById("code-out");
    var copyBtn = document.getElementById("copy-code");
    var langCodeOut = document.getElementById("lang-code-out");
    var copyLangBtn = document.getElementById("copy-lang-code");
    var langTabs = document.querySelectorAll(".tab[data-lang]");
    var langSnippets = {};
    var activeLang = "python";

    function applyPreset() {
      var key = form.preset.value;
      var p = PRESETS[key];
      if (!p) return;
      form.width.value = String(p.width);
      form.poly.value = p.poly;
      form.init.value = p.init;
      form.xorout.value = p.xorout;
      form.refin.checked = p.refin;
      form.refout.checked = p.refout;
    }

    function run() {
      hideMessage(message);

      var width = parseInt(form.width.value, 10);
      var poly = parseHexField(form.poly.value, width);
      var init = parseHexField(form.init.value, width);
      var xorout = parseHexField(form.xorout.value, width);
      var refin = form.refin.checked;
      var refout = form.refout.checked;
      var inputType = form.inputType.value;
      var rawInput = form.input.value;

      if (isNaN(poly) || isNaN(init) || isNaN(xorout)) {
        return showMessage(message, "Poly / Init / XorOut must be valid hex values.", "error");
      }

      var bytes;
      if (inputType === "hex") {
        bytes = hexToBytes(rawInput);
        if (bytes === null) {
          return showMessage(message, "Invalid hex input. Use pairs like \"01 A2 FF\" or \"01a2ff\".", "error");
        }
      } else {
        bytes = textToBytes(rawInput);
      }

      var crc = crcCompute(bytes, width, poly, init, refin, refout, xorout);
      var hexDigits = width / 4;

      document.getElementById("out-hex").textContent = "0x" + crc.toString(16).toUpperCase().padStart(hexDigits, "0");
      document.getElementById("out-dec").textContent = crc.toString(10);
      document.getElementById("out-bin").textContent = crc.toString(2).padStart(width, "0");
      document.getElementById("out-len").textContent = bytes.length;

      codeOut.textContent = [
        "/* CRC-" + width + ", poly=0x" + poly.toString(16).toUpperCase() +
          " init=0x" + init.toString(16).toUpperCase() +
          " refin=" + refin + " refout=" + refout +
          " xorout=0x" + xorout.toString(16).toUpperCase() + " */",
        "uint" + (width <= 8 ? 8 : width <= 16 ? 16 : 32) + "_t crc = 0x" +
          crc.toString(16).toUpperCase().padStart(hexDigits, "0") + ";"
      ].join("\n");

      langSnippets = {
        python: buildPython(width, poly, init, refin, refout, xorout, bytes, crc, hexDigits),
        c: buildC(width, poly, init, refin, refout, xorout, bytes, crc, hexDigits),
        rust: buildRust(width, poly, init, refin, refout, xorout, bytes, crc, hexDigits)
      };
      langCodeOut.textContent = langSnippets[activeLang];

      results.hidden = false;
    }

    form.preset.addEventListener("change", function () {
      applyPreset();
      run();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });

    form.addEventListener("reset", function () {
      results.hidden = true;
      hideMessage(message);
      setTimeout(function () { applyPreset(); run(); }, 0);
    });

    langTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        langTabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        activeLang = tab.dataset.lang;
        langCodeOut.textContent = langSnippets[activeLang] || "";
      });
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

    if (copyLangBtn) {
      copyLangBtn.addEventListener("click", function () {
        var text = langCodeOut.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyLangBtn.textContent = "Copied!";
            setTimeout(function () { copyLangBtn.textContent = "Copy"; }, 1500);
          });
        }
      });
    }

    form.preset.value = "crc32";
    run();
  });
})();
