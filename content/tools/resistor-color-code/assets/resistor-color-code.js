// Resistor Color Code — interactive band pickers with scroll, click-to-pick grid, and live SVG.
(function () {
  "use strict";

  // ── Colour data ────────────────────────────────────────────────────────────
  var COLORS = [
    { name: "black",  hex: "#1a1a1a", digit: 0, mult: 1,        tc: null },
    { name: "brown",  hex: "#8B4513", digit: 1, mult: 10,       tc: 100, tol: 1 },
    { name: "red",    hex: "#c0392b", digit: 2, mult: 100,      tc: 50,  tol: 2 },
    { name: "orange", hex: "#e67e22", digit: 3, mult: 1000,     tc: 15 },
    { name: "yellow", hex: "#f1c40f", digit: 4, mult: 10000,    tc: 25 },
    { name: "green",  hex: "#27ae60", digit: 5, mult: 100000,   tc: 20,  tol: 0.5 },
    { name: "blue",   hex: "#2980b9", digit: 6, mult: 1000000,  tc: 10,  tol: 0.25 },
    { name: "violet", hex: "#8e44ad", digit: 7, mult: 10000000, tc: 5,   tol: 0.1 },
    { name: "grey",   hex: "#7f8c8d", digit: 8, mult: 1e8,      tc: 1,   tol: 0.05 },
    { name: "white",  hex: "#e8e8e8", digit: 9, mult: 1e9,      tc: null },
    { name: "gold",   hex: "#c9a227", digit: null, mult: 0.1,   tol: 5 },
    { name: "silver", hex: "#aaaaaa", digit: null, mult: 0.01,  tol: 10 }
  ];

  var DIGIT_COLORS = COLORS.filter(function(c){ return c.digit !== null; });
  var MULT_COLORS  = COLORS.filter(function(c){ return c.mult  !== null; });
  var TOL_COLORS   = COLORS.filter(function(c){ return c.tol   !== undefined; });
  var TC_COLORS    = COLORS.filter(function(c){ return c.tc !== null && c.digit !== null; });

  var BY_NAME = {};
  COLORS.forEach(function(c){ BY_NAME[c.name] = c; });

  // ── State ──────────────────────────────────────────────────────────────────
  var bandValues = ["yellow", "violet", "black", "red", "brown", "red"];
  var numBands   = 5;
  var openPopup  = null;

  // ── Format helpers ─────────────────────────────────────────────────────────
  function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

  function fmtR(ohm) {
    if (!isFinite(ohm) || isNaN(ohm)) return "?";
    if (ohm >= 1e9) return (ohm / 1e9).toPrecision(4).replace(/\.?0+$/, "") + " GΩ";
    if (ohm >= 1e6) return (ohm / 1e6).toPrecision(4).replace(/\.?0+$/, "") + " MΩ";
    if (ohm >= 1e3) return (ohm / 1e3).toPrecision(4).replace(/\.?0+$/, "") + " kΩ";
    return ohm.toPrecision(4).replace(/\.?0+$/, "") + " Ω";
  }

  function fmtMult(m) {
    if (m >= 1e9) return "×1G"; if (m >= 1e6) return "×1M";
    if (m >= 1e3) return "×1k"; if (m >= 1)   return "×" + m;
    return "×" + m;
  }

  function subLabel(c, role) {
    if (role === "digit") return c.digit !== null ? "digit " + c.digit : "";
    if (role === "mult")  return fmtMult(c.mult);
    if (role === "tol")   return c.tol !== undefined ? "±" + c.tol + "%" : "";
    if (role === "tc")    return c.tc ? c.tc + " ppm" : "";
    return "";
  }

  function parseValueInput(s) {
    s = s.trim().replace(/,/g, "").toLowerCase();
    var m = s.match(/^([0-9]*\.?[0-9]+)\s*([kmg]?)/i);
    if (!m) return NaN;
    var v = parseFloat(m[1]);
    if (m[2] === "k") v *= 1e3;
    else if (m[2] === "m") v *= 1e6;
    else if (m[2] === "g") v *= 1e9;
    return v;
  }

  // ── Band role maps ─────────────────────────────────────────────────────────
  function rolesFor(n) {
    if (n === 4) return ["digit","digit","mult","tol"];
    if (n === 5) return ["digit","digit","digit","mult","tol"];
    return ["digit","digit","digit","mult","tol","tc"];
  }

  function paletteFor(role) {
    if (role === "digit") return DIGIT_COLORS;
    if (role === "mult")  return MULT_COLORS;
    if (role === "tol")   return TOL_COLORS;
    if (role === "tc")    return TC_COLORS;
    return COLORS;
  }

  function roleLabel(role, idx) {
    var map = { digit: "Digit", mult: "Multiplier", tol: "Tolerance", tc: "Temp. Coeff." };
    return "Band " + (idx + 1) + " — " + (map[role] || role);
  }

  // ── SVG resistor body ──────────────────────────────────────────────────────
  function renderSVG() {
    var svg  = document.getElementById("resistor-svg");
    var W = 480, H = 90;
    var lead = 60, bx = lead, bw = W - 2 * lead;
    var by = 20, bh = 44, rx = 14;
    var n = numBands;
    var margin = 20;
    var inner  = bw - 2 * margin;
    var bandW  = Math.max(10, Math.floor(inner / (n * 1.9)));
    var spacing = (n > 1) ? (inner - bandW * n) / (n - 1) : 0;

    var parts = [];
    parts.push('<line x1="0" y1="42" x2="' + bx + '" y2="42" stroke="#888" stroke-width="3" stroke-linecap="round"/>');
    parts.push('<line x1="' + (bx + bw) + '" y1="42" x2="' + W + '" y2="42" stroke="#888" stroke-width="3" stroke-linecap="round"/>');
    parts.push('<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="' + rx + '" fill="#d4b483" stroke="#b8965a" stroke-width="1.5"/>');

    for (var i = 0; i < n; i++) {
      var c   = BY_NAME[bandValues[i]];
      var hex = c ? c.hex : "#888";
      var bBx = bx + margin + i * (bandW + spacing);
      parts.push('<rect x="' + bBx.toFixed(1) + '" y="' + by + '" width="' + bandW + '" height="' + bh + '" fill="' + hex + '" rx="2"/>');
    }

    for (var i = 0; i < n; i++) {
      var cx = bx + margin + i * (bandW + spacing) + bandW / 2;
      parts.push('<text x="' + cx.toFixed(1) + '" y="' + (by + bh + 14) + '" text-anchor="middle" font-size="10" fill="#888">' + (i + 1) + '</text>');
    }

    svg.innerHTML = parts.join("");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  }

  // ── Popup management ───────────────────────────────────────────────────────
  function closePopup() {
    if (openPopup) {
      openPopup.pickerDiv.remove();
      openPopup.swatchEl.classList.remove("open");
      openPopup = null;
    }
  }

  document.addEventListener("click", function(e) {
    if (openPopup && !openPopup.pickerDiv.contains(e.target) && e.target !== openPopup.swatchEl) {
      closePopup();
    }
  });
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") closePopup();
  });

  function openColorPicker(swatchEl, idx, role) {
    if (openPopup && openPopup.swatchEl === swatchEl) { closePopup(); return; }
    closePopup();

    var palette = paletteFor(role);
    var picker  = document.createElement("div");
    picker.className = "color-popup";
    picker.style.gridTemplateColumns = palette.length >= 8 ? "repeat(4,1fr)" : "repeat(3,1fr)";

    palette.forEach(function(c) {
      var item = document.createElement("div");
      item.className = "cp-item" + (c.name === bandValues[idx] ? " selected" : "");

      var dot = document.createElement("div");
      dot.className = "cp-dot";
      dot.style.background = c.hex;

      var nm = document.createElement("div");
      nm.className = "cp-name";
      nm.textContent = cap(c.name);

      var val = document.createElement("div");
      val.className = "cp-val";
      val.textContent = subLabel(c, role);

      item.appendChild(dot); item.appendChild(nm); item.appendChild(val);
      item.addEventListener("click", function(e) {
        e.stopPropagation();
        bandValues[idx] = c.name;
        rebuildPickers(false);
        closePopup();
      });
      picker.appendChild(item);
    });

    var rect = swatchEl.getBoundingClientRect();
    picker.style.position = "fixed";
    picker.style.top  = (rect.bottom + 6) + "px";
    picker.style.left = Math.max(8, rect.left - 20) + "px";

    document.body.appendChild(picker);
    swatchEl.classList.add("open");
    openPopup = { swatchEl: swatchEl, pickerDiv: picker };

    requestAnimationFrame(function() {
      var pr = picker.getBoundingClientRect();
      if (pr.right > window.innerWidth - 8)
        picker.style.left = Math.max(8, window.innerWidth - pr.width - 8) + "px";
      if (pr.bottom > window.innerHeight - 8)
        picker.style.top = (rect.top - pr.height - 6) + "px";
    });
  }

  // ── Build a single band picker control ────────────────────────────────────
  function buildPicker(idx, role, initialValue) {
    var palette = paletteFor(role);
    if (!palette.find(function(c){ return c.name === initialValue; }))
      initialValue = palette[0].name;
    bandValues[idx] = initialValue;

    var wrap = document.createElement("div");
    wrap.className = "band-picker";

    var lbl = document.createElement("div");
    lbl.className = "bp-label";
    lbl.textContent = roleLabel(role, idx);
    wrap.appendChild(lbl);

    var row = document.createElement("div");
    row.className = "bp-row";

    var btnPrev = document.createElement("button");
    btnPrev.className = "bp-arrow"; btnPrev.type = "button";
    btnPrev.innerHTML = "&#8249;"; btnPrev.title = "Previous color";

    var swatch = document.createElement("div");
    swatch.className = "bp-swatch"; swatch.tabIndex = 0;
    swatch.setAttribute("role", "button");
    swatch.setAttribute("aria-label", "Band " + (idx + 1) + " color");

    var btnNext = document.createElement("button");
    btnNext.className = "bp-arrow"; btnNext.type = "button";
    btnNext.innerHTML = "&#8250;"; btnNext.title = "Next color";

    row.appendChild(btnPrev); row.appendChild(swatch); row.appendChild(btnNext);
    wrap.appendChild(row);

    var nameLbl = document.createElement("div");
    nameLbl.className = "bp-name";
    wrap.appendChild(nameLbl);

    var subLbl = document.createElement("div");
    subLbl.className = "bp-sub";
    wrap.appendChild(subLbl);

    function getIdx() {
      return palette.findIndex(function(c){ return c.name === bandValues[idx]; });
    }

    function setColor(name) {
      bandValues[idx] = name;
      var c = BY_NAME[name];
      swatch.style.background   = c.hex;
      swatch.style.borderColor  = "rgba(0,0,0,0.22)";
      nameLbl.textContent = cap(name);
      subLbl.textContent  = subLabel(c, role);
      renderSVG();
      decode();
    }

    function step(dir) {
      var i = getIdx();
      setColor(palette[(i + dir + palette.length) % palette.length].name);
      closePopup();
    }

    btnPrev.addEventListener("click", function(e){ e.stopPropagation(); step(-1); });
    btnNext.addEventListener("click", function(e){ e.stopPropagation(); step(+1); });

    swatch.addEventListener("wheel", function(e) {
      e.preventDefault();
      step(e.deltaY > 0 ? 1 : -1);
    }, { passive: false });

    swatch.addEventListener("keydown", function(e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); step(+1); }
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   { e.preventDefault(); step(-1); }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openColorPicker(swatch, idx, role); }
    });

    swatch.addEventListener("click", function(e) {
      e.stopPropagation();
      openColorPicker(swatch, idx, role);
    });

    setColor(initialValue);
    return wrap;
  }

  // ── Build / rebuild all pickers ────────────────────────────────────────────
  function rebuildPickers(resetValues) {
    var roles = rolesFor(numBands);
    if (resetValues) {
      var defaults = {
        4: ["yellow","violet","red","gold"],
        5: ["yellow","violet","black","red","brown"],
        6: ["yellow","violet","black","red","brown","red"]
      };
      defaults[numBands].forEach(function(v,i){ bandValues[i] = v; });
    }
    var container = document.getElementById("band-pickers");
    container.innerHTML = "";
    roles.forEach(function(role, idx) {
      container.appendChild(buildPicker(idx, role, bandValues[idx]));
    });
    renderSVG();
    decode();
  }

  // ── Decode → result display ────────────────────────────────────────────────
  function decode() {
    var msg = document.getElementById("message");
    var results = document.getElementById("results");
    try {
      var roles = rolesFor(numBands);
      var digits = [], mult, tol, tc = null;
      roles.forEach(function(role, i) {
        var c = BY_NAME[bandValues[i]];
        if (!c) throw new Error("unknown");
        if (role === "digit") digits.push(c.digit);
        if (role === "mult")  mult = c.mult;
        if (role === "tol")   tol  = c.tol;
        if (role === "tc")    tc   = c.tc;
      });
      if (mult === undefined || mult === null) { results.hidden = true; return; }
      var ohm    = parseInt(digits.join(""), 10) * mult;
      var tolPct = tol !== undefined ? tol : 20;

      msg.className = "msg hidden";
      results.hidden = false;
      document.getElementById("res-value").textContent = fmtR(ohm);
      document.getElementById("res-tol").textContent   = "±" + tolPct + "%";
      document.getElementById("res-range").textContent =
        fmtR(ohm * (1 - tolPct / 100)) + " – " + fmtR(ohm * (1 + tolPct / 100));
      var tcStat = document.getElementById("tc-stat");
      if (tc !== null && tc !== undefined) {
        tcStat.hidden = false;
        document.getElementById("res-tc").textContent = tc + " ppm/°C";
      } else {
        tcStat.hidden = true;
      }
    } catch(e) {
      msg.className = "msg error"; msg.textContent = "Error decoding bands.";
      results.hidden = true;
    }
  }

  // ── Encode value → bands ───────────────────────────────────────────────────
  function encode() {
    var raw     = document.getElementById("valueIn").value;
    var tolName = document.getElementById("tolIn").value;
    var ohm     = parseValueInput(raw);
    var msg     = document.getElementById("message");

    if (isNaN(ohm) || ohm <= 0) {
      msg.className = "msg error"; msg.textContent = "Invalid resistance value."; return;
    }

    var numDigits = numBands >= 5 ? 3 : 2;
    var bestError = Infinity, bestMult = null, bestDigitArr = null;

    MULT_COLORS.forEach(function(c) {
      var base = ohm / c.mult;
      if (base < 1 || base >= Math.pow(10, numDigits)) return;
      var rounded = Math.round(base);
      var err = Math.abs(rounded * c.mult - ohm) / ohm;
      if (err < bestError) {
        bestError    = err;
        bestMult     = c;
        bestDigitArr = String(rounded).padStart(numDigits, "0").split("").map(Number);
      }
    });

    if (!bestMult) {
      msg.className = "msg error"; msg.textContent = "Cannot encode this value for the selected band count."; return;
    }

    var roles = rolesFor(numBands), di = 0;
    roles.forEach(function(role, i) {
      if (role === "digit") {
        bandValues[i] = COLORS.find(function(c){ return c.digit === bestDigitArr[di]; }).name;
        di++;
      } else if (role === "mult") {
        bandValues[i] = bestMult.name;
      } else if (role === "tol") {
        bandValues[i] = tolName;
      }
    });

    msg.className = "msg hidden";
    rebuildPickers(false);
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("numBands").addEventListener("change", function(e) {
      numBands = parseInt(e.target.value, 10);
      rebuildPickers(true);
    });
    document.getElementById("encodeBtn").addEventListener("click", encode);
    rebuildPickers(true);
  });
})();
