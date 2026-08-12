// Op-Amp Gain Calculator — inverting / non-inverting with live schematic SVG.
(function () {
  "use strict";

  var E24=[1.0,1.1,1.2,1.3,1.5,1.6,1.8,2.0,2.2,2.4,2.7,3.0,3.3,3.6,3.9,4.3,4.7,5.1,5.6,6.2,6.8,7.5,8.2,9.1];
  function nearestE24(ohm) {
    if(ohm<=0) return 0;
    var exp=Math.floor(Math.log10(ohm)), mant=ohm/Math.pow(10,exp);
    var best=E24[0],bErr=Math.abs(E24[0]-mant);
    E24.forEach(function(v){var e=Math.abs(v-mant);if(e<bErr){bErr=e;best=v;}});
    return best*Math.pow(10,exp);
  }
  function fmtR(o){
    if(!isFinite(o)||isNaN(o)) return "—";
    if(o>=1e6) return (o/1e6).toPrecision(4)+" MΩ";
    if(o>=1e3) return (o/1e3).toPrecision(4)+" kΩ";
    return o.toPrecision(4)+" Ω";
  }

  var config = "non-inverting";

  // ── SVG Schematic ───────────────────────────────────────────────────────────
  // Draw a clean op-amp triangle schematic with R1 and R2 labelled.
  function renderSVG(r1, r2, gainStr) {
    var svg = document.getElementById("oa-svg");
    var cv  = getComputedStyle(document.documentElement);
    var col = cv.getPropertyValue("--text").trim()||"#1b2430";
    var mut = cv.getPropertyValue("--text-muted").trim()||"#5a6675";
    var brd = cv.getPropertyValue("--border").trim()||"#d9e0ea";
    var acc = cv.getPropertyValue("--accent").trim()||"#2f6df6";
    var ok  = cv.getPropertyValue("--ok").trim()||"#1f9d55";

    var r1S = isFinite(r1)&&r1>0 ? fmtR(r1) : "R1";
    var r2S = isFinite(r2)&&r2>0 ? fmtR(r2) : "R2";

    // Op-amp triangle: left=120, apex=y90; pins at 70,80 (+) and 70,100 (-)
    // Triangle points: (120,60) top, (120,120) bottom, (175,90) apex→output
    var parts = [
      // Op-amp body
      '<polygon points="120,55 120,125 178,90" fill="'+brd+'" stroke="'+col+'" stroke-width="1.5"/>',
      // + input label
      '<text x="126" y="84" font-size="11" fill="'+col+'" font-weight="600">+</text>',
      // − input label
      '<text x="126" y="104" font-size="11" fill="'+col+'" font-weight="600">−</text>',
      // Output wire
      '<line x1="178" y1="90" x2="210" y2="90" stroke="'+ok+'" stroke-width="1.5"/>',
      '<text x="212" y="94" font-size="9" font-weight="700" fill="'+ok+'">Vout</text>',
    ];

    if (config === "non-inverting") {
      // Non-inverting: Vin → + pin
      // R1 from − pin to GND (or feedback tap), R2 from output to − pin
      // Layout: Vin on left, + pin at y=80; − pin at y=100
      // Feedback: output → R2 → node → R1 → GND; node connects to − pin

      var xNode = 95; // feedback node x

      parts = parts.concat([
        // Vin → + pin
        '<line x1="10" y1="80" x2="120" y2="80" stroke="'+col+'" stroke-width="1.5"/>',
        '<text x="4" y="84" font-size="9" font-weight="700" fill="'+acc+'">Vin</text>',

        // − pin wire to feedback node
        '<line x1="'+xNode+'" y1="100" x2="120" y2="100" stroke="'+col+'" stroke-width="1.5"/>',
        '<circle cx="'+xNode+'" cy="100" r="3" fill="'+col+'"/>',

        // Feedback: output → down → R2 → node
        '<line x1="195" y1="90" x2="195" y2="140" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="195" y1="140" x2="'+xNode+'" y2="140" stroke="'+col+'" stroke-width="1.5"/>',
        // R2 vertical segment on left
        '<line x1="'+xNode+'" y1="140" x2="'+xNode+'" y2="115" stroke="'+col+'" stroke-width="1.5"/>',
        '<rect x="'+(xNode-12)+'" y="103" width="24" height="14" rx="3" fill="'+brd+'" stroke="'+col+'" stroke-width="1.2"/>',
        '<text x="'+xNode+'" y="112" text-anchor="middle" font-size="7.5" font-weight="600" fill="'+col+'">R2</text>',
        '<text x="'+(xNode-16)+'" y="114" text-anchor="end" font-size="7" fill="'+mut+'">'+r2S+'</text>',

        // R1 vertical below node to GND
        '<line x1="'+xNode+'" y1="140" x2="'+xNode+'" y2="152" stroke="'+col+'" stroke-width="1.5"/>',
        '<rect x="'+(xNode-12)+'" y="152" width="24" height="14" rx="3" fill="'+brd+'" stroke="'+col+'" stroke-width="1.2"/>',
        '<text x="'+xNode+'" y="161" text-anchor="middle" font-size="7.5" font-weight="600" fill="'+col+'">R1</text>',
        '<text x="'+(xNode-16)+'" y="161" text-anchor="end" font-size="7" fill="'+mut+'">'+r1S+'</text>',
        '<line x1="'+xNode+'" y1="166" x2="'+xNode+'" y2="178" stroke="'+col+'" stroke-width="1.5"/>',
        // GND
        '<line x1="'+(xNode-10)+'" y1="178" x2="'+(xNode+10)+'" y2="178" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="'+(xNode-6)+'" y1="182" x2="'+(xNode+6)+'" y2="182" stroke="'+col+'" stroke-width="1.2"/>',
        '<line x1="'+(xNode-3)+'" y1="186" x2="'+(xNode+3)+'" y2="186" stroke="'+col+'" stroke-width="1"/>',
        // Gain label
        '<text x="160" y="44" text-anchor="middle" font-size="9" fill="'+mut+'">Gain = '+gainStr+'</text>',
        '<text x="160" y="56" text-anchor="middle" font-size="8" fill="'+mut+'">1 + R2/R1</text>',
      ]);

    } else {
      // Inverting: Vin → R1 → − pin; R2 feedback from output to − pin; + pin → GND
      var xInv = 80; // − pin node (junction of R1, R2, − pin)

      parts = parts.concat([
        // Vin → R1 → inv node
        '<line x1="10" y1="100" x2="40" y2="100" stroke="'+col+'" stroke-width="1.5"/>',
        '<text x="4" y="104" font-size="9" font-weight="700" fill="'+acc+'">Vin</text>',
        '<rect x="40" y="93" width="26" height="14" rx="3" fill="'+brd+'" stroke="'+col+'" stroke-width="1.2"/>',
        '<text x="53" y="102" text-anchor="middle" font-size="7.5" font-weight="600" fill="'+col+'">R1</text>',
        '<text x="53" y="90" text-anchor="middle" font-size="7" fill="'+mut+'">'+r1S+'</text>',
        '<line x1="66" y1="100" x2="'+xInv+'" y2="100" stroke="'+col+'" stroke-width="1.5"/>',
        '<circle cx="'+xInv+'" cy="100" r="3" fill="'+col+'"/>',
        // inv node → − pin
        '<line x1="'+xInv+'" y1="100" x2="120" y2="100" stroke="'+col+'" stroke-width="1.5"/>',

        // + pin → GND
        '<line x1="80" y1="80" x2="120" y2="80" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="80" y1="80" x2="80" y2="60" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="70" y1="60" x2="90" y2="60" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="74" y1="55" x2="86" y2="55" stroke="'+col+'" stroke-width="1.2"/>',
        '<line x1="78" y1="50" x2="82" y2="50" stroke="'+col+'" stroke-width="1"/>',
        '<text x="80" y="46" text-anchor="middle" font-size="7" fill="'+mut+'">GND</text>',

        // R2 feedback: output → over top → inv node
        '<line x1="195" y1="90" x2="195" y2="30" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="195" y1="30" x2="'+xInv+'" y2="30" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="'+xInv+'" y1="30" x2="'+xInv+'" y2="100" stroke="'+col+'" stroke-width="1.5"/>',
        // R2 on top wire
        '<rect x="117" y="23" width="26" height="14" rx="3" fill="'+brd+'" stroke="'+col+'" stroke-width="1.2"/>',
        '<text x="130" y="32" text-anchor="middle" font-size="7.5" font-weight="600" fill="'+col+'">R2</text>',
        '<text x="130" y="20" text-anchor="middle" font-size="7" fill="'+mut+'">'+r2S+'</text>',

        // Gain label
        '<text x="160" y="160" text-anchor="middle" font-size="9" fill="'+mut+'">Gain = '+gainStr+'</text>',
        '<text x="160" y="172" text-anchor="middle" font-size="8" fill="'+mut+'">−R2 / R1</text>',
      ]);
    }

    svg.innerHTML = parts.join("");
  }

  function recalc() {
    var gain = parseFloat(document.getElementById("gain-target").value);
    var r1   = parseFloat(document.getElementById("r1-fixed").value);
    var msg  = document.getElementById("message");
    var res  = document.getElementById("results");

    if (isNaN(gain)||gain<=0) { renderSVG(r1,NaN,"?"); res.hidden=true; return; }
    if (isNaN(r1)||r1<=0)    { renderSVG(NaN,NaN,"?"); res.hidden=true; return; }
    if (config==="non-inverting"&&gain<1) {
      msg.className="msg error"; msg.textContent="Non-inverting gain must be ≥ 1.";
      res.hidden=true; return;
    }
    msg.className="msg hidden";

    var r2, gainActual, gainStr;
    if (config==="non-inverting") {
      r2 = r1*(gain-1);
      var r2e24 = nearestE24(r2);
      gainActual = 1+r2e24/r1;
      gainStr = gain.toPrecision(4)+"×";
      document.getElementById("out-gain").textContent       = "+"+gainStr;
      document.getElementById("out-r2e24").textContent      = fmtR(r2e24);
      document.getElementById("out-gain-actual").textContent= "+"+gainActual.toPrecision(4)+"×";
      renderSVG(r1, r2e24, "+"+gainStr);
    } else {
      r2 = r1*gain;
      var r2e24 = nearestE24(r2);
      gainActual = r2e24/r1;
      gainStr = gain.toPrecision(4)+"×";
      document.getElementById("out-gain").textContent       = "−"+gainStr;
      document.getElementById("out-r2e24").textContent      = fmtR(r2e24);
      document.getElementById("out-gain-actual").textContent= "−"+gainActual.toPrecision(4)+"×";
      renderSVG(r1, r2e24, "−"+gainStr);
    }
    document.getElementById("out-r1").textContent = fmtR(r1);
    document.getElementById("out-r2").textContent = fmtR(r2);
    res.hidden = false;
  }

  function setConfig(c) {
    config = c;
    document.getElementById("tab-ninv").classList.toggle("active", c==="non-inverting");
    document.getElementById("tab-inv").classList.toggle("active",  c==="inverting");
    document.getElementById("gain-hint").textContent =
      c==="non-inverting" ? "≥ 1 (e.g. 10 = +10×)" : "magnitude (e.g. 10 = −10×)";
    document.getElementById("r1-hint").textContent =
      c==="non-inverting" ? "R1: bottom of feedback divider → GND" : "R1: series input resistor";
    recalc();
  }

  document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("tab-ninv").addEventListener("click",function(){setConfig("non-inverting");});
    document.getElementById("tab-inv").addEventListener("click", function(){setConfig("inverting");});
    ["gain-target","r1-fixed"].forEach(function(id){
      document.getElementById(id).addEventListener("input", recalc);
    });
    setConfig("non-inverting");
  });
})();
