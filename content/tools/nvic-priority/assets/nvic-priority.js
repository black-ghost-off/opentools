// NVIC Priority Calculator — preempt/subpriority split from PRIGROUP.
(function () {
  "use strict";

  function parseNumber(value) {
    if (value === null || value === undefined) return NaN;
    var cleaned = String(value).replace(/[\s,_]/g, "");
    if (cleaned === "") return NaN;
    return Number(cleaned);
  }

  function hex(n, digits) {
    return "0x" + n.toString(16).toUpperCase().padStart(digits, "0");
  }

  function grouping(prigroup, n) {
    var preemptBits = Math.min(7 - prigroup, n);
    if (preemptBits < 0) preemptBits = 0;
    var subBits = n - preemptBits;
    return { preemptBits: preemptBits, subBits: subBits, preemptLevels: Math.pow(2, preemptBits), subLevels: Math.pow(2, subBits) };
  }

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
  }

  function hideMessage(el) {
    el.className = "msg hidden";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("nvic-form");
    if (!form) return;

    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var body = document.getElementById("results-body");
    var codeOut = document.getElementById("code-out");
    var copyBtn = document.getElementById("copy-code");

    function run() {
      hideMessage(message);

      var n = parseInt(parseNumber(form.bits.value), 10);
      var prigroup = parseInt(parseNumber(form.prigroup.value), 10);
      var preempt = parseInt(parseNumber(form.preempt.value), 10);
      var sub = parseInt(parseNumber(form.sub.value), 10);

      if (!isFinite(n) || n < 1 || n > 8) {
        return showMessage(message, "Priority bits must be between 1 and 8.", "error");
      }
      if (!isFinite(prigroup) || prigroup < 0 || prigroup > 7) {
        return showMessage(message, "PRIGROUP must be between 0 and 7.", "error");
      }
      if (!isFinite(preempt) || preempt < 0) preempt = 0;
      if (!isFinite(sub) || sub < 0) sub = 0;

      var g = grouping(prigroup, n);

      var clampedPreempt = Math.min(preempt, g.preemptLevels - 1);
      var clampedSub = Math.min(sub, g.subLevels - 1);
      var field = (clampedPreempt << g.subBits) | clampedSub;
      var regValue = field << (8 - n);

      document.getElementById("out-preempt-bits").textContent = g.preemptBits;
      document.getElementById("out-sub-bits").textContent = g.subBits;
      document.getElementById("out-preempt-levels").textContent = g.preemptLevels;
      document.getElementById("out-sub-levels").textContent = g.subLevels;
      document.getElementById("out-field").textContent = field + " (" + field.toString(2).padStart(n, "0") + "b)";
      document.getElementById("out-regval").textContent = hex(regValue, 2);

      var warn = (clampedPreempt !== preempt || clampedSub !== sub)
        ? " Requested preempt/sub priority was clamped to the available range."
        : "";

      codeOut.textContent = [
        "/* NVIC_PriorityGroup_" + g.preemptBits + " equivalent (PRIGROUP=" + prigroup + ", N=" + n + " bits) */",
        "HAL_NVIC_SetPriorityGrouping(NVIC_PRIORITYGROUP_" + g.preemptBits + ");",
        "HAL_NVIC_SetPriority(IRQn, " + clampedPreempt + ", " + clampedSub + ");   /* preempt=" + clampedPreempt + ", sub=" + clampedSub + " */"
      ].join("\n");

      body.innerHTML = "";
      for (var pg = 0; pg <= 7; pg++) {
        var gg = grouping(pg, n);
        var tr = document.createElement("tr");
        if (pg === prigroup) tr.className = "best";
        tr.innerHTML =
          "<td>" + pg + "</td>" +
          "<td>" + gg.preemptBits + "</td>" +
          "<td>" + gg.subBits + "</td>" +
          "<td>" + gg.preemptLevels + "</td>" +
          "<td>" + gg.subLevels + "</td>";
        body.appendChild(tr);
      }

      results.hidden = false;

      if (warn) showMessage(message, warn.trim(), "ok");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });

    form.addEventListener("reset", function () {
      results.hidden = true;
      hideMessage(message);
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = codeOut.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyBtn.textContent = "Copied!";
            setTimeout(function () { copyBtn.textContent = "Copy"; }, 1500);
          });
        }
      });
    }

    run();
  });
})();
