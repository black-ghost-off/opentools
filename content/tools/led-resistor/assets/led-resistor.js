// LED Series Resistor — live SVG circuit + E24 suggestion.
(function () {
  "use strict";

  var E24=[1.0,1.1,1.2,1.3,1.5,1.6,1.8,2.0,2.2,2.4,2.7,3.0,3.3,3.6,3.9,4.3,4.7,5.1,5.6,6.2,6.8,7.5,8.2,9.1];

  function nearestE24(ohm) {
    if (ohm<=0) return 0;
    var exp=Math.floor(Math.log10(ohm)), mant=ohm/Math.pow(10,exp);
    var best=E24[0],bestErr=Math.abs(E24[0]-mant);
    E24.forEach(function(v){var e=Math.abs(v-mant);if(e<bestErr){bestErr=e;best=v;}});
    return best*Math.pow(10,exp);
  }

  function fmtR(ohm){
    if(!isFinite(ohm)) return "—";
    if(ohm>=1e6) return (ohm/1e6).toPrecision(4)+" MΩ";
    if(ohm>=1e3) return (ohm/1e3).toPrecision(4)+" kΩ";
    return ohm.toPrecision(4)+" Ω";
  }
  function fmtP(w){if(!isFinite(w)) return "—"; if(w<1) return (w*1e3).toPrecision(3)+" mW"; return w.toPrecision(3)+" W";}
  function fmtI(a){if(!isFinite(a)) return "—"; return (a*1e3).toPrecision(3)+" mA";}

  var ledColor = "#e74c3c";

  function renderSVG(vs, vf, ifA, r, n, ok) {
    var svg = document.getElementById("led-svg");
    var cv  = getComputedStyle(document.documentElement);
    var col = cv.getPropertyValue("--text").trim()||"#1b2430";
    var mut = cv.getPropertyValue("--text-muted").trim()||"#5a6675";
    var brd = cv.getPropertyValue("--border").trim()||"#d9e0ea";
    var acc = cv.getPropertyValue("--accent").trim()||"#2f6df6";
    var totalVf = isFinite(vf)&&isFinite(n) ? vf*n : NaN;

    var parts = [
      // Top wire + Vs label
      '<line x1="40" y1="0" x2="40" y2="18" stroke="'+col+'" stroke-width="2" stroke-linecap="round"/>',
      '<text x="40" y="-2" text-anchor="middle" font-size="9" font-weight="700" fill="'+acc+'">'+(isFinite(vs)?vs.toPrecision(3)+' V':'Vs')+'</text>',
      // Resistor box
      '<rect x="22" y="18" width="36" height="34" rx="4" fill="'+brd+'" stroke="'+col+'" stroke-width="1.5"/>',
      '<text x="40" y="32" text-anchor="middle" font-size="8" font-weight="600" fill="'+col+'">R</text>',
      '<text x="40" y="44" text-anchor="middle" font-size="7.5" fill="'+mut+'">'+(ok?fmtR(r):'?')+'</text>',
      // Wire R→LED
      '<line x1="40" y1="52" x2="40" y2="80" stroke="'+col+'" stroke-width="2"/>',
      // LED triangle (pointing down = conventional current direction)
      '<polygon points="24,80 56,80 40,108" fill="'+ledColor+'" stroke="'+col+'" stroke-width="1.5" opacity=".85"/>',
      '<line x1="24" y1="108" x2="56" y2="108" stroke="'+col+'" stroke-width="2"/>',
      // LED light rays
      ok ? '<line x1="58" y1="84" x2="68" y2="76" stroke="'+ledColor+'" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>' : '',
      ok ? '<line x1="60" y1="92" x2="72" y2="86" stroke="'+ledColor+'" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>' : '',
      // Vf label
      '<text x="14" y="98" text-anchor="end" font-size="7.5" fill="'+mut+'">'+(isFinite(totalVf)?(totalVf.toPrecision(3)+' V'):'Vf')+'</text>',
      // Wire LED→GND
      '<line x1="40" y1="108" x2="40" y2="136" stroke="'+col+'" stroke-width="2"/>',
      // Voltage label Vr
      ok ? '<text x="14" y="42" text-anchor="end" font-size="7.5" fill="'+mut+'">Vr='+(vs-totalVf).toPrecision(3)+'V</text>' : '',
      // GND
      '<line x1="22" y1="138" x2="58" y2="138" stroke="'+col+'" stroke-width="2"/>',
      '<line x1="28" y1="143" x2="52" y2="143" stroke="'+col+'" stroke-width="1.5"/>',
      '<line x1="34" y1="148" x2="46" y2="148" stroke="'+col+'" stroke-width="1"/>',
      '<text x="40" y="162" text-anchor="middle" font-size="8" fill="'+mut+'">GND</text>',
    ];
    svg.innerHTML = parts.join("");
  }

  function recalc() {
    var vs    = parseFloat(document.getElementById("vsupply").value);
    var vf    = parseFloat(document.getElementById("vf").value);
    var ifmA  = parseFloat(document.getElementById("lif").value);
    var n     = parseInt(document.getElementById("numLeds").value, 10);
    var msg   = document.getElementById("message");
    var res   = document.getElementById("results");

    if ([vs,vf,ifmA,n].some(isNaN)||ifmA<=0||n<1) {
      renderSVG(vs,vf,0,0,n,false); res.hidden=true; return;
    }
    var totalVf = vf*n;
    if (vs <= totalVf) {
      msg.className="msg error";
      msg.textContent="Supply must exceed total Vf ("+totalVf.toFixed(2)+" V).";
      renderSVG(vs,vf,0,0,n,false); res.hidden=true; return;
    }
    msg.className="msg hidden";

    var ifA   = ifmA/1000;
    var vr    = vs-totalVf;
    var r     = vr/ifA;
    var rE24  = nearestE24(r);
    var pw    = vr*ifA;
    var iaE24 = vr/rE24;

    renderSVG(vs, vf, ifA, r, n, true);

    document.getElementById("out-r").textContent   = fmtR(r);
    document.getElementById("out-e24").textContent = fmtR(rE24);
    document.getElementById("out-pw").textContent  = fmtP(pw)+" (use ≥ "+fmtP(pw*2)+" rated)";
    document.getElementById("out-ia").textContent  = fmtI(iaE24);
    res.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", function() {
    ["vsupply","vf","lif","numLeds"].forEach(function(id){
      document.getElementById(id).addEventListener("input", recalc);
    });

    document.querySelectorAll(".led-preset").forEach(function(btn){
      btn.addEventListener("click", function(){
        document.getElementById("vf").value = btn.dataset.vf;
        ledColor = btn.dataset.color;
        recalc();
      });
    });

    renderSVG(5, 2.0, 0.02, 150, 1, true);
    recalc();
  });
})();
