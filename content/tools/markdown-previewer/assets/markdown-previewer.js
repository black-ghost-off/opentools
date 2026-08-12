// Markdown Previewer — minimal safe Markdown -> HTML renderer.
//
// Security: the raw input is HTML-escaped before any Markdown processing, so
// literal HTML/script tags in the source are rendered as visible text, never
// executed. Links are restricted to http(s)/mailto/relative/anchor schemes to
// avoid `javascript:` URL injection.
(function () {
  "use strict";

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function inline(s) {
    s = s.replace(/`([^`]+)`/g, function (m, code) { return "<code>" + code + "</code>"; });
    s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, function (m, a, b) { return "<strong>" + (a || b) + "</strong>"; });
    s = s.replace(/\*([^*]+)\*|_([^_]+)_/g, function (m, a, b) { return "<em>" + (a || b) + "</em>"; });
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, text, url) {
      var trimmed = url.trim();
      var safeUrl = /^(https?:|mailto:|#|\/)/i.test(trimmed) ? trimmed : "#";
      return '<a href="' + safeUrl + '" rel="noopener noreferrer" target="_blank">' + text + "</a>";
    });
    return s;
  }

  function isBlank(line) { return /^\s*$/.test(line); }
  function isHeading(line) { return /^#{1,6}\s+/.test(line); }
  function isQuote(line) { return /^>\s?/.test(line); }
  function isUl(line) { return /^\s*[-*+]\s+/.test(line); }
  function isOl(line) { return /^\s*\d+[.)]\s+/.test(line); }
  function isHr(line) { return /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim()); }
  function isCodePlaceholder(line) { return /^\u0000CODEBLOCK\d+\u0000$/.test(line.trim()); }

  function render(text) {
    var escaped = escapeHtml(text);

    var codeBlocks = [];
    escaped = escaped.replace(/```[a-zA-Z0-9_-]*\n?([\s\S]*?)```/g, function (m, code) {
      var idx = codeBlocks.length;
      codeBlocks.push(code.replace(/\n$/, ""));
      return "\u0000CODEBLOCK" + idx + "\u0000";
    });

    var lines = escaped.split("\n");
    var html = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (isCodePlaceholder(line)) {
        var idx = parseInt(line.match(/\d+/)[0], 10);
        html.push("<pre><code>" + codeBlocks[idx] + "</code></pre>");
        i++;
        continue;
      }

      if (isBlank(line)) { i++; continue; }

      var headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        var level = headingMatch[1].length;
        html.push("<h" + level + ">" + inline(headingMatch[2]) + "</h" + level + ">");
        i++;
        continue;
      }

      if (isHr(line)) { html.push("<hr>"); i++; continue; }

      if (isQuote(line)) {
        var quoteLines = [];
        while (i < lines.length && isQuote(lines[i])) {
          quoteLines.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        html.push("<blockquote>" + inline(quoteLines.join(" ")) + "</blockquote>");
        continue;
      }

      if (isUl(line)) {
        var items = [];
        while (i < lines.length && isUl(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
          i++;
        }
        html.push("<ul>" + items.map(function (it) { return "<li>" + inline(it) + "</li>"; }).join("") + "</ul>");
        continue;
      }

      if (isOl(line)) {
        var oitems = [];
        while (i < lines.length && isOl(lines[i])) {
          oitems.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
          i++;
        }
        html.push("<ol>" + oitems.map(function (it) { return "<li>" + inline(it) + "</li>"; }).join("") + "</ol>");
        continue;
      }

      var paraLines = [line];
      i++;
      while (
        i < lines.length &&
        !isBlank(lines[i]) && !isHeading(lines[i]) && !isQuote(lines[i]) &&
        !isUl(lines[i]) && !isOl(lines[i]) && !isHr(lines[i]) && !isCodePlaceholder(lines[i])
      ) {
        paraLines.push(lines[i]);
        i++;
      }
      html.push("<p>" + inline(paraLines.join(" ")) + "</p>");
    }

    return html.join("\n");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var input = document.getElementById("input");
    var preview = document.getElementById("preview");

    function update() {
      preview.innerHTML = render(input.value);
    }

    input.addEventListener("input", update);

    input.value = [
      "# Markdown Previewer",
      "",
      "Type **Markdown** on the left, see the *rendered* result on the right.",
      "",
      "- Supports lists",
      "- Inline `code`",
      "- [Links](https://example.com)",
      "",
      "> Blockquotes too.",
      "",
      "```",
      "and fenced code blocks",
      "```"
    ].join("\n");
    update();
  });
})();
