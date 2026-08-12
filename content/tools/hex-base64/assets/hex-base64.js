// Hex / Bytes / Base64 — encode/decode via a shared Uint8Array of bytes.
(function () {
  "use strict";

  var encoder = new TextEncoder();
  var decoder = new TextDecoder("utf-8", { fatal: false });

  function bytesToHex(bytes) {
    var out = [];
    for (var i = 0; i < bytes.length; i++) {
      out.push(bytes[i].toString(16).toUpperCase().padStart(2, "0"));
    }
    return out.join(" ");
  }

  function hexToBytes(str) {
    var s = str.trim().toLowerCase().replace(/0x/g, "").replace(/[\s,_]/g, "");
    if (s === "") return new Uint8Array(0);
    if (!/^[0-9a-f]*$/.test(s)) throw new Error("Hex contains invalid characters.");
    if (s.length % 2 !== 0) throw new Error("Hex needs an even number of digits.");
    var bytes = new Uint8Array(s.length / 2);
    for (var i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(s.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  function bytesToB64(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64ToBytes(str) {
    var s = str.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (s === "") return new Uint8Array(0);
    while (s.length % 4 !== 0) s += "=";
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error("Invalid Base64 characters.");
    var bin;
    try { bin = atob(s); } catch (e) { throw new Error("Malformed Base64 input."); }
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var fields = {
      text: document.getElementById("text"),
      hex: document.getElementById("hex"),
      b64: document.getElementById("b64")
    };
    var message = document.getElementById("message");
    var lenEl = document.getElementById("len");

    function msg(t) { message.textContent = t; message.className = "msg error"; }
    function clearMsg() { message.className = "msg hidden"; }

    function updateFrom(source) {
      clearMsg();
      var bytes;
      try {
        if (source === "text") bytes = encoder.encode(fields.text.value);
        else if (source === "hex") bytes = hexToBytes(fields.hex.value);
        else bytes = b64ToBytes(fields.b64.value);
      } catch (e) {
        msg(e.message);
        return;
      }

      if (source !== "text") fields.text.value = decoder.decode(bytes);
      if (source !== "hex") fields.hex.value = bytesToHex(bytes);
      if (source !== "b64") fields.b64.value = bytesToB64(bytes);

      lenEl.textContent = bytes.length + (bytes.length === 1 ? " byte" : " bytes");
    }

    Object.keys(fields).forEach(function (key) {
      fields[key].addEventListener("input", function () {
        updateFrom(fields[key].dataset.fmt);
      });
    });

    fields.text.value = "Hello, world!";
    updateFrom("text");
  });
})();
