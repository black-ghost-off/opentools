// Text Repair Studio — fix mojibake and reinterpret bytes between encodings.
(function () {
  "use strict";

  // Windows-1252: byte 0x80-0x9F -> Unicode code point (used to build the demo).
  var CP1252_EXTRA = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
    0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
    0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
    0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
    0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
    0x9E: 0x017E, 0x9F: 0x0178
  };

  var utf8Decoder = new TextDecoder("utf-8"); // non-fatal: bad bytes -> U+FFFD
  var utf8Encoder = new TextEncoder();

  // Turn a string into bytes, assuming each char is one raw Latin-1 byte.
  function toBytesLatin1(s) {
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c > 0xFF) return null;
      out[i] = c;
    }
    return out;
  }

  function fixVia(s, toBytes) {
    var bytes = toBytes(s);
    if (!bytes) return null;
    return utf8Decoder.decode(bytes);
  }

  // byte -> char using the same windows-1252 table the fixer reverses. Used to
  // build a demo string whose round-trip is guaranteed consistent.
  function decodeCp1252(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      s += CP1252_EXTRA[b] !== undefined
        ? String.fromCodePoint(CP1252_EXTRA[b])
        : String.fromCharCode(b);
    }
    return s;
  }

  // Lower is better. Penalise replacement chars, C1 controls and classic
  // mojibake lead characters.
  function badness(s) {
    var score = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c === 0xFFFD) { score += 100; continue; }
      if (c >= 0x80 && c <= 0x9F) { score += 40; continue; } // C1 controls
      switch (c) {
        case 0xC2: case 0xC3: case 0xC4: case 0xC5:      // Â Ã Ä Å
        case 0xD0: case 0xD1: case 0xD2: case 0xD3:      // Ð Ñ Ò Ó
        case 0x00A0: case 0x00AD:                        // nbsp, soft hyphen
        case 0x2019: case 0x20AC:                        // ’ € (as fragments)
          score += 6; break;
        case 0xE2:                                       // â (lead of â€™ etc.)
          score += 4; break;
        default: break;
      }
    }
    return score;
  }

  // Build a char-code -> byte reverse map for any single-byte encoding that
  // TextDecoder supports, by round-tripping each of the 256 byte values.
  var reverseMapCache = {};
  function reverseMap(label) {
    if (label in reverseMapCache) return reverseMapCache[label];
    var dec;
    try { dec = new TextDecoder(label, { fatal: false }); }
    catch (e) { reverseMapCache[label] = null; return null; }
    var map = {};
    for (var b = 0; b < 256; b++) {
      var ch = dec.decode(Uint8Array.of(b));
      if (ch.length !== 1) continue;              // multi-byte -> not single-byte
      var code = ch.charCodeAt(0);
      if (code === 0xFFFD) continue;              // undefined slot
      if (map[code] === undefined) map[code] = b; // first byte wins on collision
    }
    reverseMapCache[label] = map;
    return map;
  }

  function toBytesEnc(s, label) {
    var map = reverseMap(label);
    if (!map) return null;
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) {
      var byte = map[s.charCodeAt(i)];
      if (byte === undefined) return null; // char not representable in this charset
      out[i] = byte;
    }
    return out;
  }

  // Single-byte encodings a wrong decoder commonly uses, producing mojibake.
  // Each is tried as: reverse this decode, then read the bytes as UTF-8.
  var SOURCE_ENCODINGS = [
    { label: "windows-1252", name: "Windows-1252" },
    { label: "windows-1251", name: "Windows-1251" },
    { label: "koi8-u", name: "KOI8-U" },
    { label: "koi8-r", name: "KOI8-R" },
    { label: "iso-8859-2", name: "ISO-8859-2" },
    { label: "iso-8859-5", name: "ISO-8859-5" },
    { label: "iso-8859-15", name: "ISO-8859-15" },
    { label: "windows-1250", name: "Windows-1250" },
    { label: "windows-1254", name: "Windows-1254" }
  ];

  var FIXERS = [
    // Raw Latin-1 (WHATWG maps the "iso-8859-1" label to windows-1252, so we
    // keep an explicit raw-byte reverse for true ISO-8859-1 mojibake).
    { name: "Latin-1 \u2192 UTF-8", fn: function (s) { return fixVia(s, toBytesLatin1); } }
  ].concat(SOURCE_ENCODINGS.map(function (enc) {
    return {
      name: enc.name + " \u2192 UTF-8",
      fn: function (s) { return fixVia(s, function (str) { return toBytesEnc(str, enc.label); }); }
    };
  }));

  function generateCandidates(input) {
    var results = new Map();
    function add(text, chain) {
      if (!results.has(text)) results.set(text, { text: text, badness: badness(text), chain: chain });
    }
    add(input, []);

    var frontier = [{ text: input, chain: [] }];
    for (var depth = 0; depth < 3 && frontier.length; depth++) {
      var next = [];
      frontier.forEach(function (node) {
        FIXERS.forEach(function (f) {
          var out = f.fn(node.text);
          if (out !== null && out !== node.text && !results.has(out)) {
            var chain = node.chain.concat(f.name);
            add(out, chain);
            next.push({ text: out, chain: chain });
          }
        });
      });
      frontier = next;
    }

    var list = Array.from(results.values());
    // Primary: fewest "garbage" chars. Tiebreak: shorter text, since mojibake
    // expands each real character into ~2 (this catches UTF-8-as-1251/KOI8 where
    // the broken text is still valid-looking Cyrillic). Original was inserted
    // first, so a true tie (same badness AND length) keeps it.
    list.sort(function (a, b) {
      if (a.badness !== b.badness) return a.badness - b.badness;
      return a.text.length - b.text.length;
    });
    return list;
  }

  function truncate(s, n) {
    var oneLine = s.replace(/\s+/g, " ");
    return oneLine.length > n ? oneLine.slice(0, n) + "\u2026" : oneLine;
  }

  function copyText(btn, text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = old; }, 1500);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    // ---- Tabs ----
    var tabs = document.querySelectorAll(".tab");
    var panels = document.querySelectorAll(".tab-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        panels.forEach(function (p) {
          p.hidden = p.dataset.panel !== tab.dataset.tab;
        });
      });
    });

    // ---- AUTO repair ----
    var autoInput = document.getElementById("auto-input");
    var runBtn = document.getElementById("run-repair");
    var toggleAll = document.getElementById("toggle-all");
    var autoMsg = document.getElementById("auto-message");
    var bestWrap = document.getElementById("best-wrap");
    var bestOut = document.getElementById("best-out");
    var bestMeta = document.getElementById("best-meta");
    var allWrap = document.getElementById("all-wrap");
    var candBody = document.getElementById("candidates-body");
    var lastBest = "";

    function repair() {
      var input = autoInput.value;
      autoMsg.className = "msg hidden";
      if (input.trim() === "") {
        bestWrap.hidden = true;
        allWrap.hidden = true;
        toggleAll.hidden = true;
        autoMsg.textContent = "Enter some text to repair.";
        autoMsg.className = "msg error";
        return;
      }

      var candidates = generateCandidates(input);
      var best = candidates[0];
      lastBest = best.text;

      bestOut.textContent = best.text;
      bestWrap.hidden = false;

      if (best.chain.length === 0) {
        bestMeta.textContent = "Text already looks clean \u2014 no repair applied (score " + best.badness + ").";
      } else {
        bestMeta.textContent = "Applied: " + best.chain.join(" \u2192 ") +
          "  (score " + best.badness + ", was " + candidates.find(function (c) { return c.chain.length === 0; }).badness + ").";
      }

      candBody.innerHTML = "";
      candidates.slice(0, 12).forEach(function (c, i) {
        var tr = document.createElement("tr");
        if (i === 0) tr.className = "best";
        tr.innerHTML =
          "<td>" + (i + 1) + "</td>" +
          '<td style="text-align:left">' + (c.chain.length ? c.chain.join(" \u2192 ") : "Original") + "</td>" +
          "<td>" + c.badness + "</td>" +
          '<td style="text-align:left">' + escapeHtml(truncate(c.text, 60)) + "</td>";
        candBody.appendChild(tr);
      });
      toggleAll.hidden = false;
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"]/g, function (ch) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
      });
    }

    runBtn.addEventListener("click", repair);
    autoInput.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") repair();
    });
    toggleAll.addEventListener("click", function () {
      allWrap.hidden = !allWrap.hidden;
      toggleAll.textContent = allWrap.hidden ? "Show all candidates" : "Hide candidates";
    });
    document.getElementById("copy-best").addEventListener("click", function () {
      copyText(this, lastBest);
    });

    // Seed with a demo so the tool is immediately useful.
    autoInput.value = decodeCp1252(utf8Encoder.encode("привіт, світ!"));
    repair();
  });
})();
