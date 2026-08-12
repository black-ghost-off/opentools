// Ohm's Law — live 4-variable solver with visual triangle.
(function () {
  "use strict";

  var SFX = { k:1e3, m:1e-3, u:1e-6, µ:1e-6, n:1e-9, M:1e6, G:1e9 };

  function parse(s) {
    if (!s || !s.trim()) return null;
    s = s.trim();
    // Strip trailing unit symbols (Ω, V, A, W, Hz, F, H) so computed values can be re-parsed
    s = s.replace(/\s*[ΩVAWFHhz]+$/i, "").trim();
    var m = s.match(/^([+-]?\d*\.?\d+)\s*([kmuµnMG]?)$/i);
    if (!m) return NaN;
    var v = parseFloat(m[1]);
    var sf = SFX[m[2]] || SFX[m[2].toLowerCase()];
    return sf ? v * sf : v;
  }

  function fmtSI(v, unit) {
    if (v === null || !isFinite(v)) return "—";
    var a = Math.abs(v);
    var pairs = [[1e9,"G"],[1e6,"M"],[1e3,"k"],[1,""],[1e-3,"m"],[1e-6,"µ"],[1e-9,"n"]];
    for (var i = 0; i < pairs.length; i++) {
      if (a >= pairs[i][0] * 0.9999) return (v / pairs[i][0]).toPrecision(4).replace(/\.?0+$/,"") + " " + pairs[i][1] + unit;
    }
    return v.toPrecision(4) + " " + unit;
  }

  function solve(V, I, R, P) {
    if (V !== null && I !== null) return { V:V, I:I, R: V/I, P: V*I };
    if (V !== null && R !== null) return { V:V, I:V/R, R:R, P:V*V/R };
    if (V !== null && P !== null) return { V:V, I:P/V, R:V*V/P, P:P };
    if (I !== null && R !== null) return { V:I*R, I:I, R:R, P:I*I*R };
    if (I !== null && P !== null) return { V:P/I, I:I, R:P/(I*I), P:P };
    if (R !== null && P !== null) return { V:Math.sqrt(P*R), I:Math.sqrt(P/R), R:R, P:P };
    return null;
  }

  var IDS    = ["voltage","current","resistance","power"];
  var TILES  = ["tile-v","tile-i","tile-r","tile-p"];
  var UNITS  = ["V","A","Ω","W"];
  var KEYS   = ["V","I","R","P"];

  function renderTriangle(res) {
    var svg  = document.getElementById("ohm-tri");
    var col  = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#1b2430";
    var acc  = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2f6df6";
    var mut  = getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim() || "#5a6675";

    function fv(v, u) { return res ? fmtSI(v, u) : "?"; }

    svg.innerHTML = [
      // Triangle outline
      '<polygon points="170,8 310,92 30,92" fill="none" stroke="'+col+'" stroke-width="1.5" opacity=".18"/>',
      // Dividing line
      '<line x1="30" y1="92" x2="310" y2="92" stroke="'+col+'" stroke-width="1" opacity=".12"/>',
      '<line x1="170" y1="92" x2="170" y2="8" stroke="'+col+'" stroke-width="1" opacity=".12"/>',
      // V on top
      '<text x="170" y="38" text-anchor="middle" font-size="22" font-weight="800" fill="'+acc+'" font-family="ui-monospace,monospace">V</text>',
      '<text x="170" y="54" text-anchor="middle" font-size="11" fill="'+mut+'">' + (res ? fmtSI(res.V,"V") : "–") + '</text>',
      // I bottom-left
      '<text x="80" y="82" text-anchor="middle" font-size="19" font-weight="800" fill="'+acc+'" font-family="ui-monospace,monospace">I</text>',
      '<text x="80" y="97" text-anchor="middle" font-size="10" fill="'+mut+'">' + (res ? fmtSI(res.I,"A") : "–") + '</text>',
      // R bottom-right
      '<text x="262" y="82" text-anchor="middle" font-size="19" font-weight="800" fill="'+acc+'" font-family="ui-monospace,monospace">R</text>',
      '<text x="262" y="97" text-anchor="middle" font-size="10" fill="'+mut+'">' + (res ? fmtSI(res.R,"Ω") : "–") + '</text>',
      // P badge
      '<rect x="4" y="6" width="44" height="28" rx="5" fill="'+acc+'" opacity=".12"/>',
      '<text x="26" y="17" text-anchor="middle" font-size="10" font-weight="700" fill="'+acc+'">P</text>',
      '<text x="26" y="30" text-anchor="middle" font-size="9" fill="'+mut+'">' + (res ? fmtSI(res.P,"W") : "–") + '</text>',
    ].join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var inputs = IDS.map(function(id){ return document.getElementById(id); });
    var msg    = document.getElementById("message");

    // Track entry order — recentOrder[0] is most-recently-typed field index.
    // We always solve from the 2 most-recent fields and recompute the other 2.
    var recentOrder = [];

    inputs.forEach(function(inp, idx) {
      inp.addEventListener("input", function() {
        recentOrder = recentOrder.filter(function(i){ return i !== idx; });
        if (inp.value.trim() !== "") recentOrder.unshift(idx);
        recalc();
      });
    });

    document.getElementById("clearBtn").addEventListener("click", function() {
      inputs.forEach(function(inp, i){ inp.value = ""; inp.classList.remove("is-computed"); });
      TILES.forEach(function(t){ document.getElementById(t).classList.remove("computed"); });
      recentOrder = [];
      msg.className = "msg hidden";
      renderTriangle(null);
    });

    function recalc() {
      msg.className = "msg hidden";

      // Parse all fields
      var vals = inputs.map(function(inp){ return parse(inp.value); });

      // Find the 2 most-recently-typed fields that have valid values
      var active = recentOrder.filter(function(i){
        return vals[i] !== null && !isNaN(vals[i]);
      }).slice(0, 2);

      if (active.length < 2) {
        // Clear computed fields (any that are NOT in recentOrder)
        inputs.forEach(function(inp, i){
          if (recentOrder.indexOf(i) === -1) {
            inp.value = ""; inp.classList.remove("is-computed");
            document.getElementById(TILES[i]).classList.remove("computed");
          }
        });
        renderTriangle(null); return;
      }

      // Check for parse errors on the 2 active fields
      var hasErr = active.some(function(i){ return isNaN(vals[i]); });
      if (hasErr) {
        msg.className = "msg error"; msg.textContent = "Invalid input value.";
        renderTriangle(null); return;
      }

      // Build solve args — only the 2 active fields are set
      var sv = [null, null, null, null];
      active.forEach(function(i){ sv[i] = vals[i]; });

      var res = solve(sv[0], sv[1], sv[2], sv[3]);
      if (!res) { renderTriangle(null); return; }

      var filled = [res.V, res.I, res.R, res.P];
      inputs.forEach(function(inp, i) {
        var tile = document.getElementById(TILES[i]);
        if (active.indexOf(i) === -1) {
          inp.value = fmtSI(filled[i], UNITS[i]);
          inp.classList.add("is-computed");
          tile.classList.add("computed");
        } else {
          inp.classList.remove("is-computed");
          tile.classList.remove("computed");
        }
      });

      renderTriangle(res);
    }

    renderTriangle(null);
  });
})();
