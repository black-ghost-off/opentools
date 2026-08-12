// PCB Trace Width (IPC-2221) — live cross-section SVG + calculation.
(function () {
  "use strict";

  var K_EXT = 0.048, K_INT = 0.024;
  var OZ_MIL = {"0.5": 0.685, "1": 1.37, "2": 2.74, "3": 4.11};

  // ── SVG helpers ─────────────────────────────────────────────────────────────
  function dimH(x1, x2, y, lbl, acc) {
    var mx = (x1 + x2) / 2;
    return '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="' + acc + '" stroke-width="1"/>' +
      '<line x1="' + x1 + '" y1="' + (y - 4) + '" x2="' + x1 + '" y2="' + (y + 4) + '" stroke="' + acc + '" stroke-width="1"/>' +
      '<line x1="' + x2 + '" y1="' + (y - 4) + '" x2="' + x2 + '" y2="' + (y + 4) + '" stroke="' + acc + '" stroke-width="1"/>' +
      '<text x="' + mx + '" y="' + (y - 6) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="' + acc + '">' + lbl + '</text>';
  }

  function dimV(x, y1, y2, lbl, acc) {
    var my = (y1 + y2) / 2;
    return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" stroke="' + acc + '" stroke-width="1"/>' +
      '<line x1="' + (x - 4) + '" y1="' + y1 + '" x2="' + (x + 4) + '" y2="' + y1 + '" stroke="' + acc + '" stroke-width="1"/>' +
      '<line x1="' + (x - 4) + '" y1="' + y2 + '" x2="' + (x + 4) + '" y2="' + y2 + '" stroke="' + acc + '" stroke-width="1"/>' +
      '<text x="' + (x - 7) + '" y="' + (my + 4) + '" text-anchor="end" font-size="9" font-weight="700" fill="' + acc + '">' + lbl + '</text>';
  }

  // ── SVG cross-section diagram ────────────────────────────────────────────────
  function renderSVG(widthMil, thickMil, widthMm, thickMm, ok) {
    var svg = document.getElementById("trace-svg");
    if (!svg) return;
    var cs  = getComputedStyle(document.documentElement);
    var col = cs.getPropertyValue("--text").trim() || "#c9d1d9";
    var mut = cs.getPropertyValue("--text-muted").trim() || "#8b949e";
    var brd = cs.getPropertyValue("--border").trim() || "#30363d";
    var acc = cs.getPropertyValue("--accent").trim() || "#2f6df6";

    // Fixed layout — viewBox 240×200
    var VW = 240, VH = 200;
    svg.setAttribute("viewBox", "0 0 " + VW + " " + VH);

    var subX = 20, subW = VW - 40, subY = 108, subH = 46;
    var tW = ok ? Math.max(30, Math.min(160, widthMil * 3)) : 80;
    var tH = ok ? Math.max(10, Math.min(28, thickMil * 9)) : 14;
    var tX = (VW - tW) / 2;
    var tY = subY - tH;

    var wLbl = ok ? widthMil.toPrecision(4) + " mil" : "W";
    var thLbl = ok ? thickMil.toPrecision(3) + " mil" : "T";
    var wArrowY = subY + subH + 20;
    var tArrowX = Math.max(14, tX - 30);

    var out = "";

    // Title
    out += '<text x="' + (VW / 2) + '" y="15" text-anchor="middle" font-size="10" font-weight="600" fill="' + mut + '">Cross-Section View</text>';

    // Substrate rectangle
    out += '<rect x="' + subX + '" y="' + subY + '" width="' + subW + '" height="' + subH + '" rx="3" fill="#1a3d22" stroke="#3a7d44" stroke-width="1.5"/>';
    out += '<text x="' + (VW / 2) + '" y="' + (subY + subH / 2 + 4.5) + '" text-anchor="middle" font-size="10" font-weight="600" fill="#5db87a">FR4 Substrate</text>';

    // Substrate top edge highlight
    out += '<line x1="' + subX + '" y1="' + subY + '" x2="' + (subX + subW) + '" y2="' + subY + '" stroke="#3a7d44" stroke-width="2"/>';

    // Copper trace
    if (ok) {
      out += '<rect x="' + tX + '" y="' + tY + '" width="' + tW + '" height="' + tH + '" fill="#c9a227" stroke="#a07a10" stroke-width="1.5" rx="1"/>';
    } else {
      out += '<rect x="' + tX + '" y="' + tY + '" width="' + tW + '" height="' + tH + '" fill="' + brd + '" stroke="' + mut + '" stroke-width="1" rx="1"/>';
    }
    if (tH > 11) {
      out += '<text x="' + (tX + tW / 2) + '" y="' + (tY + tH / 2 + 3.5) + '" text-anchor="middle" font-size="8" font-weight="700" fill="' + (ok ? "#3d2800" : col) + '">Cu</text>';
    }

    // Width arrow — below substrate with dashed leader lines
    out += dimH(tX, tX + tW, wArrowY, wLbl, acc);
    out += '<line x1="' + tX + '" y1="' + (subY + subH + 2) + '" x2="' + tX + '" y2="' + (wArrowY - 8) + '" stroke="' + acc + '" stroke-width="0.6" stroke-dasharray="3,2"/>';
    out += '<line x1="' + (tX + tW) + '" y1="' + (subY + subH + 2) + '" x2="' + (tX + tW) + '" y2="' + (wArrowY - 8) + '" stroke="' + acc + '" stroke-width="0.6" stroke-dasharray="3,2"/>';

    // Thickness arrow — left of trace
    out += dimV(tArrowX, tY, subY, thLbl, acc);

    // Current arrow inside trace
    if (ok && tW > 40) {
      out += '<defs><marker id="iarr" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="' + acc + '"/></marker></defs>';
      out += '<line x1="' + (tX + 8) + '" y1="' + (tY + tH / 2) + '" x2="' + (tX + tW - 12) + '" y2="' + (tY + tH / 2) + '" stroke="' + acc + '" stroke-width="1.5" marker-end="url(#iarr)" opacity="0.8"/>';
    }

    // mm dimensions line
    if (ok) {
      out += '<text x="' + (VW / 2) + '" y="' + (wArrowY + 14) + '" text-anchor="middle" font-size="8.5" fill="' + mut + '">' + widthMm.toPrecision(3) + ' mm \u00d7 ' + thickMm.toPrecision(3) + ' mm</text>';
    }

    // Formula note
    out += '<text x="' + (VW / 2) + '" y="' + (VH - 4) + '" text-anchor="middle" font-size="7.5" fill="' + mut + '">IPC-2221: I = k \u00d7 \u0394T\u2070\u02b7\u2074\u2074 \u00d7 A\u2070\u02b7\u2077\u00b2\u2075</text>';

    svg.innerHTML = out;
  }

  function recalc() {
    var I     = parseFloat(document.getElementById("current").value);
    var dT    = parseFloat(document.getElementById("temp-rise").value);
    var ozStr = document.getElementById("thickness").value;
    var layer = document.getElementById("layer").value;
    var res   = document.getElementById("results");

    var thickMil = OZ_MIL[ozStr] || 1.37;
    var thickMm  = thickMil * 0.0254;

    if (isNaN(I) || I <= 0 || isNaN(dT) || dT <= 0) {
      renderSVG(0, thickMil, 0, thickMm, false);
      res.hidden = true;
      return;
    }

    var k        = layer === "external" ? K_EXT : K_INT;
    var A_sqmil  = Math.pow(I / (k * Math.pow(dT, 0.44)), 1 / 0.725);
    var wMil     = A_sqmil / thickMil;
    var wMm      = wMil * 0.0254;
    var areaMm2  = wMm * thickMm;
    var resPcm   = (1.72e-8 / (areaMm2 * 1e-6)) * 0.01;

    renderSVG(wMil, thickMil, wMm, thickMm, true);

    document.getElementById("out-width-mil").textContent = wMil.toPrecision(4) + " mil";
    document.getElementById("out-width-mm").textContent  = wMm.toPrecision(4) + " mm";
    document.getElementById("out-area").textContent      = A_sqmil.toPrecision(4) + " sq-mil  (" + areaMm2.toPrecision(3) + " mm\u00b2)";
    document.getElementById("out-res").textContent       = (resPcm * 1000).toPrecision(3) + " m\u03a9/cm";
    res.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["current", "temp-rise"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", recalc);
    });
    ["thickness", "layer"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", recalc);
    });
    recalc();
  });
})();
