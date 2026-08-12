// CRON Expression Calculator — parses a 5-field cron expression into a
// human-readable schedule and lists upcoming run times.
(function () {
  "use strict";

  var MONTH_NAMES = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  var DOW_NAMES = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  var MONTH_LABELS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DOW_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  var FIELD_DEFS = [
    { key: "minute", label: "Minute", min: 0, max: 59 },
    { key: "hour", label: "Hour", min: 0, max: 23 },
    { key: "dom", label: "Day of month", min: 1, max: 31 },
    { key: "month", label: "Month", min: 1, max: 12, names: MONTH_NAMES },
    { key: "dow", label: "Day of week", min: 0, max: 7, names: DOW_NAMES }
  ];

  function resolveToken(token, def) {
    if (def.names && Object.prototype.hasOwnProperty.call(def.names, token)) {
      return def.names[token];
    }
    if (!/^\d+$/.test(token)) throw new Error("Invalid value \"" + token + "\" in " + def.label.toLowerCase() + " field.");
    var n = parseInt(token, 10);
    if (n < def.min || n > def.max) {
      throw new Error(def.label + " value " + n + " is out of range (" + def.min + "-" + def.max + ").");
    }
    return n;
  }

  function normalize(v, def) {
    return def.key === "dow" && v === 7 ? 0 : v;
  }

  function parseField(raw, def) {
    var lower = raw.trim().toLowerCase();
    if (lower === "") throw new Error(def.label + " field is empty.");
    if (/[lw#?]/.test(lower)) {
      throw new Error("\"" + raw + "\" uses L/W/#/? which this tool doesn't support.");
    }
    var values = new Set();
    lower.split(",").forEach(function (part) {
      var m = part.match(/^([^/]+)(?:\/(\d+))?$/);
      if (!m) throw new Error("Invalid segment \"" + part + "\" in " + def.label.toLowerCase() + " field.");
      var base = m[1];
      var hasStep = m[2] !== undefined;
      var step = hasStep ? parseInt(m[2], 10) : 1;
      if (step <= 0) throw new Error("Step must be a positive number in \"" + part + "\".");

      var lo, hi;
      if (base === "*") {
        lo = def.min; hi = def.max;
      } else if (base.indexOf("-") !== -1) {
        var bounds = base.split("-");
        if (bounds.length !== 2) throw new Error("Invalid range \"" + base + "\".");
        lo = resolveToken(bounds[0], def);
        hi = resolveToken(bounds[1], def);
        if (lo > hi) throw new Error("Range \"" + base + "\" starts after it ends.");
      } else {
        lo = resolveToken(base, def);
        hi = hasStep ? def.max : lo;
      }
      for (var v = lo; v <= hi; v += step) values.add(normalize(v, def));
    });
    return values;
  }

  function parseCron(expr) {
    var parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error("Expected 5 fields (minute hour day-of-month month day-of-week), got " + parts.length + ".");
    }
    var fields = {};
    FIELD_DEFS.forEach(function (def, i) {
      fields[def.key] = parseField(parts[i], def);
    });
    return {
      raw: parts,
      fields: fields,
      domRestricted: parts[2] !== "*",
      dowRestricted: parts[4] !== "*"
    };
  }

  function matches(cron, d) {
    var f = cron.fields;
    if (!f.minute.has(d.getMinutes())) return false;
    if (!f.hour.has(d.getHours())) return false;
    if (!f.month.has(d.getMonth() + 1)) return false;
    var domOk = f.dom.has(d.getDate());
    var dowOk = f.dow.has(d.getDay());
    if (cron.domRestricted && cron.dowRestricted) return domOk || dowOk;
    if (cron.domRestricted) return domOk;
    if (cron.dowRestricted) return dowOk;
    return true;
  }

  var MAX_ITER = 4 * 366 * 24 * 60; // search up to ~4 years ahead

  function nextRuns(cron, count, from) {
    var d = new Date(from.getTime());
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1);
    var out = [];
    var iterations = 0;
    while (out.length < count && iterations < MAX_ITER) {
      if (matches(cron, d)) out.push(new Date(d.getTime()));
      d.setMinutes(d.getMinutes() + 1);
      iterations++;
    }
    return { runs: out, truncated: out.length < count };
  }

  function condense(set) {
    var arr = Array.prototype.slice.call(set).sort(function (a, b) { return a - b; });
    var out = [];
    var i = 0;
    while (i < arr.length) {
      var start = arr[i], end = start;
      while (i + 1 < arr.length && arr[i + 1] === end + 1) { end = arr[i + 1]; i++; }
      out.push(start === end ? String(start) : start + "-" + end);
      i++;
    }
    return out;
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function describeShort(set) { return condense(set).join(", "); }

  function describeNamed(set, labels, offset) {
    return condense(set).map(function (chunk) {
      if (chunk.indexOf("-") === -1) return labels[parseInt(chunk, 10) - offset];
      var b = chunk.split("-");
      return labels[parseInt(b[0], 10) - offset] + "–" + labels[parseInt(b[1], 10) - offset];
    }).join(", ");
  }

  function describeTime(minuteRaw, hourRaw, minuteSet, hourSet) {
    if (minuteRaw === "*" && hourRaw === "*") return "Every minute";

    var minuteStep = minuteRaw.match(/^\*\/(\d+)$/);
    if (minuteStep && hourRaw === "*") {
      var n = minuteStep[1];
      return "Every " + n + " minute" + (n === "1" ? "" : "s");
    }
    if (hourRaw === "*") {
      return "At minute " + describeShort(minuteSet) + " past every hour";
    }
    if (minuteRaw === "*") {
      return "Every minute during hour " + describeShort(hourSet);
    }
    var simple = /^\d+$/;
    if (simple.test(minuteRaw) && simple.test(hourRaw)) {
      return "At " + pad2(parseInt(hourRaw, 10)) + ":" + pad2(parseInt(minuteRaw, 10));
    }
    return "At minute " + describeShort(minuteSet) + " of hour " + describeShort(hourSet);
  }

  function describe(cron) {
    var raw = cron.raw, f = cron.fields;
    var sentence = describeTime(raw[0], raw[1], f.minute, f.hour);

    var dayBits = [];
    if (cron.domRestricted) dayBits.push("on day-of-month " + describeShort(f.dom));
    if (cron.dowRestricted) dayBits.push("on " + describeNamed(f.dow, DOW_LABELS, 0));

    if (dayBits.length === 2) {
      sentence += ", " + dayBits[0] + " or " + dayBits[1].replace(/^on /, "");
    } else if (dayBits.length === 1) {
      sentence += ", " + dayBits[0];
    } else {
      sentence += ", every day";
    }

    if (raw[3] !== "*") sentence += ", in " + describeNamed(f.month, MONTH_LABELS, 0);

    return sentence + ".";
  }

  function formatRelative(ms) {
    var s = Math.round(ms / 1000);
    var units = [["day", 86400], ["hour", 3600], ["minute", 60]];
    for (var i = 0; i < units.length; i++) {
      var size = units[i][1];
      if (s >= size || (units[i][0] === "minute" && s >= 0)) {
        var v = Math.floor(s / size);
        if (v > 0 || units[i][0] === "minute") {
          return "in " + v + " " + units[i][0] + (v === 1 ? "" : "s");
        }
      }
    }
    return "in <1 minute";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("cron-form");
    var exprInput = document.getElementById("expr");
    var presetSel = document.getElementById("preset");
    var countSel = document.getElementById("count");
    var message = document.getElementById("message");
    var results = document.getElementById("results");
    var descEl = document.getElementById("description");
    var breakdownBody = document.getElementById("breakdown-body");
    var runsBody = document.getElementById("runs-body");
    var tzNote = document.getElementById("tz-note");

    function showMessage(text, type) {
      message.textContent = text;
      message.className = "msg " + type;
    }
    function hideMessage() { message.className = "msg hidden"; }

    // ---- Visual builder (per-field mode: every / specific / range / step) ----
    var builders = [];

    function makeValueSelect(def, className, withWildcard) {
      var sel = document.createElement("select");
      sel.className = className;
      if (withWildcard) {
        var wild = document.createElement("option");
        wild.value = "*";
        wild.textContent = "any (*)";
        sel.appendChild(wild);
      }
      for (var v = def.min; v <= def.max; v++) {
        var opt = document.createElement("option");
        opt.value = String(v);
        opt.textContent = def.names ? def.names[v - def.min] : String(v);
        sel.appendChild(opt);
      }
      return sel;
    }

    function buildFieldBuilder(cfbEl) {
      var def = {
        key: cfbEl.dataset.field,
        min: parseInt(cfbEl.dataset.min, 10),
        max: parseInt(cfbEl.dataset.max, 10),
        names: cfbEl.dataset.names ? cfbEl.dataset.names.split(",") : null
      };
      var panelsWrap = cfbEl.querySelector(".cfb-panels");

      var specificPanel = document.createElement("div");
      specificPanel.className = "cfb-mode-panel";
      specificPanel.dataset.mode = "specific";
      specificPanel.hidden = true;
      var chipGrid = document.createElement("div");
      chipGrid.className = "chip-grid";
      for (var v = def.min; v <= def.max; v++) {
        var chip = document.createElement("span");
        chip.className = "chip";
        chip.dataset.value = String(v);
        chip.textContent = def.names ? def.names[v - def.min] : String(v);
        chipGrid.appendChild(chip);
      }
      specificPanel.appendChild(chipGrid);

      var rangePanel = document.createElement("div");
      rangePanel.className = "cfb-mode-panel cfb-range";
      rangePanel.dataset.mode = "range";
      rangePanel.hidden = true;
      var fromSel = makeValueSelect(def, "cfb-from", false);
      var toSel = makeValueSelect(def, "cfb-to", false);
      toSel.value = String(def.max);
      rangePanel.appendChild(document.createTextNode("From "));
      rangePanel.appendChild(fromSel);
      rangePanel.appendChild(document.createTextNode(" to "));
      rangePanel.appendChild(toSel);

      var stepPanel = document.createElement("div");
      stepPanel.className = "cfb-mode-panel cfb-step";
      stepPanel.dataset.mode = "step";
      stepPanel.hidden = true;
      var baseSel = makeValueSelect(def, "cfb-step-base", true);
      baseSel.value = String(def.min);
      var stepInput = document.createElement("input");
      stepInput.type = "number";
      stepInput.min = "1";
      stepInput.value = "1";
      stepInput.className = "cfb-step-n";
      stepPanel.appendChild(document.createTextNode("From "));
      stepPanel.appendChild(baseSel);
      stepPanel.appendChild(document.createTextNode(" every "));
      stepPanel.appendChild(stepInput);
      stepPanel.appendChild(document.createTextNode(" " + def.key));

      panelsWrap.appendChild(specificPanel);
      panelsWrap.appendChild(rangePanel);
      panelsWrap.appendChild(stepPanel);

      return {
        def: def,
        cfbEl: cfbEl,
        modeSel: cfbEl.querySelector(".cfb-mode"),
        panels: [specificPanel, rangePanel, stepPanel],
        chipGrid: chipGrid,
        fromSel: fromSel,
        toSel: toSel,
        baseSel: baseSel,
        stepInput: stepInput
      };
    }

    function showPanel(b, mode) {
      b.panels.forEach(function (p) { p.hidden = p.dataset.mode !== mode; });
    }

    function fieldToExpr(b) {
      var mode = b.modeSel.value;
      if (mode === "specific") {
        var selected = Array.prototype.filter.call(b.chipGrid.children, function (c) {
          return c.classList.contains("on");
        }).map(function (c) { return parseInt(c.dataset.value, 10); });
        if (!selected.length) return "*";
        selected.sort(function (a, c) { return a - c; });
        return selected.join(",");
      }
      if (mode === "range") {
        var a = parseInt(b.fromSel.value, 10);
        var z = parseInt(b.toSel.value, 10);
        if (a > z) { var t = a; a = z; z = t; }
        return a + "-" + z;
      }
      if (mode === "step") {
        var n = Math.max(1, parseInt(b.stepInput.value, 10) || 1);
        return b.baseSel.value + "/" + n;
      }
      if (mode === "first") {
        return String(b.def.min);
      }
      return "*";
    }

    function onBuilderChange() {
      var expr = builders.map(fieldToExpr).join(" ");
      exprInput.value = expr;
      presetSel.value = "";
      run();
    }

    function syncBuilderFromCron(cron) {
      builders.forEach(function (b, i) {
        var raw = cron.raw[i];
        var resolved = cron.fields[b.def.key];
        var rangeMatch = raw.match(/^(\d+)-(\d+)$/);
        var stepMatch = raw.match(/^(\*|\d+)\/(\d+)$/);
        var hasFirst = !!b.modeSel.querySelector('option[value="first"]');
        var mode;
        if (raw === "*") mode = "every";
        else if (hasFirst && raw === String(b.def.min)) mode = "first";
        else if (stepMatch) mode = "step";
        else if (rangeMatch) mode = "range";
        else mode = "specific";

        b.modeSel.value = mode;
        showPanel(b, mode);

        Array.prototype.forEach.call(b.chipGrid.children, function (chip) {
          var v = parseInt(chip.dataset.value, 10);
          chip.classList.toggle("on", resolved.has(v));
        });

        if (mode === "range" && rangeMatch) {
          var a = Math.min(parseInt(rangeMatch[1], 10), b.def.max);
          var z = Math.min(parseInt(rangeMatch[2], 10), b.def.max);
          b.fromSel.value = String(a);
          b.toSel.value = String(z);
        }
        if (mode === "step" && stepMatch) {
          b.baseSel.value = stepMatch[1] === "*" ? "*" : String(Math.min(parseInt(stepMatch[1], 10), b.def.max));
          b.stepInput.value = stepMatch[2];
        }
      });
    }

    function initBuilders() {
      var cfbEls = Array.prototype.slice.call(document.querySelectorAll(".cfb"));
      builders = cfbEls.map(buildFieldBuilder);
      builders.forEach(function (b) {
        b.modeSel.addEventListener("change", function () {
          showPanel(b, b.modeSel.value);
          onBuilderChange();
        });
        b.chipGrid.addEventListener("click", function (e) {
          var chip = e.target.closest ? e.target.closest(".chip") : null;
          if (!chip) return;
          chip.classList.toggle("on");
          onBuilderChange();
        });
        b.fromSel.addEventListener("change", onBuilderChange);
        b.toSel.addEventListener("change", onBuilderChange);
        b.baseSel.addEventListener("change", onBuilderChange);
        b.stepInput.addEventListener("input", onBuilderChange);
      });
    }

    function run() {
      var expr = exprInput.value;
      var cron;
      try {
        cron = parseCron(expr);
      } catch (err) {
        results.hidden = true;
        showMessage(err.message, "error");
        return;
      }
      hideMessage();
      syncBuilderFromCron(cron);

      descEl.textContent = describe(cron);

      breakdownBody.innerHTML = "";
      FIELD_DEFS.forEach(function (def, i) {
        var tr = document.createElement("tr");
        var resolved = cron.raw[i] === "*" ? "any " + def.label.toLowerCase() : describeShort(cron.fields[def.key]);
        tr.innerHTML =
          "<td>" + def.label + "</td>" +
          "<td><code>" + cron.raw[i] + "</code></td>" +
          "<td>" + resolved + "</td>";
        breakdownBody.appendChild(tr);
      });

      var count = parseInt(countSel.value, 10);
      var now = new Date();
      var found = nextRuns(cron, count, now);

      runsBody.innerHTML = "";
      found.runs.forEach(function (d, i) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + (i + 1) + "</td>" +
          "<td>" + d.toLocaleString() + "</td>" +
          "<td>" + formatRelative(d.getTime() - now.getTime()) + "</td>";
        runsBody.appendChild(tr);
      });

      var tzLabel = Intl.DateTimeFormat().resolvedOptions().timeZone;
      tzNote.textContent = "(" + (tzLabel || "local time") + ")";

      if (found.truncated) {
        showMessage("Only found " + found.runs.length + " matching time(s) within the next 4 years. Check for an unusual field combination (e.g. Feb 29 on a specific weekday).", "error");
      }

      results.hidden = false;
    }

    exprInput.addEventListener("input", run);
    countSel.addEventListener("change", run);
    presetSel.addEventListener("change", function () {
      if (!presetSel.value) return;
      exprInput.value = presetSel.value;
      run();
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });

    initBuilders();
    run();
  });
})();
