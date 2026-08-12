// Battery Life Estimator — duty-cycle states, live result, breakdown table.
(function () {
  "use strict";

  var stateCounter = 0;
  var DEFAULT_STATES = [
    { name:"Active",  mA:80,  duty:10 },
    { name:"Idle",    mA:5,   duty:60 },
    { name:"Sleep",   mA:0.1, duty:30 },
  ];

  function fmtLife(h) {
    if (!isFinite(h)||h<=0) return "—";
    if (h < 1)    return (h*60).toFixed(1)+" min";
    if (h < 48)   return h.toFixed(1)+" hrs";
    var days = Math.floor(h/24); var rem = h - days*24;
    if (h < 24*90) return days+" d "+ rem.toFixed(1)+" h";
    var months = (h/24/30.4375).toFixed(1);
    return months+" mo";
  }

  function getStates() {
    var rows = document.querySelectorAll("#states-body tr");
    var states=[];
    rows.forEach(function(row){
      var inputs = row.querySelectorAll("input");
      var name = inputs[0].value.trim()||"State";
      var mA   = parseFloat(inputs[1].value);
      var duty = parseFloat(inputs[2].value);
      states.push({name:name,mA:mA,duty:duty});
    });
    return states;
  }

  function recalc() {
    var cap  = parseFloat(document.getElementById("capacity").value);
    var eff  = parseFloat(document.getElementById("efficiency").value);
    var states = getStates();
    var msg  = document.getElementById("message");
    var res  = document.getElementById("results");
    var dtEl = document.getElementById("duty-total");

    var totalDuty = states.reduce(function(s,x){return s+(isNaN(x.duty)?0:x.duty);},0);
    if (Math.abs(totalDuty-100)>0.5 && states.length>0) {
      dtEl.textContent = "Duty cycles sum: "+totalDuty.toFixed(1)+"% (should be 100%)";
      dtEl.hidden = false;
    } else {
      dtEl.hidden = true;
    }

    if (isNaN(cap)||cap<=0||isNaN(eff)||eff<=0||states.length===0) {
      res.hidden=true; return;
    }
    var ok = states.every(function(s){return isFinite(s.mA)&&isFinite(s.duty);});
    if (!ok){res.hidden=true;return;}

    var avgMA = states.reduce(function(s,x){return s+(x.mA*x.duty/100);},0);
    var effCap = cap*(eff/100);
    var lifeH  = avgMA>0 ? effCap/avgMA : Infinity;

    document.getElementById("out-life").textContent = fmtLife(lifeH);
    document.getElementById("out-avg").textContent  = avgMA.toPrecision(4)+" mA";
    document.getElementById("out-eff").textContent  = effCap.toFixed(0)+" mAh";

    var lines = ["State              mA         Duty%    Avg mA"];
    lines.push("─".repeat(49));
    states.forEach(function(s){
      var avg = (s.mA*s.duty/100);
      lines.push(
        (s.name+"               ").slice(0,15)+"  "+
        (s.mA.toPrecision(4)+"       ").slice(0,10)+"  "+
        (s.duty.toFixed(1)+"%     ").slice(0,8)+"   "+
        avg.toPrecision(4)+" mA"
      );
    });
    lines.push("─".repeat(49));
    lines.push("Weighted avg: "+avgMA.toPrecision(4)+" mA");
    document.getElementById("out-breakdown").textContent = lines.join("\n");
    res.hidden = false;
  }

  function makeRow(st) {
    var tr = document.createElement("tr");
    var id = ++stateCounter;
    tr.dataset.id = id;
    tr.innerHTML = [
      '<td><input type="text" value="'+escHtml(st.name)+'" placeholder="Name" aria-label="State name"/></td>',
      '<td><input type="text" inputmode="decimal" value="'+st.mA+'" aria-label="Current mA"/></td>',
      '<td><input type="text" inputmode="decimal" value="'+st.duty+'" aria-label="Duty cycle percent"/></td>',
      '<td style="text-align:center"><button class="state-del-btn" type="button" aria-label="Remove state">&times;</button></td>',
    ].join("");
    tr.querySelectorAll("input").forEach(function(inp){inp.addEventListener("input",recalc);});
    tr.querySelector(".state-del-btn").addEventListener("click",function(){
      tr.remove(); recalc();
    });
    return tr;
  }

  function escHtml(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

  function addState(st) {
    st = st||{name:"State",mA:10,duty:0};
    document.getElementById("states-body").appendChild(makeRow(st));
    recalc();
  }

  document.addEventListener("DOMContentLoaded", function() {
    ["capacity","efficiency"].forEach(function(id){
      document.getElementById(id).addEventListener("input",recalc);
    });
    document.getElementById("addStateBtn").addEventListener("click",function(){
      addState();
    });
    DEFAULT_STATES.forEach(addState);
  });
})();
