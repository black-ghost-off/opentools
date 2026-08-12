// RC/RL/LC Filter — live schematic SVG + cutoff calculator.
(function () {
  "use strict";

  function parseSI(s) {
    if (!s||!s.trim()) return NaN;
    s=s.trim().toLowerCase();
    var m=s.match(/^([+-]?\d*\.?\d+)\s*([kmguµnpf]?)$/);
    if (!m) return NaN;
    var v=parseFloat(m[1]);
    var map={k:1e3,m:1e-3,g:1e9,u:1e-6,µ:1e-6,n:1e-9,p:1e-12};
    if (m[2]&&map[m[2]]!==undefined) v*=map[m[2]];
    return v;
  }

  function fmtHz(f){
    if(!isFinite(f)) return "—";
    if(f>=1e9) return (f/1e9).toPrecision(4)+" GHz";
    if(f>=1e6) return (f/1e6).toPrecision(4)+" MHz";
    if(f>=1e3) return (f/1e3).toPrecision(4)+" kHz";
    return f.toPrecision(4)+" Hz";
  }
  function fmtTime(s){
    if(!isFinite(s)) return "—";
    if(s>=1) return s.toPrecision(4)+" s";
    if(s>=1e-3) return (s*1e3).toPrecision(4)+" ms";
    if(s>=1e-6) return (s*1e6).toPrecision(4)+" µs";
    return (s*1e9).toPrecision(4)+" ns";
  }
  function fmtR(o){
    if(!isFinite(o)) return "—";
    if(o>=1e6) return (o/1e6).toPrecision(4)+" MΩ";
    if(o>=1e3) return (o/1e3).toPrecision(4)+" kΩ";
    return o.toPrecision(4)+" Ω";
  }

  // ── SVG schematics ──────────────────────────────────────────────────────────
  function renderSVG(type, R, C, L) {
    var svg = document.getElementById("filt-svg");
    var cv  = getComputedStyle(document.documentElement);
    var col = cv.getPropertyValue("--text").trim()||"#1b2430";
    var mut = cv.getPropertyValue("--text-muted").trim()||"#5a6675";
    var brd = cv.getPropertyValue("--border").trim()||"#d9e0ea";
    var acc = cv.getPropertyValue("--accent").trim()||"#2f6df6";

    var rStr = isFinite(R) ? fmtR(R) : "R";
    var cStr = isFinite(C) ? (C*1e9).toPrecision(3)+"nF" : "C";
    if (isFinite(C)&&C>=1e-6) cStr=(C*1e6).toPrecision(3)+"µF";
    var lStr = isFinite(L) ? (L*1e3).toPrecision(3)+"mH" : "L";
    if (isFinite(L)&&L>=1) lStr=L.toPrecision(3)+"H";
    if (isFinite(L)&&L<1e-3) lStr=(L*1e6).toPrecision(3)+"µH";

    // Helper drawing functions
    function resistor(x,y,lbl,val) {
      return '<rect x="'+(x-18)+'" y="'+(y-10)+'" width="36" height="20" rx="3" fill="'+brd+'" stroke="'+col+'" stroke-width="1.5"/>'+
             '<text x="'+x+'" y="'+(y-13)+'" text-anchor="middle" font-size="8" font-weight="600" fill="'+col+'">'+lbl+'</text>'+
             '<text x="'+x+'" y="'+(y+4)+'" text-anchor="middle" font-size="7" fill="'+mut+'">'+val+'</text>';
    }
    function resistorV(x,y,lbl,val) { // vertical
      return '<rect x="'+(x-10)+'" y="'+(y-18)+'" width="20" height="36" rx="3" fill="'+brd+'" stroke="'+col+'" stroke-width="1.5"/>'+
             '<text x="'+(x+13)+'" y="'+(y-2)+'" font-size="8" font-weight="600" fill="'+col+'">'+lbl+'</text>'+
             '<text x="'+(x+13)+'" y="'+(y+9)+'" font-size="7" fill="'+mut+'">'+val+'</text>';
    }
    function capacitorV(x,y,lbl,val) { // vertical (two plates)
      return '<line x1="'+x+'" y1="'+(y-12)+'" x2="'+x+'" y2="'+(y-5)+'" stroke="'+col+'" stroke-width="1.5"/>'+
             '<line x1="'+(x-12)+'" y1="'+(y-5)+'" x2="'+(x+12)+'" y2="'+(y-5)+'" stroke="'+col+'" stroke-width="2"/>'+
             '<line x1="'+(x-12)+'" y1="'+(y+5)+'" x2="'+(x+12)+'" y2="'+(y+5)+'" stroke="'+col+'" stroke-width="2"/>'+
             '<line x1="'+x+'" y1="'+(y+5)+'" x2="'+x+'" y2="'+(y+12)+'" stroke="'+col+'" stroke-width="1.5"/>'+
             '<text x="'+(x+15)+'" y="'+(y-2)+'" font-size="8" font-weight="600" fill="'+col+'">'+lbl+'</text>'+
             '<text x="'+(x+15)+'" y="'+(y+9)+'" font-size="7" fill="'+mut+'">'+val+'</text>';
    }
    function inductorH(x,y,lbl,val,w) { // horizontal inductor (series of bumps)
      var n=4, bumpW=w/n, parts2=[];
      for (var i=0;i<n;i++) {
        var cx=x+i*bumpW+bumpW/2, r2=bumpW/2;
        parts2.push('<path d="M'+(cx-r2)+','+y+' a'+r2+','+r2+' 0 0 1 '+bumpW+',0" fill="none" stroke="'+col+'" stroke-width="1.5"/>');
      }
      parts2.push('<text x="'+(x+w/2)+'" y="'+(y-14)+'" text-anchor="middle" font-size="8" font-weight="600" fill="'+col+'">'+lbl+'</text>');
      parts2.push('<text x="'+(x+w/2)+'" y="'+(y-5)+'" text-anchor="middle" font-size="7" fill="'+mut+'">'+val+'</text>');
      return parts2.join("");
    }

    var parts;

    if (type==="rc-lp" || type==="rc-hp") {
      var isLP = type==="rc-lp";
      parts=[
        // Vin label + left wire
        '<text x="4" y="72" font-size="9" font-weight="600" fill="'+acc+'">Vin</text>',
        '<line x1="28" y1="70" x2="58" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
        // R horizontal
        resistor(76,70,"R",rStr),
        '<line x1="94" y1="70" x2="120" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
        // Vout tap + label
        '<circle cx="120" cy="70" r="3" fill="'+(isLP?acc:mut)+'"/>',
        '<text x="124" y="68" font-size="9" font-weight="600" fill="'+(isLP?acc:mut)+'">Vout</text>',
        // Right wire to edge
        '<line x1="120" y1="70" x2="170" y2="70" stroke="'+(isLP?acc:col)+'" stroke-width="1.5"/>',
        // Bottom wire (return)
        '<line x1="28" y1="70" x2="28" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="28" y1="130" x2="170" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="170" y1="70" x2="170" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
        // C vertical (to GND) or between nodes
      ];
      if (isLP) {
        // C goes from Vout node to GND
        parts.push('<line x1="120" y1="70" x2="120" y2="95" stroke="'+col+'" stroke-width="1.5"/>');
        parts.push(capacitorV(120,107,"C",cStr));
        parts.push('<line x1="120" y1="120" x2="120" y2="130" stroke="'+col+'" stroke-width="1.5"/>');
        parts.push('<text x="10" y="132" font-size="8" fill="'+mut+'">GND</text>');
      } else {
        // C in series before R: Vin → C → R → Vout, Vin node is left
        // Redraw: Vin → [C horiz] → [R horiz] → Vout
        parts=[
          '<text x="4" y="72" font-size="9" font-weight="600" fill="'+acc+'">Vin</text>',
          '<line x1="28" y1="70" x2="44" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
          // C horizontal (two vertical plates)
          '<line x1="44" y1="58" x2="44" y2="82" stroke="'+col+'" stroke-width="2"/>',
          '<line x1="52" y1="58" x2="52" y2="82" stroke="'+col+'" stroke-width="2"/>',
          '<line x1="44" y1="70" x2="38" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
          '<line x1="52" y1="70" x2="58" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
          '<text x="48" y="54" text-anchor="middle" font-size="8" font-weight="600" fill="'+col+'">C</text>',
          '<text x="48" y="92" text-anchor="middle" font-size="7" fill="'+mut+'">'+cStr+'</text>',
          '<line x1="58" y1="70" x2="76" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
          resistor(94,70,"R",rStr),
          '<line x1="112" y1="70" x2="140" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
          '<circle cx="140" cy="70" r="3" fill="'+acc+'"/>',
          '<text x="144" y="68" font-size="9" font-weight="600" fill="'+acc+'">Vout</text>',
          '<line x1="28" y1="70" x2="28" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
          '<line x1="28" y1="130" x2="170" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
          '<line x1="140" y1="70" x2="170" y2="70" stroke="'+acc+'" stroke-width="1.5"/>',
          '<line x1="170" y1="70" x2="170" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
          '<text x="10" y="132" font-size="8" fill="'+mut+'">GND</text>',
        ];
      }
    } else if (type==="rl-lp" || type==="rl-hp") {
      var isLP2 = type==="rl-lp";
      parts=[
        '<text x="4" y="72" font-size="9" font-weight="600" fill="'+acc+'">Vin</text>',
        '<line x1="28" y1="70" x2="46" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
        // L horizontal (bumps)
        inductorH(46,70,"L",lStr,52),
        '<line x1="98" y1="70" x2="120" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
        '<circle cx="120" cy="70" r="3" fill="'+(isLP2?acc:mut)+'"/>',
        '<text x="124" y="68" font-size="9" font-weight="600" fill="'+(isLP2?acc:mut)+'">Vout</text>',
        '<line x1="120" y1="70" x2="170" y2="70" stroke="'+(isLP2?acc:col)+'" stroke-width="1.5"/>',
        '<line x1="28" y1="70" x2="28" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="28" y1="130" x2="170" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="170" y1="70" x2="170" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
      ];
      if (isLP2) {
        parts.push('<line x1="120" y1="70" x2="120" y2="90" stroke="'+col+'" stroke-width="1.5"/>');
        parts.push(resistorV(120,105,"R",rStr));
        parts.push('<line x1="120" y1="120" x2="120" y2="130" stroke="'+col+'" stroke-width="1.5"/>');
      } else {
        parts.push('<circle cx="28" cy="70" r="3" fill="'+acc+'"/>');
        parts.push('<text x="4" y="65" font-size="9" font-weight="600" fill="'+acc+'">Vout</text>');
        parts.push('<line x1="28" y1="70" x2="28" y2="90" stroke="'+col+'" stroke-width="1.5"/>');
        parts.push(resistorV(28,105,"R",rStr));
        parts.push('<line x1="28" y1="120" x2="28" y2="130" stroke="'+col+'" stroke-width="1.5"/>');
      }
    } else { // LC
      parts=[
        '<text x="4" y="72" font-size="9" font-weight="600" fill="'+acc+'">Vin</text>',
        '<line x1="28" y1="70" x2="46" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
        inductorH(46,70,"L",lStr,48),
        '<line x1="94" y1="70" x2="110" y2="70" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="110" y1="70" x2="110" y2="90" stroke="'+col+'" stroke-width="1.5"/>',
        capacitorV(110,104,"C",cStr),
        '<line x1="110" y1="116" x2="110" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
        '<circle cx="110" cy="70" r="3" fill="'+acc+'"/>',
        '<text x="114" y="68" font-size="9" font-weight="600" fill="'+acc+'">Vout</text>',
        '<line x1="28" y1="70" x2="28" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="28" y1="130" x2="170" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="110" y1="130" x2="170" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="170" y1="70" x2="170" y2="130" stroke="'+col+'" stroke-width="1.5"/>',
        '<line x1="110" y1="70" x2="170" y2="70" stroke="'+acc+'" stroke-width="1.5"/>',
      ];
    }

    svg.innerHTML = parts.join("");
  }

  function recalc() {
    var type = document.getElementById("filterType").value;
    var R    = parseSI(document.getElementById("r-val").value);
    var C    = parseSI(document.getElementById("c-val").value);
    var L    = parseSI(document.getElementById("l-val").value);
    var msg  = document.getElementById("message");
    var res  = document.getElementById("results");

    var hasR = !isNaN(R)&&R>0, hasC=!isNaN(C)&&C>0, hasL=!isNaN(L)&&L>0;
    renderSVG(type, hasR?R:NaN, hasC?C:NaN, hasL?L:NaN);

    msg.className="msg hidden";
    var fc, tau, z0;

    if (type==="rc-lp"||type==="rc-hp") {
      if (!hasR||!hasC){res.hidden=true;return;}
      tau=R*C; fc=1/(2*Math.PI*tau);
      document.getElementById("stat-tau").hidden=false;
      document.getElementById("stat-z0").hidden=true;
      document.getElementById("out-tau").textContent=fmtTime(tau);
    } else if (type==="rl-lp"||type==="rl-hp") {
      if (!hasR||!hasL){res.hidden=true;return;}
      tau=L/R; fc=R/(2*Math.PI*L);
      document.getElementById("stat-tau").hidden=false;
      document.getElementById("stat-z0").hidden=true;
      document.getElementById("out-tau").textContent=fmtTime(tau);
    } else {
      if (!hasL||!hasC){res.hidden=true;return;}
      fc=1/(2*Math.PI*Math.sqrt(L*C));
      z0=Math.sqrt(L/C);
      document.getElementById("stat-tau").hidden=true;
      document.getElementById("stat-z0").hidden=false;
      document.getElementById("out-z0").textContent=fmtR(z0);
    }

    document.getElementById("out-fc").textContent  = fmtHz(fc);
    document.getElementById("out-3db").textContent = fmtHz(fc);
    res.hidden = false;
  }

  function updateFields() {
    var t = document.getElementById("filterType").value;
    document.getElementById("r-field").hidden = (t==="lc");
    document.getElementById("c-field").hidden = (t==="rl-lp"||t==="rl-hp");
    document.getElementById("l-field").hidden = (t==="rc-lp"||t==="rc-hp");
    recalc();
  }

  document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("filterType").addEventListener("change", updateFields);
    ["r-val","c-val","l-val"].forEach(function(id){
      document.getElementById(id).addEventListener("input", recalc);
    });
    updateFields();
  });
})();
