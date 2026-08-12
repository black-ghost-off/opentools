// ASCII / Unicode Table — searchable table + code point lookup.
(function () {
  "use strict";

  var CONTROL = {
    0: ["NUL", "\\0"], 1: ["SOH", ""], 2: ["STX", ""], 3: ["ETX", ""],
    4: ["EOT", ""], 5: ["ENQ", ""], 6: ["ACK", ""], 7: ["BEL", "\\a"],
    8: ["BS", "\\b"], 9: ["TAB", "\\t"], 10: ["LF (newline)", "\\n"],
    11: ["VT", "\\v"], 12: ["FF", "\\f"], 13: ["CR", "\\r"], 14: ["SO", ""],
    15: ["SI", ""], 16: ["DLE", ""], 17: ["DC1", ""], 18: ["DC2", ""],
    19: ["DC3", ""], 20: ["DC4", ""], 21: ["NAK", ""], 22: ["SYN", ""],
    23: ["ETB", ""], 24: ["CAN", ""], 25: ["EM", ""], 26: ["SUB", ""],
    27: ["ESC", "\\e"], 28: ["FS", ""], 29: ["GS", ""], 30: ["RS", ""],
    31: ["US", ""], 32: ["Space", ""], 127: ["DEL", ""]
  };

  function rowData(code) {
    var ctrl = CONTROL[code];
    var display, name;
    if (ctrl) {
      display = code === 32 ? "\u2423" : "\u00b7"; // visible marker
      name = ctrl[1] ? ctrl[0] + " (" + ctrl[1] + ")" : ctrl[0];
    } else {
      display = String.fromCharCode(code);
      name = "";
    }
    return {
      code: code,
      char: display,
      real: code === 32 ? " " : (ctrl ? "" : String.fromCharCode(code)),
      name: name,
      hex: code.toString(16).toUpperCase().padStart(2, "0"),
      oct: code.toString(8).padStart(3, "0"),
      bin: code.toString(2).padStart(8, "0")
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    var body = document.getElementById("ascii-body");
    var search = document.getElementById("search");
    var cp = document.getElementById("cp");
    var cpResult = document.getElementById("cp-result");

    var rows = [];
    for (var i = 0; i < 128; i++) rows.push(rowData(i));

    function build(filter) {
      body.innerHTML = "";
      var f = (filter || "").trim().toLowerCase();
      rows.forEach(function (r) {
        if (f) {
          var hay = [
            r.char, r.real.toLowerCase(), r.name.toLowerCase(),
            String(r.code), "0x" + r.hex.toLowerCase(), r.hex.toLowerCase(),
            r.oct, r.bin
          ].join(" ");
          if (hay.indexOf(f) === -1) return;
        }
        var tr = document.createElement("tr");
        tr.innerHTML =
          '<td class="ch">' + r.char + "</td>" +
          "<td>" + r.code + "</td>" +
          "<td>0x" + r.hex + "</td>" +
          "<td>" + r.oct + "</td>" +
          "<td>" + r.bin + "</td>" +
          '<td class="name">' + (r.name || (r.real === " " ? "space" : "")) + "</td>";
        body.appendChild(tr);
      });
    }

    function lookupCodePoint() {
      var raw = cp.value.trim();
      if (raw === "") { cpResult.className = "msg hidden"; return; }
      var n;
      if (/^u\+?[0-9a-f]+$/i.test(raw)) n = parseInt(raw.replace(/^u\+?/i, ""), 16);
      else if (/^0x[0-9a-f]+$/i.test(raw)) n = parseInt(raw, 16);
      else if (/^[0-9]+$/.test(raw)) n = parseInt(raw, 10);
      else { cpResult.textContent = "Enter a code point like U+2764, 0x2764 or 10084."; cpResult.className = "msg error"; return; }

      if (!(n >= 0 && n <= 0x10FFFF)) { cpResult.textContent = "Out of Unicode range."; cpResult.className = "msg error"; return; }
      var chr;
      try { chr = String.fromCodePoint(n); } catch (e) { chr = "?"; }
      var utf8 = Array.from(new TextEncoder().encode(chr))
        .map(function (b) { return b.toString(16).toUpperCase().padStart(2, "0"); }).join(" ");
      cpResult.innerHTML =
        "<strong style='font-size:1.3em'>" + (chr === " " ? "\u2423" : chr) + "</strong> &nbsp; " +
        "U+" + n.toString(16).toUpperCase().padStart(4, "0") +
        " &nbsp;|&nbsp; dec " + n +
        " &nbsp;|&nbsp; UTF-8: " + utf8;
      cpResult.className = "msg ok";
    }

    search.addEventListener("input", function () { build(search.value); });
    cp.addEventListener("input", lookupCodePoint);

    build("");
  });
})();
