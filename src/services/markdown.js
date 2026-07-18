import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const SANITIZE_OPTIONS = {
  allowedTags: [
    "p", "br", "strong", "em", "del", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "code", "pre", "a", "hr", "table", "thead",
    "tbody", "tr", "th", "td", "input", "sup", "sub"
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    input: ["type", "checked", "disabled"]
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }, true),
    input: sanitizeHtml.simpleTransform("input", { type: "checkbox", disabled: "" }, true)
  }
};

export function renderArticleMarkdown(markdown = "") {
  const rendered = marked.parse(String(markdown), { gfm: true, breaks: true, async: false });
  return sanitizeHtml(rendered, SANITIZE_OPTIONS);
}

export function markdownToPlainText(markdown = "") {
  const rendered = renderArticleMarkdown(markdown);
  return sanitizeHtml(rendered, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
