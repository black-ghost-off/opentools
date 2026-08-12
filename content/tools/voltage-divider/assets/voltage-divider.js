// Voltage Divider — live SVG schematic + calc and solve modes.
(function () {
  "use strict";

  function parseR(s) {
    if (!s || !s.trim()) return NaN;
    s = s.trim().toLowerCase().replace(/\s/g,"");
    var m = s.match(/^([+-]?\d*\.?\d+)([kmg]?)$/);
    if (!m) return NaN;
    var v = parseFloat(m[1]);
    if (m[2]==="k") v*=1e3; else if (m[2]==="m") v*=1e6; else if (m[2]==="g") v*=1e9;
    return v;
  }

  function fmtR(ohm) {
    if (!isFinite(ohm)||isNaN(ohm)) return "—";
    if (ohm>=1e6) return (ohm/1e6).toPrecision(4)+" MΩ";
    if (ohm>=1e3) return (ohm/1e3).toPrecision(4)+" kΩ";
    return ohm.toPrecision(4)+" Ω";
  }
  function fmtV(v) {
    if (!isFinite(v)||isNaN(v)) return "—";
    return v.toPrecision(4)+" V";
  }
  function fmtI(a) {
    if (!isFinite(a)||isNaN(a)) return "—";
    if (a<1e-6) return (a*1e9).toPrecision(3)+" nA";
    if (a<1e-3) return (a*1e6).toPrecision(3)+" µA";
    if (a<1)    return (a*1e3).toPrecision(3)+" mA";
    return a.toPrecision(3)+" A";
  }

  var mode = "calc";

  // ── SVG circuit ──────────────────────────────────────────────────────────────
  function renderSVG(vin, r1, r2, vout) {
    var svg = document.getElementById("vdiv-svg");
    var cv  = getComputedStyle(document.documentElement);
    var col = cv.getPropertyValue("--text").trim()||"#1b2430";
    var mut = cv.getPropertyValue("--text-muted").trim()||"#5a6675";
    var acc = cv.getPropertyValue("--accent").trim()||"#2f6df6";
    var brd = cv.getPropertyValue("--border").trim()||"#d9e0ea";
    var ok  = cv.getPropertyValue("--ok").trim()||"#1f9d55";

    var hasVout = isFinite(vout) && !isNaN(vout);
    var voutStr = hasVout ? fmtV(vout) : "Vout";
    var r1Str   = isFinite(r1)&&!isNaN(r1) ? fmtR(r1) : "R1";
    var r2Str   = isFinite(r2)&&!isNaN(r2) ? fmtR(r2) : "R2";
    var vinStr  = isFinite(vin)&&!isNaN(vin) ? fmtV(vin) : "Vin";

    // Layout: wire top to bottom, R1 mid-upper, junction, R2 mid-lower, GND
    // x=70 centre
    var parts = [
      // Top wire
      '<line x1="70" y1="10" x2="70" y2="38" stroke="'+col+'" stroke-width="2" stroke-linecap="round"/>',
      // Vin label
      '<text x="70" y="8" text-anchor="middle" font-size="11" font-weight="700" fill="'+acc+'">'+vinStr+'</text>',
      // R1 body
      '<rect x="52" y="38" width="36" height="52" rx="5" fill="'+brd+'" stroke="'+col+'" stroke-width="1.5"/>',
      '<text x="70" y="60" text-anchor="middle" font-size="9" font-weight="600" fill="'+col+'">R1</text>',
      '<text x="70" y="74" text-anchor="middle" font-size="8" fill="'+mut+'">'+r1Str+'</text>',
      // Wire R1→junction
      '<line x1="70" y1="90" x2="70" y2="118" stroke="'+col+'" stroke-width="2"/>',
      // Vout tap
      '<line x1="70" y1="118" x2="115" y2="118" stroke="'+(hasVout?ok:mut)+'" stroke-width="1.5" stroke-dasharray="4,2"/>',
      '<circle cx="70" cy="118" r="3.5" fill="'+(hasVout?ok:mut)+'"/>',
      '<text x="118" y="122" font-size="10" font-weight="600" fill="'+(hasVout?ok:mut)+'">'+voutStr+'</text>',
      // Wire junction→R2
      '<line x1="70" y1="118" x2="70" y2="128" stroke="'+col+'" stroke-width="2"/>',
      // R2 body
      '<rect x="52" y="128" width="36" height="52" rx="5" fill="'+brd+'" stroke="'+col+'" stroke-width="1.5"/>',
      '<text x="70" y="150" text-anchor="middle" font-size="9" font-weight="600" fill="'+col+'">R2</text>',
      '<text x="70" y="164" text-anchor="middle" font-size="8" fill="'+mut+'">'+r2Str+'</text>',
      // Wire R2→GND
      '<line x1="70" y1="180" x2="70" y2="208" stroke="'+col+'" stroke-width="2"/>',
      // GND symbol
      '<line x1="52" y1="210" x2="88" y2="210" stroke="'+col+'" stroke-width="2"/>',
      '<line x1="58" y1="215" x2="82" y2="215" stroke="'+col+'" stroke-width="1.5"/>',
      '<line x1="64" y1="220" x2="76" y2="220" stroke="'+col+'" stroke-width="1"/>',
      '<text x="70" y="234" text-anchor="middle" font-size="9" fill="'+mut+'">GND</text>',
    ];
    svg.innerHTML = parts.join("");
  }

  function recalc() {
    var msg = document.getElementById("message");
    var results = document.getElementById("results");
    msg.className = "msg hidden";

    var vin, r1, r2, vout, curr;

    if (mode === "calc") {
      vin = parseFloat(document.getElementById("vin").value);
      r1  = parseR(document.getElementById("r1").value);
      r2  = parseR(document.getElementById("r2").value);

      if ([vin,r1,r2].some(function(x){return isNaN(x)||x<=0;})) {
        renderSVG(vin, r1, r2, NaN); results.hidden=true; return;
      }
      vout = vin * r2 / (r1 + r2);
      curr = vin / (r1 + r2);
    } else {
      vin  = parseFloat(document.getElementById("vin2").value);
      var vtgt = parseFloat(document.getElementById("vtgt").value);
      var rknown = parseR(document.getElementById("rknown").value);
      var which  = document.getElementById("rwhich").value;

      if ([vin,vtgt,rknown].some(function(x){return isNaN(x)||x<=0;})) {
        renderSVG(vin, NaN, NaN, NaN); results.hidden=true; return;
      }
      if (vtgt >= vin || vtgt <= 0) {
        msg.className="msg error"; msg.textContent="Target Vout must be between 0 V and Vin.";
        results.hidden=true; return;
      }
      var ratio = vtgt / vin;
      if (which === "r2") { r2=rknown; r1=r2*(1-ratio)/ratio; }
      else                { r1=rknown; r2=r1*ratio/(1-ratio); }
      vout = vin * r2 / (r1 + r2);
      curr = vin / (r1 + r2);
    }

    renderSVG(vin, r1, r2, vout);

    document.getElementById("out-vout").textContent = fmtV(vout);
    document.getElementById("out-r1").textContent   = fmtR(r1);
    document.getElementById("out-r2").textContent   = fmtR(r2);
    document.getElementById("out-cur").textContent  = fmtI(curr);
    results.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", function() {
    // Mode tabs
    document.getElementById("tab-calc").addEventListener("click", function(){
      mode="calc";
      document.getElementById("tab-calc").classList.add("active");
      document.getElementById("tab-solve").classList.remove("active");
      document.getElementById("calc-fields").hidden=false;
      document.getElementById("solve-fields").hidden=true;
      recalc();
    });
    document.getElementById("tab-solve").addEventListener("click", function(){
      mode="solve";
      document.getElementById("tab-solve").classList.add("active");
      document.getElementById("tab-calc").classList.remove("active");
      document.getElementById("solve-fields").hidden=false;
      document.getElementById("calc-fields").hidden=true;
      recalc();
    });

    // Live on all inputs
    ["vin","r1","r2","vin2","vtgt","rknown","rwhich"].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.addEventListener("input", recalc);
      if (el) el.addEventListener("change", recalc);
    });

    renderSVG(5, 10000, 10000, 2.5);
    recalc();
  });
})();
