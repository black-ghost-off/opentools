// Wheatstone Bridge — live diamond SVG + live calculation.
(function () {
  "use strict";

  function parseR(s){
    if(!s||!s.trim()) return NaN;
    s=s.trim().toLowerCase();
    var m=s.match(/^([+-]?\d*\.?\d+)([kmg]?)$/);
    if(!m) return NaN;
    var v=parseFloat(m[1]);
    if(m[2]==="k")v*=1e3; else if(m[2]==="m")v*=1e6; else if(m[2]==="g")v*=1e9;
    return v;
  }
  function fmtV(v){if(!isFinite(v)||isNaN(v)) return "—"; return v.toPrecision(4)+" V";}
  function fmtR(o){
    if(!isFinite(o)||isNaN(o)) return "?";
    if(o>=1e6) return (o/1e6).toPrecision(4)+"MΩ";
    if(o>=1e3) return (o/1e3).toPrecision(3)+"kΩ";
    return o.toPrecision(3)+"Ω";
  }

  // ── SVG diamond bridge ──────────────────────────────────────────────────────
  // Diamond layout: top=Vex, left=V+, right=V-, bottom=GND, diag=Vout meter
  //  R1: top→left   R2: top→right
  //  R3: left→bot   R4: right→bot
  function renderSVG(vex, r1, r2, r3, r4, vp, vm, vout) {
    var svg = document.getElementById("wb-svg");
    var cv  = getComputedStyle(document.documentElement);
    var col = cv.getPropertyValue("--text").trim()||"#1b2430";
    var mut = cv.getPropertyValue("--text-muted").trim()||"#5a6675";
    var brd = cv.getPropertyValue("--border").trim()||"#d9e0ea";
    var acc = cv.getPropertyValue("--accent").trim()||"#2f6df6";
    var ok  = cv.getPropertyValue("--ok").trim()||"#1f9d55";
    var dan = cv.getPropertyValue("--danger").trim()||"#d64545";

    // Node positions
    var T={x:100,y:20};    // top (Vex)
    var L={x:24, y:110};   // left (V+)
    var R={x:176,y:110};   // right (V-)
    var B={x:100,y:200};   // bottom (GND)

    var hasResult = isFinite(vout)&&!isNaN(vout);
    var voutColor = !hasResult ? mut : (Math.abs(vout)<1e-6 ? ok : (vout>0?acc:dan));

    function midPt(a,b,t){return{x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t};}
    function resistorOnWire(a,b,lbl,val) {
      var m=midPt(a,b,0.5);
      var dx=b.x-a.x, dy=b.y-a.y, len=Math.sqrt(dx*dx+dy*dy);
      var nx=-dy/len, ny=dx/len; // normal
      var hw=14, hl=22;
      var corners=[
        {x:m.x-dx/len*hl+nx*hw, y:m.y-dy/len*hl+ny*hw},
        {x:m.x+dx/len*hl+nx*hw, y:m.y+dy/len*hl+ny*hw},
        {x:m.x+dx/len*hl-nx*hw, y:m.y+dy/len*hl-ny*hw},
        {x:m.x-dx/len*hl-nx*hw, y:m.y-dy/len*hl-ny*hw}
      ];
      var pts=corners.map(function(c){return c.x+","+c.y;}).join(" ");
      var lx=m.x+nx*28, ly=m.y+ny*28;
      return '<polygon points="'+pts+'" fill="'+brd+'" stroke="'+col+'" stroke-width="1.2"/>'+
             '<text x="'+m.x+'" y="'+(m.y+4)+'" text-anchor="middle" font-size="8.5" font-weight="600" fill="'+col+'">'+lbl+'</text>'+
             '<text x="'+lx+'" y="'+(ly+3)+'" text-anchor="middle" font-size="7.5" fill="'+mut+'">'+val+'</text>';
    }

    var parts=[
      // Vex label and node
      '<text x="'+T.x+'" y="12" text-anchor="middle" font-size="10" font-weight="700" fill="'+acc+'">'+(isFinite(vex)?vex.toPrecision(3)+"V":"Vex")+'</text>',
      '<circle cx="'+T.x+'" cy="'+T.y+'" r="4" fill="'+acc+'"/>',

      // GND node + symbol
      '<circle cx="'+B.x+'" cy="'+B.y+'" r="3" fill="'+col+'"/>',
      '<line x1="'+(B.x-10)+'" y1="'+(B.y+4)+'" x2="'+(B.x+10)+'" y2="'+(B.y+4)+'" stroke="'+col+'" stroke-width="1.5"/>',
      '<line x1="'+(B.x-6)+'" y1="'+(B.y+8)+'" x2="'+(B.x+6)+'" y2="'+(B.y+8)+'" stroke="'+col+'" stroke-width="1.2"/>',
      '<line x1="'+(B.x-2)+'" y1="'+(B.y+12)+'" x2="'+(B.x+2)+'" y2="'+(B.y+12)+'" stroke="'+col+'" stroke-width="1"/>',

      // Left node V+
      '<circle cx="'+L.x+'" cy="'+L.y+'" r="4" fill="'+(hasResult?acc:col)+'"/>',
      '<text x="'+(L.x-8)+'" y="'+(L.y-7)+'" text-anchor="end" font-size="9" font-weight="600" fill="'+(hasResult?acc:mut)+'">V+</text>',
      hasResult?'<text x="'+(L.x-8)+'" y="'+(L.y+5)+'" text-anchor="end" font-size="8" fill="'+acc+'">'+fmtV(vp)+'</text>':"",

      // Right node V-
      '<circle cx="'+R.x+'" cy="'+R.y+'" r="4" fill="'+(hasResult?dan:col)+'"/>',
      '<text x="'+(R.x+8)+'" y="'+(R.y-7)+'" font-size="9" font-weight="600" fill="'+(hasResult?dan:mut)+'">V−</text>',
      hasResult?'<text x="'+(R.x+8)+'" y="'+(R.y+5)+'" font-size="8" fill="'+dan+'">'+fmtV(vm)+'</text>':"",

      // Wires (behind resistors)
      '<line x1="'+T.x+'" y1="'+T.y+'" x2="'+L.x+'" y2="'+L.y+'" stroke="'+col+'" stroke-width="1.5" opacity=".3"/>',
      '<line x1="'+T.x+'" y1="'+T.y+'" x2="'+R.x+'" y2="'+R.y+'" stroke="'+col+'" stroke-width="1.5" opacity=".3"/>',
      '<line x1="'+L.x+'" y1="'+L.y+'" x2="'+B.x+'" y2="'+B.y+'" stroke="'+col+'" stroke-width="1.5" opacity=".3"/>',
      '<line x1="'+R.x+'" y1="'+R.y+'" x2="'+B.x+'" y2="'+B.y+'" stroke="'+col+'" stroke-width="1.5" opacity=".3"/>',

      // Resistors on arms
      resistorOnWire(T,L,"R1",fmtR(r1)),
      resistorOnWire(T,R,"R2",fmtR(r2)),
      resistorOnWire(L,B,"R3",fmtR(r3)),
      resistorOnWire(R,B,"R4",fmtR(r4)),

      // Vout voltmeter line between L and R
      '<line x1="'+L.x+'" y1="'+L.y+'" x2="'+R.x+'" y2="'+R.y+'" stroke="'+voutColor+'" stroke-width="1.5" stroke-dasharray="5,3"/>',
      '<circle cx="100" cy="110" r="14" fill="none" stroke="'+voutColor+'" stroke-width="1.5"/>',
      '<text x="100" y="107" text-anchor="middle" font-size="7" font-weight="700" fill="'+voutColor+'">V</text>',
      '<text x="100" y="116" text-anchor="middle" font-size="7" fill="'+voutColor+'">'+(hasResult?fmtV(vout):"out")+'</text>',
    ];

    svg.innerHTML = parts.join("");
  }

  function recalc() {
    var vex = parseFloat(document.getElementById("vex").value);
    var r1  = parseR(document.getElementById("wb-r1").value);
    var r2  = parseR(document.getElementById("wb-r2").value);
    var r3  = parseR(document.getElementById("wb-r3").value);
    var r4  = parseR(document.getElementById("wb-r4").value);
    var msg = document.getElementById("message");
    var res = document.getElementById("results");

    if ([vex,r1,r2,r3,r4].some(function(x){return isNaN(x)||x<=0;})) {
      renderSVG(vex,r1,r2,r3,r4,NaN,NaN,NaN); res.hidden=true; return;
    }
    msg.className="msg hidden";

    var vp   = vex*r3/(r1+r3);
    var vm   = vex*r4/(r2+r4);
    var vout = vp-vm;
    var balanced = Math.abs(r1/r3-r2/r4)<1e-6;

    renderSVG(vex,r1,r2,r3,r4,vp,vm,vout);

    document.getElementById("out-vout").textContent = fmtV(vout)+(Math.abs(vout)<1e-6?" ✓":"");
    document.getElementById("out-vp").textContent   = fmtV(vp);
    document.getElementById("out-vm").textContent   = fmtV(vm);
    document.getElementById("out-bal").textContent  = balanced
      ? "Balanced" : (vout>0?"V+ > V−":"V− > V+");
    res.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", function() {
    ["vex","wb-r1","wb-r2","wb-r3","wb-r4"].forEach(function(id){
      document.getElementById(id).addEventListener("input", recalc);
    });
    recalc();
  });
})();
