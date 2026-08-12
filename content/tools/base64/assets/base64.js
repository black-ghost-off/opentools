// Base64 Encoder / Decoder — text <-> Base64, all client-side.
(function () {
  "use strict";

  var encoder = new TextEncoder();
  var decoder = new TextDecoder("utf-8", { fatal: false });

  function bytesToBase64(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function applyVariant(b64, alphabet, padding, wrap) {
    var out = b64;
    if (alphabet === "url") out = out.replace(/\+/g, "-").replace(/\//g, "_");
    if (padding === "no") out = out.replace(/=+$/, "");
    var cols = parseInt(wrap, 10);
    if (cols > 0) {
      out = out.replace(new RegExp(".{1," + cols + "}", "g"), "$&\n").replace(/\n$/, "");
    }
    return out;
  }

  function base64ToBytes(str) {
    var s = str.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (s === "") return new Uint8Array(0);
    while (s.length % 4 !== 0) s += "=";
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error("Input contains characters that aren't valid Base64.");
    var bin;
    try { bin = atob(s); } catch (e) { throw new Error("Malformed Base64 — the length or padding is wrong."); }
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function bytesToHex(bytes) {
    var out = [];
    for (var i = 0; i < bytes.length; i++) {
      out.push(bytes[i].toString(16).toUpperCase().padStart(2, "0"));
    }
    return out.join(" ");
  }

  function copyText(btn, text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = old; }, 1500);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    // ---- Tabs ----
    var tabs = document.querySelectorAll(".tab");
    var panels = document.querySelectorAll(".tab-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        panels.forEach(function (p) {
          p.hidden = p.dataset.panel !== tab.dataset.tab;
        });
      });
    });

    var byteLen = document.getElementById("byte-len");
    var b64Len = document.getElementById("b64-len");

    function setStats(byteCount, b64Count) {
      byteLen.textContent = byteCount + (byteCount === 1 ? " byte" : " bytes");
      b64Len.textContent = b64Count + (b64Count === 1 ? " char" : " chars");
    }

    // ---- Encode ----
    var encInput = document.getElementById("enc-input");
    var encOutput = document.getElementById("enc-output");
    var encAlphabet = document.getElementById("enc-alphabet");
    var encPadding = document.getElementById("enc-padding");
    var encWrap = document.getElementById("enc-wrap");

    function encode() {
      var bytes = encoder.encode(encInput.value);
      var b64 = applyVariant(bytesToBase64(bytes), encAlphabet.value, encPadding.value, encWrap.value);
      encOutput.value = b64;
      setStats(bytes.length, b64.replace(/\n/g, "").length);
    }

    [encInput, encAlphabet, encPadding, encWrap].forEach(function (el) {
      el.addEventListener("input", encode);
      el.addEventListener("change", encode);
    });
    document.getElementById("copy-enc").addEventListener("click", function () {
      copyText(this, encOutput.value);
    });

    // ---- Decode ----
    var decInput = document.getElementById("dec-input");
    var decOutput = document.getElementById("dec-output");
    var decHex = document.getElementById("dec-hex");
    var decMsg = document.getElementById("dec-message");

    function decode() {
      decMsg.className = "msg hidden";
      var raw = decInput.value;
      if (raw.trim() === "") {
        decOutput.value = "";
        decHex.value = "";
        setStats(0, 0);
        return;
      }
      var bytes;
      try {
        bytes = base64ToBytes(raw);
      } catch (e) {
        decMsg.textContent = e.message;
        decMsg.className = "msg error";
        decOutput.value = "";
        decHex.value = "";
        return;
      }
      decOutput.value = decoder.decode(bytes);
      decHex.value = bytesToHex(bytes);
      setStats(bytes.length, raw.replace(/\s+/g, "").length);
    }

    decInput.addEventListener("input", decode);
    document.getElementById("copy-dec").addEventListener("click", function () {
      copyText(this, decOutput.value);
    });

    // Seed with a demo.
    encInput.value = "Hello, world!";
    encode();
  });
})();
