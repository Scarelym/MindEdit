"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => MindEditPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/view.ts
var import_obsidian = require("obsidian");

// src/inline.ts
var emphasis = (length) => {
  if (length === 1) return ["em"];
  if (length === 2) return ["strong"];
  if (length === 3) return ["strong", "em"];
  return null;
};
var DELIMITERS = [
  { char: "`", raw: true, tagsFor: () => ["code"] },
  { char: "*", tagsFor: emphasis },
  { char: "_", wordSafe: true, tagsFor: emphasis },
  { char: "~", tagsFor: (n) => n === 2 ? ["del"] : null },
  { char: "=", tagsFor: (n) => n === 2 ? ["mark"] : null }
];
var CLASS_OF = {
  code: "mindedit-code",
  mark: "mindedit-mark"
};
var WORD = /[\p{L}\p{N}]/u;
function isWordChar(char) {
  return char !== void 0 && WORD.test(char);
}
function isSpace(char) {
  return char === void 0 || /\s/.test(char);
}
function renderInline(text, target) {
  target.replaceChildren(...parseInline(text));
}
function parseInline(text) {
  const out = [];
  let plain = "";
  const flush = () => {
    if (plain !== "") {
      out.push(document.createTextNode(plain));
      plain = "";
    }
  };
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\\" && i + 1 < text.length) {
      plain += text[i + 1];
      i += 2;
      continue;
    }
    const found = matchAt(text, i);
    if (!found) {
      plain += text[i];
      i += 1;
      continue;
    }
    flush();
    out.push(build(found));
    i = found.end;
  }
  flush();
  return out;
}
function build(match) {
  const create = (tag) => {
    const element = document.createElement(tag);
    const className = CLASS_OF[tag];
    if (className) element.className = className;
    return element;
  };
  const outer = create(match.tags[0]);
  let deepest = outer;
  for (const tag of match.tags.slice(1)) {
    const inner = create(tag);
    deepest.append(inner);
    deepest = inner;
  }
  if (match.raw) deepest.textContent = match.content;
  else deepest.append(...parseInline(match.content));
  return outer;
}
function matchAt(text, start) {
  var _a;
  const delimiter = DELIMITERS.find((candidate) => candidate.char === text[start]);
  if (!delimiter) return null;
  if (delimiter.wordSafe && isWordChar(text[start - 1])) return null;
  const length = runLength(text, start, delimiter.char);
  const tags = delimiter.tagsFor(length);
  if (!tags) return null;
  const from = start + length;
  if (isSpace(text[from])) return null;
  const close = findClose(text, from, delimiter, length);
  if (close < 0) return null;
  return { tags, content: text.slice(from, close), raw: (_a = delimiter.raw) != null ? _a : false, end: close + length };
}
function runLength(text, start, char) {
  let length = 0;
  while (text[start + length] === char) length += 1;
  return length;
}
function findClose(text, from, delimiter, length) {
  for (let i = from; i < text.length; i++) {
    if (!delimiter.raw && text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] !== delimiter.char) continue;
    const end = i + runLength(text, i, delimiter.char);
    const usable = end - i === length && i !== from && // contenu vide
    !isSpace(text[i - 1]) && // « ceci * » ne ferme pas
    !(delimiter.wordSafe && isWordChar(text[end]));
    if (usable) return i;
    i = end - 1;
  }
  return -1;
}
function toggleEmphasis(text, kind) {
  if (/^\*+$/.test(text)) return text;
  const leading = text.length - text.replace(/^\*+/, "").length;
  const trailing = text.length - text.replace(/\*+$/, "").length;
  const run = Math.min(leading, trailing);
  const width = kind === "bold" ? 2 : 1;
  const present = kind === "bold" ? run >= 2 : run % 2 === 1;
  return present ? text.slice(width, text.length - width) : "*".repeat(width) + text + "*".repeat(width);
}
function emphasisEdit(text, start, end, kind) {
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;
  if (start === end) return null;
  let before = 0;
  while (text[start - before - 1] === "*") before += 1;
  let after = 0;
  while (text[end + after] === "*") after += 1;
  const widen = Math.min(before, after);
  const from = start - widen;
  const to = end + widen;
  return { from, to, replacement: toggleEmphasis(text.slice(from, to), kind) };
}

// src/parser.ts
var HEADING = /^(\s*)(#{1,6})(\s+)(.*)$/;
var LIST_ITEM = /^(\s*)([-*+]|\d+[.)])(\s+)(.*)$/;
var CHECKBOX = /^(\[[ xX]\]\s*)(.*)$/;
var FENCE = /^\s*(```|~~~)/;
function stripFrontmatter(content) {
  var _a;
  const lines = content.split("\n");
  if (((_a = lines[0]) == null ? void 0 : _a.trim()) !== "---") return { lines, offset: 0 };
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      return { lines: lines.slice(i + 1), offset: i + 1 };
    }
  }
  return { lines, offset: 0 };
}
function indentWidth(whitespace) {
  let width = 0;
  for (const char of whitespace) width += char === "	" ? 4 : 1;
  return width;
}
function leadingWhitespace(line) {
  var _a, _b;
  return (_b = (_a = line.match(/^\s*/)) == null ? void 0 : _a[0]) != null ? _b : "";
}
function parseMarkdown(content, rootTitle) {
  const makeNode = (text, line) => ({
    id: "",
    text,
    children: [],
    depth: 0,
    line,
    endLine: line,
    prefix: "",
    indent: ""
  });
  const attach = (parent, node) => {
    node.id = `${parent.id}/${parent.children.length}`;
    node.depth = parent.depth + 1;
    parent.children.push(node);
  };
  const root = makeNode(rootTitle, -1);
  root.id = "0";
  const { lines, offset } = stripFrontmatter(content);
  const headings = [];
  let listStack = [];
  let lastItem = null;
  let inFence = false;
  let fenceMarker = "";
  const parentForIndent = (indent) => {
    while (listStack.length && listStack[listStack.length - 1].indent >= indent) {
      listStack.pop();
    }
    return listStack.length ? listStack[listStack.length - 1].node : headings.length ? headings[headings.length - 1].node : root;
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNumber = offset + i;
    const fence = raw.match(FENCE);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (fence[1] === fenceMarker) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    if (raw.trim() === "") {
      lastItem = null;
      continue;
    }
    const heading = raw.match(HEADING);
    if (heading) {
      const level = heading[2].length;
      while (headings.length && headings[headings.length - 1].level >= level) {
        headings.pop();
      }
      const parent = headings.length ? headings[headings.length - 1].node : root;
      const node2 = makeNode(heading[4].trim(), lineNumber);
      node2.headingLevel = level;
      node2.indent = heading[1];
      node2.prefix = heading[1] + heading[2] + heading[3];
      attach(parent, node2);
      headings.push({ level, node: node2 });
      listStack = [];
      lastItem = null;
      continue;
    }
    const item = raw.match(LIST_ITEM);
    if (item) {
      const indent2 = indentWidth(item[1]);
      const bullet = item[2];
      let text = item[4].trim();
      let prefix = item[1] + bullet + item[3];
      const node2 = makeNode("", lineNumber);
      const checkbox = text.match(CHECKBOX);
      if (checkbox) {
        node2.checkbox = /x/i.test(checkbox[1]) ? "checked" : "unchecked";
        prefix += checkbox[1];
        text = checkbox[2].trim();
      }
      node2.text = text;
      node2.indent = item[1];
      node2.bullet = bullet;
      node2.prefix = prefix;
      if (/\d/.test(bullet)) node2.marker = bullet;
      attach(parentForIndent(indent2), node2);
      listStack.push({ indent: indent2, node: node2 });
      lastItem = { indent: indent2, node: node2 };
      continue;
    }
    const whitespace = leadingWhitespace(raw);
    const indent = indentWidth(whitespace);
    if (lastItem && indent > lastItem.indent) {
      lastItem.node.text = `${lastItem.node.text} ${raw.trim()}`.trim();
      lastItem.node.endLine = lineNumber;
      continue;
    }
    const node = makeNode(raw.trim(), lineNumber);
    node.indent = whitespace;
    node.prefix = whitespace;
    attach(parentForIndent(indent), node);
    lastItem = { indent, node };
  }
  return root;
}
function detectIndentUnit(root, fallback = "    ") {
  let found = null;
  const walk = (node) => {
    for (const child of node.children) {
      if (found === null && child.bullet && node.bullet && child.indent.length > node.indent.length) {
        found = child.indent.slice(node.indent.length);
      }
      walk(child);
    }
  };
  walk(root);
  return found != null ? found : fallback;
}

// src/edit.ts
function subtreeEnd(node) {
  let last = node.endLine;
  for (const child of node.children) {
    last = Math.max(last, subtreeEnd(child));
  }
  return last;
}
function isPlainParagraph(node) {
  return node.line >= 0 && !node.bullet && !node.headingLevel;
}
function bulletForChild(node) {
  var _a, _b;
  const model = (_b = (_a = node.children.find((child) => child.bullet)) == null ? void 0 : _a.bullet) != null ? _b : node.bullet;
  if (!model) return "-";
  return /\d/.test(model) ? "1." : model;
}
function blankLineLike(node) {
  if (node.headingLevel) {
    return `${node.indent}${"#".repeat(node.headingLevel)} `;
  }
  if (node.bullet) {
    return `${node.indent}${/\d/.test(node.bullet) ? "1." : node.bullet} `;
  }
  return node.indent;
}
function toggleCheckbox(source, node) {
  if (!node.checkbox || node.line < 0) return source;
  const lines = source.split("\n");
  const next = node.checkbox === "checked" ? "[ ]" : "[x]";
  lines[node.line] = lines[node.line].replace(/\[[ xX]\]/, next);
  return lines.join("\n");
}
function renameNode(source, node, text) {
  if (node.line < 0) return source;
  const lines = source.split("\n");
  const clean = text.replace(/\s*\n\s*/g, " ").trim();
  lines.splice(node.line, node.endLine - node.line + 1, node.prefix + clean);
  return lines.join("\n");
}
function insertSibling(source, node, where) {
  if (node.line < 0) return null;
  const lines = source.split("\n");
  const at = where === "above" ? node.line : subtreeEnd(node) + 1;
  lines.splice(at, 0, blankLineLike(node));
  return { source: lines.join("\n"), line: at };
}
function insertChild(source, node, indentUnit) {
  if (isPlainParagraph(node)) return null;
  const lines = source.split("\n");
  const at = subtreeEnd(node) + 1;
  const line = node.line < 0 || node.headingLevel ? `${node.indent}${bulletForChild(node)} ` : `${node.indent}${indentUnit}${bulletForChild(node)} `;
  lines.splice(at, 0, line);
  return { source: lines.join("\n"), line: at };
}
function insertParent(source, node, parent, indentUnit) {
  var _a;
  if (node.line < 0 || isPlainParagraph(node)) return null;
  const lines = source.split("\n");
  if (node.headingLevel) {
    const parentLevel = (_a = parent.headingLevel) != null ? _a : 0;
    if (node.headingLevel - parentLevel <= 1) return null;
    const line = `${"#".repeat(node.headingLevel - 1)} `;
    lines.splice(node.line, 0, line);
    return { source: lines.join("\n"), line: node.line };
  }
  const start = node.line;
  const end = subtreeEnd(node);
  const block = lines.slice(start, end + 1).map((line) => line.trim() === "" ? line : indentUnit + line);
  lines.splice(start, end - start + 1, blankLineLike(node), ...block);
  return { source: lines.join("\n"), line: start };
}
function deleteNode(source, node) {
  if (node.line < 0) return null;
  const lines = source.split("\n");
  lines.splice(node.line, subtreeEnd(node) - node.line + 1);
  return lines.join("\n");
}
function renumberLists(source) {
  const lines = source.split("\n");
  const root = parseMarkdown(source, "");
  const walk = (node) => {
    let counter = 0;
    for (const child of node.children) {
      if (child.bullet && /\d/.test(child.bullet)) {
        counter += 1;
        const delimiter = child.bullet.endsWith(")") ? ")" : ".";
        lines[child.line] = lines[child.line].replace(
          /^(\s*)\d+[.)]/,
          `$1${counter}${delimiter}`
        );
      } else {
        counter = 0;
      }
      walk(child);
    }
  };
  walk(root);
  return lines.join("\n");
}
function blockEnd(source, node) {
  const lines = source.split("\n");
  const end = subtreeEnd(node);
  let last = end;
  while (last + 1 < lines.length && lines[last + 1].trim() === "") last += 1;
  return last + 1 >= lines.length ? end : last;
}
function moveBlock(source, node, at, newIndent) {
  const lines = source.split("\n");
  const start = node.line;
  const end = blockEnd(source, node);
  const block = lines.splice(start, end - start + 1).map(
    (line) => (
      // Les descendants sont forcément plus indentés que le nœud : leur ligne
      // commence donc par son indentation, et remplacer ce seul préfixe
      // préserve l'écart qu'ils ont entre eux.
      line.startsWith(node.indent) ? newIndent + line.slice(node.indent.length) : line
    )
  );
  const insertAt = at > end ? at - block.length : at;
  lines.splice(insertAt, 0, ...block);
  return { source: lines.join("\n"), line: insertAt };
}
function outdentNode(source, node, parent) {
  if (node.line < 0 || !node.bullet) return null;
  if (!parent.bullet) return null;
  return moveBlock(source, node, blockEnd(source, parent) + 1, parent.indent);
}
function indentNode(source, node, parent, indentUnit) {
  if (node.line < 0 || !node.bullet) return null;
  const index = parent.children.indexOf(node);
  if (index <= 0) return null;
  const previous = parent.children[index - 1];
  if (!previous.bullet) return null;
  const nested = previous.children.find((child) => child.bullet);
  const indent = nested ? nested.indent : previous.indent + indentUnit;
  return moveBlock(source, node, node.line, indent);
}
function moveSibling(source, node, parent, direction) {
  if (node.line < 0 || isPlainParagraph(node)) return null;
  const index = parent.children.indexOf(node);
  if (index < 0) return null;
  const other = parent.children[direction === "up" ? index - 1 : index + 1];
  if (!other) return null;
  const at = direction === "up" ? other.line : blockEnd(source, other) + 1;
  return moveBlock(source, node, at, node.indent);
}
function setHeadingLevel(source, node, level) {
  if (node.line < 0 || level < 1 || level > 6) return null;
  if (node.headingLevel === level) return null;
  if (node.checkbox) return null;
  const lines = source.split("\n");
  lines.splice(
    node.line,
    node.endLine - node.line + 1,
    `${"#".repeat(level)} ${node.text}`
  );
  return lines.join("\n");
}

// src/layout.ts
var DEFAULT_LAYOUT = {
  verticalGap: 6,
  horizontalGap: 36,
  // Palette d3 « category10 », celle qu'on retrouve dans FreeMind/markmap :
  // une couleur par nœud, en cycle, pour séparer visuellement les branches.
  palette: [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf"
  ]
};
function layoutTree(root, sizes, collapsed, options = DEFAULT_LAYOUT) {
  const { verticalGap, horizontalGap, palette } = options;
  const sizeOf = (node) => {
    var _a;
    return (_a = sizes.get(node.id)) != null ? _a : { width: 40, height: 20 };
  };
  const visibleChildren = (node) => collapsed.has(node.id) ? [] : node.children;
  const subtreeHeight = /* @__PURE__ */ new Map();
  const measure = (node) => {
    const children = visibleChildren(node);
    let bandHeight = 0;
    children.forEach((child, index) => {
      bandHeight += measure(child);
      if (index > 0) bandHeight += verticalGap;
    });
    const height2 = Math.max(sizeOf(node).height, bandHeight);
    subtreeHeight.set(node.id, height2);
    return height2;
  };
  measure(root);
  const colorOf = /* @__PURE__ */ new Map();
  let colorIndex = 0;
  const assignColours = (node) => {
    colorOf.set(node.id, palette[colorIndex++ % palette.length]);
    node.children.forEach(assignColours);
  };
  assignColours(root);
  const all = [];
  const place = (node, left, bandTop, parent) => {
    var _a, _b, _c;
    const size = sizeOf(node);
    const bandHeight = (_a = subtreeHeight.get(node.id)) != null ? _a : size.height;
    const placed = {
      node,
      left,
      top: bandTop + (bandHeight - size.height) / 2,
      width: size.width,
      height: size.height,
      color: (_b = colorOf.get(node.id)) != null ? _b : palette[0],
      collapsed: collapsed.has(node.id),
      children: [],
      parent
    };
    all.push(placed);
    const children = visibleChildren(node);
    if (children.length > 0) {
      const childrenHeight = children.reduce(
        (total, child, index) => {
          var _a2;
          return total + ((_a2 = subtreeHeight.get(child.id)) != null ? _a2 : 0) + (index > 0 ? verticalGap : 0);
        },
        0
      );
      const childLeft = left + size.width + horizontalGap;
      let childTop = bandTop + (bandHeight - childrenHeight) / 2;
      for (const child of children) {
        placed.children.push(place(child, childLeft, childTop, placed));
        childTop += ((_c = subtreeHeight.get(child.id)) != null ? _c : 0) + verticalGap;
      }
    }
    return placed;
  };
  const placedRoot = place(root, 0, 0, null);
  const width = all.reduce((max, n) => Math.max(max, n.left + n.width), 0);
  const height = all.reduce((max, n) => Math.max(max, n.top + n.height), 0);
  return { root: placedRoot, all, width, height };
}

// src/render.ts
var SVG_NS = "http://www.w3.org/2000/svg";
var KNOB_RADIUS = 5;
var UNDERLINE_WIDTH = 2;
var SCROLL_MARGIN = 48;
var FOLD_DELAY = 250;
var TAP_SLOP = 6;
var HISTORY_LIMIT = 100;
var MindmapRenderer = class {
  constructor(host, options = DEFAULT_LAYOUT) {
    /** Appelé avec le Markdown complet à chaque modification du fichier. */
    this.onChange = null;
    /**
     * Unité d'indentation à employer quand le fichier n'en révèle aucune.
     * L'hôte y branche le réglage d'Obsidian ; c'est une fonction pour que le
     * réglage soit relu à chaque création, et non figé à l'ouverture.
     */
    this.indentUnitFallback = () => "    ";
    this.source = "";
    this.rootTitle = "";
    this.tree = null;
    /** Pliage volontairement non persisté : c'est un état d'affichage. */
    this.collapsed = /* @__PURE__ */ new Set();
    this.initialised = false;
    /** Nœud actif : cible des raccourcis clavier. */
    this.activeId = null;
    this.editingId = null;
    this.foldTimer = null;
    /** États successifs du texte : notre propre annulation, la vue mindmap
     *  n'ayant pas accès à l'historique de l'éditeur Markdown d'Obsidian. */
    this.undoStack = [];
    this.redoStack = [];
    this.elements = /* @__PURE__ */ new Map();
    this.lastLayout = null;
    this.pan = { x: 0, y: 0 };
    this.zoom = 1;
    this.centred = false;
    /**
     * Pointeurs en cours — souris, doigt ou stylet, sans distinction : un seul
     * déplace la carte, deux la déplacent et la zooment.
     */
    this.pointers = /* @__PURE__ */ new Map();
    /** Départ du geste, pour mesurer la tolérance d'appui. */
    this.gestureStart = { x: 0, y: 0 };
    /** Repères du dernier mouvement : on raisonne en écarts, jamais en absolu. */
    this.lastCenter = { x: 0, y: 0 };
    this.lastSpread = 0;
    this.panning = false;
    this.cleanups = [];
    this.onKeyDown = (event) => {
      if (this.editingId) return;
      const layout = this.lastLayout;
      const current = this.activePlaced();
      if (!layout || !current) return;
      const node = current.node;
      if (event.ctrlKey || event.metaKey) {
        if (this.handleShortcut(event)) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      switch (event.key) {
        case "ArrowUp":
        case "ArrowDown": {
          const peers = layout.all.filter((placed) => placed.node.depth === node.depth);
          const index = peers.indexOf(current);
          const next = peers[index + (event.key === "ArrowDown" ? 1 : -1)];
          if (next) this.select(next.node.id);
          break;
        }
        case "ArrowLeft":
          if (current.parent) this.select(current.parent.node.id);
          break;
        case "ArrowRight":
          if (this.collapsed.has(node.id)) this.toggleCollapse(node.id);
          else if (current.children.length > 0) {
            this.select(current.children[0].node.id);
          }
          break;
        case " ":
          if (node.children.length > 0) this.toggleCollapse(node.id);
          break;
        case "F2":
          this.startEditing(node, "end");
          break;
        case "Enter":
          this.createNode(event.shiftKey ? "above" : "below");
          break;
        case "Tab":
          this.createNode(event.shiftKey ? "parent" : "child");
          break;
        case "Delete":
          this.removeNode();
          break;
        case "Home":
          if (event.altKey) {
            this.setCollapsedBelow(node, true);
            this.draw();
          } else {
            this.startEditing(node, "start");
          }
          break;
        case "End":
          if (event.altKey) {
            this.collapsed.delete(node.id);
            this.setCollapsedBelow(node, false);
            this.draw();
          } else {
            this.startEditing(node, "end");
          }
          break;
        default:
          return;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    this.onWheel = (event) => {
      event.preventDefault();
      const rect = this.viewport.getBoundingClientRect();
      this.zoomAround(
        event.clientX - rect.left,
        event.clientY - rect.top,
        event.deltaY < 0 ? 1.1 : 1 / 1.1
      );
      this.applyTransform();
    };
    /**
     * Début d'un geste — souris, doigt ou stylet : les Pointer Events les
     * donnent sous la même forme, il n'y a donc qu'un seul chemin à tenir.
     *
     * Aucun `preventDefault` ici : c'est `touch-action: none`, dans la feuille
     * de style, qui empêche le navigateur de confisquer le geste. Le retenir
     * ici supprimerait en prime le `click` qui suit un appui, et plus aucun
     * nœud ne se sélectionnerait au doigt.
     */
    this.onPointerDown = (event) => {
      if (event.button !== 0) return;
      if (this.editingId) return;
      this.viewport.focus();
      const first = this.pointers.size === 0;
      if (first) {
        document.addEventListener("pointermove", this.onPointerMove);
        document.addEventListener("pointerup", this.onPointerEnd);
        document.addEventListener("pointercancel", this.onPointerEnd);
      }
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.syncGesture();
      if (first) {
        this.gestureStart = this.lastCenter;
        this.panning = false;
      }
    };
    this.onPointerMove = (event) => {
      const pointer = this.pointers.get(event.pointerId);
      if (!pointer) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      const points = [...this.pointers.values()];
      const center = centreOf(points);
      if (!this.panning) {
        const moved = Math.hypot(
          center.x - this.gestureStart.x,
          center.y - this.gestureStart.y
        );
        if (points.length < 2 && moved < TAP_SLOP) return;
        this.panning = true;
        this.viewport.classList.add("is-panning");
        this.syncGesture();
      }
      if (points.length >= 2 && this.lastSpread > 0) {
        const rect = this.viewport.getBoundingClientRect();
        this.zoomAround(
          center.x - rect.left,
          center.y - rect.top,
          spreadOf(points) / this.lastSpread
        );
      }
      this.pan.x += center.x - this.lastCenter.x;
      this.pan.y += center.y - this.lastCenter.y;
      this.syncGesture();
      this.applyTransform();
    };
    this.onPointerEnd = (event) => {
      if (!this.pointers.delete(event.pointerId)) return;
      if (this.pointers.size === 0) {
        this.releasePointers();
        return;
      }
      this.syncGesture();
    };
    this.options = options;
    host.classList.add("mindedit-host");
    this.viewport = el("div", "mindedit-viewport");
    this.viewport.tabIndex = 0;
    this.canvas = el("div", "mindedit-canvas");
    this.edges = document.createElementNS(SVG_NS, "svg");
    this.edges.setAttribute("class", "mindedit-edges");
    this.nodesLayer = el("div", "mindedit-nodes");
    this.overlay = document.createElementNS(SVG_NS, "svg");
    this.overlay.setAttribute("class", "mindedit-overlay");
    this.canvas.append(this.edges, this.nodesLayer, this.overlay);
    this.viewport.append(this.canvas);
    host.append(this.viewport);
    this.on(this.viewport, "wheel", this.onWheel, { passive: false });
    this.on(this.viewport, "pointerdown", this.onPointerDown);
    this.on(this.viewport, "keydown", this.onKeyDown);
  }
  /** Remplace le contenu affiché. `reset` remet pliage, sélection et cadrage à zéro. */
  setContent(markdown, rootTitle, reset = false) {
    if (reset) {
      this.collapsed.clear();
      this.initialised = false;
      this.centred = false;
      this.activeId = null;
    }
    if (reset) {
      this.undoStack = [];
      this.redoStack = [];
    }
    this.source = markdown;
    this.rootTitle = rootTitle;
    this.tree = parseMarkdown(markdown, rootTitle);
    this.draw();
  }
  focus() {
    this.viewport.focus();
  }
  /** Une édition est en cours : l'appelant ne doit pas réécrire la vue sous nos pieds. */
  isEditing() {
    return this.editingId !== null;
  }
  destroy() {
    this.releasePointers();
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.length = 0;
    this.viewport.remove();
  }
  // ---------------------------------------------------------------- rendu
  draw() {
    const tree = this.tree;
    if (!tree) return;
    if (!this.initialised) {
      this.collapseFromDepth(tree, 1);
      this.initialised = true;
    }
    this.pruneCollapsed(tree);
    this.elements = this.paintNodes(tree);
    this.relayout();
    if (!this.activeId || !this.elements.has(this.activeId)) {
      const fallback = this.activeId ? this.nearestVisibleAncestor(this.activeId, tree) : null;
      this.activeId = fallback != null ? fallback : tree.id;
    }
    if (!this.centred && this.lastLayout) {
      this.centre(this.lastLayout.height);
      this.centred = true;
    }
    this.applyActive();
  }
  /**
   * Recalcule les positions à partir des éléments déjà en place.
   * Séparé de `draw` pour pouvoir refluer pendant la frappe sans détruire
   * le champ d'édition ni le focus.
   */
  relayout() {
    const tree = this.tree;
    if (!tree) return;
    const sizes = this.measure(this.elements);
    const layout = layoutTree(tree, sizes, this.collapsed, this.options);
    this.lastLayout = layout;
    for (const placed of layout.all) {
      const element = this.elements.get(placed.node.id);
      if (!element) continue;
      element.style.left = `${placed.left}px`;
      element.style.top = `${placed.top}px`;
      element.style.visibility = "visible";
    }
    this.paintLinks(layout.all, layout.width, layout.height);
  }
  collapseFromDepth(node, depth) {
    if (node.depth >= depth && node.children.length > 0) {
      this.collapsed.add(node.id);
    }
    node.children.forEach((child) => this.collapseFromDepth(child, depth));
  }
  /** Oublie les identifiants de pliage disparus après une édition. */
  pruneCollapsed(root) {
    const alive = /* @__PURE__ */ new Set();
    const walk = (node) => {
      alive.add(node.id);
      node.children.forEach(walk);
    };
    walk(root);
    for (const id of [...this.collapsed]) {
      if (!alive.has(id)) this.collapsed.delete(id);
    }
  }
  /** Replier un ancêtre masque le nœud actif : on remonte au plus proche visible. */
  nearestVisibleAncestor(id, root) {
    const path = [];
    const find = (node) => {
      path.push(node);
      if (node.id === id) return true;
      if (node.children.some(find)) return true;
      path.pop();
      return false;
    };
    if (!find(root)) return null;
    for (let i = path.length - 1; i >= 0; i--) {
      if (this.elements.has(path[i].id)) return path[i].id;
    }
    return null;
  }
  paintNodes(root) {
    this.nodesLayer.replaceChildren();
    const elements = /* @__PURE__ */ new Map();
    const walk = (node) => {
      const element = this.createNodeEl(node);
      this.nodesLayer.append(element);
      elements.set(node.id, element);
      if (!this.collapsed.has(node.id)) node.children.forEach(walk);
    };
    walk(root);
    return elements;
  }
  createNodeEl(node) {
    const element = el("div", "mindedit-node");
    element.style.visibility = "hidden";
    element.dataset.id = node.id;
    if (node.depth === 0) element.classList.add("is-root");
    if (node.headingLevel) element.classList.add(`is-h${node.headingLevel}`);
    if (node.checkbox) {
      const box = el("span", "mindedit-checkbox");
      box.textContent = node.checkbox === "checked" ? "\u2611" : "\u2610";
      if (node.checkbox === "checked") box.classList.add("is-checked");
      box.addEventListener("click", (event) => {
        event.stopPropagation();
        if (this.editingId) return;
        this.cancelPendingFold();
        this.activeId = node.id;
        this.commitSource(toggleCheckbox(this.source, node));
      });
      element.append(box);
    }
    if (node.marker) {
      const marker = el("span", "mindedit-marker");
      marker.textContent = node.marker;
      element.append(marker);
    }
    const text = el("span", "mindedit-text");
    renderInline(node.text, text);
    element.append(text);
    element.addEventListener("click", (event) => {
      event.stopPropagation();
      this.onNodeClick(node);
    });
    element.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      this.cancelPendingFold();
      this.startEditing(node, "end");
    });
    return element;
  }
  /**
   * Clic sur le corps d'un nœud.
   *
   * Déplier ne détruit rien, replier détruit la vue : le geste non destructeur
   * est donc immédiat, le destructeur exige que le nœud soit déjà actif — et
   * il attend le temps qu'un double-clic puisse le préempter.
   */
  onNodeClick(node) {
    if (this.editingId) return;
    this.cancelPendingFold();
    const wasActive = this.activeId === node.id;
    const isCollapsed = this.collapsed.has(node.id);
    this.activeId = node.id;
    if (node.children.length > 0) {
      if (isCollapsed) {
        this.collapsed.delete(node.id);
        this.draw();
        return;
      }
      if (wasActive) {
        this.foldTimer = window.setTimeout(() => {
          this.foldTimer = null;
          this.collapsed.add(node.id);
          this.draw();
        }, FOLD_DELAY);
      }
    }
    this.applyActive();
  }
  cancelPendingFold() {
    if (this.foldTimer === null) return;
    window.clearTimeout(this.foldTimer);
    this.foldTimer = null;
  }
  /** Lecture groupée des tailles, pour éviter les reflows en cascade. */
  measure(elements) {
    const sizes = /* @__PURE__ */ new Map();
    for (const [id, element] of elements) {
      const rect = element.getBoundingClientRect();
      sizes.set(id, {
        width: rect.width / this.zoom,
        height: rect.height / this.zoom
      });
    }
    return sizes;
  }
  /**
   * Trace les liaisons, les soulignements et les pastilles.
   *
   * Le soulignement est un tracé SVG, et non une bordure CSS : une bordure est
   * rastérisée par le moteur de mise en page, calée sur la grille de pixels,
   * alors qu'un tracé SVG ne l'est pas. Comme les nœuds tombent à des
   * positions fractionnaires, les deux systèmes arrondissaient chacun de leur
   * côté et la jointure se décalait différemment à chaque branche. Un seul
   * système de rendu, donc un seul arrondi, donc aucun décrochement.
   */
  paintLinks(all, width, height) {
    const margin = KNOB_RADIUS * 2;
    for (const layer of [this.edges, this.overlay]) {
      layer.replaceChildren();
      layer.setAttribute("width", `${width + margin}`);
      layer.setAttribute("height", `${height + margin}`);
    }
    const underlineY = (node) => node.top + node.height - UNDERLINE_WIDTH / 2;
    for (const placed of all) {
      const startX = placed.left + placed.width;
      const startY = underlineY(placed);
      const underline = document.createElementNS(SVG_NS, "path");
      underline.setAttribute("d", `M ${placed.left},${startY} L ${startX},${startY}`);
      underline.setAttribute("stroke", placed.color);
      underline.setAttribute("class", "mindedit-edge");
      this.overlay.append(underline);
      for (const child of placed.children) {
        const endX = child.left;
        const endY = underlineY(child);
        const bend = Math.max((endX - startX) / 2, 12);
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute(
          "d",
          `M ${startX},${startY} C ${startX + bend},${startY} ${endX - bend},${endY} ${endX},${endY}`
        );
        path.setAttribute("stroke", child.color);
        path.setAttribute("class", "mindedit-edge");
        this.edges.append(path);
      }
      if (placed.node.children.length > 0) {
        const knob = document.createElementNS(SVG_NS, "circle");
        knob.setAttribute("cx", `${startX}`);
        knob.setAttribute("cy", `${startY}`);
        knob.setAttribute("r", `${KNOB_RADIUS}`);
        knob.setAttribute("stroke", placed.color);
        knob.setAttribute("class", "mindedit-knob");
        if (placed.collapsed) knob.style.fill = placed.color;
        this.overlay.append(knob);
        const target = document.createElementNS(SVG_NS, "circle");
        target.setAttribute("cx", `${startX}`);
        target.setAttribute("cy", `${startY}`);
        target.setAttribute("r", `${KNOB_RADIUS * 2.2}`);
        target.setAttribute("class", "mindedit-knob-target");
        target.addEventListener("click", (event) => {
          event.stopPropagation();
          if (this.editingId) return;
          this.cancelPendingFold();
          this.activeId = placed.node.id;
          this.toggleCollapse(placed.node.id);
        });
        this.overlay.append(target);
      }
    }
  }
  toggleCollapse(id) {
    if (this.collapsed.has(id)) this.collapsed.delete(id);
    else this.collapsed.add(id);
    this.draw();
  }
  // -------------------------------------------------------------- édition
  /**
   * Passe un nœud en édition sur place. Le texte reste dans son propre
   * élément, donc la carte reflue en direct pendant la frappe.
   */
  startEditing(node, caret, isNew = false) {
    if (this.editingId) return;
    if (node.line < 0) return;
    const element = this.elements.get(node.id);
    const span = element == null ? void 0 : element.querySelector(".mindedit-text");
    if (!element || !span) return;
    this.editingId = node.id;
    element.classList.add("is-editing");
    span.textContent = node.text;
    span.contentEditable = "true";
    span.spellcheck = false;
    span.focus();
    placeCaret(span, caret);
    const original = node.text;
    let settled = false;
    const finish = (commit) => {
      var _a;
      if (settled) return;
      settled = true;
      span.contentEditable = "false";
      element.classList.remove("is-editing");
      this.editingId = null;
      const value = ((_a = span.textContent) != null ? _a : "").trim();
      if (isNew && (!commit || value === "")) {
        this.discardLastChange();
        this.viewport.focus();
        return;
      }
      if (commit && value !== original) {
        this.commitSource(renameNode(this.source, node, value));
      } else {
        renderInline(original, span);
        this.relayout();
      }
      this.viewport.focus();
    };
    span.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (this.handleShortcut(event)) {
        event.preventDefault();
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    });
    span.addEventListener("input", () => this.relayout());
    span.addEventListener("blur", () => finish(true));
  }
  /**
   * Ctrl+B / Ctrl+I pendant la saisie : entoure la sélection de `**` ou `*`,
   * ou les retire s'ils y sont déjà.
   *
   * Le remplacement passe par `insertText`, comme une frappe : Ctrl+Z l'annule
   * dans le texte, alors que réécrire `textContent` viderait l'historique de
   * saisie. Sans sélection, rien ne se passe — mais la touche reste retenue,
   * sinon le navigateur poserait son propre gras HTML, que la validation
   * ferait disparaître sans un mot.
   */
  toggleEmphasisInEditor(kind) {
    var _a, _b;
    const span = this.editingId ? (_a = this.elements.get(this.editingId)) == null ? void 0 : _a.querySelector(".mindedit-text") : null;
    const selection = window.getSelection();
    if (!span || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed || !span.contains(range.commonAncestorContainer)) return;
    const text = (_b = span.textContent) != null ? _b : "";
    const edit = emphasisEdit(
      text,
      textOffset(span, range.startContainer, range.startOffset),
      textOffset(span, range.endContainer, range.endOffset),
      kind
    );
    if (!edit) return;
    selectText(span, edit.from, edit.to);
    if (!document.execCommand("insertText", false, edit.replacement)) {
      span.textContent = text.slice(0, edit.from) + edit.replacement + text.slice(edit.to);
    }
    selectText(span, edit.from, edit.from + edit.replacement.length);
    this.relayout();
  }
  /** Applique un nouveau Markdown : on re-parse, on redessine, on prévient l'hôte. */
  commitSource(markdown) {
    this.undoStack.push(this.source);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack.length = 0;
    this.applySource(markdown);
  }
  applySource(markdown) {
    var _a;
    this.source = markdown;
    this.tree = parseMarkdown(markdown, this.rootTitle);
    this.draw();
    (_a = this.onChange) == null ? void 0 : _a.call(this, markdown);
  }
  undo() {
    const previous = this.undoStack.pop();
    if (previous === void 0) return;
    this.redoStack.push(this.source);
    this.applySource(previous);
  }
  redo() {
    const next = this.redoStack.pop();
    if (next === void 0) return;
    this.undoStack.push(this.source);
    this.applySource(next);
  }
  /** Défait la dernière modification sans la verser dans « refaire » : sert à
   *  annuler une création que l'auteur n'a finalement pas nommée. */
  discardLastChange() {
    const previous = this.undoStack.pop();
    if (previous === void 0) return;
    this.applySource(previous);
  }
  // -------------------------------------------------------- structure
  /** Déplie tous les ancêtres d'un nœud, pour qu'il soit réellement visible. */
  reveal(id) {
    const parts = id.split("/");
    for (let i = 1; i < parts.length; i++) {
      this.collapsed.delete(parts.slice(0, i).join("/"));
    }
  }
  findNodeByLine(line) {
    let found = null;
    const walk = (node) => {
      if (node.line === line) found = node;
      node.children.forEach(walk);
    };
    if (this.tree) walk(this.tree);
    return found;
  }
  /** Crée un nœud, l'affiche, et ouvre aussitôt la saisie de son texte. */
  createNode(kind) {
    const current = this.activePlaced();
    if (!current || !this.tree) return;
    const node = current.node;
    const unit = detectIndentUnit(this.tree, this.indentUnitFallback());
    let result = null;
    switch (kind) {
      case "below":
        result = insertSibling(this.source, node, "below");
        break;
      case "above":
        result = insertSibling(this.source, node, "above");
        break;
      case "child":
        result = insertChild(this.source, node, unit);
        break;
      case "parent":
        if (current.parent) {
          result = insertParent(this.source, node, current.parent.node, unit);
        }
        break;
    }
    if (!result) return;
    if (kind === "child") this.collapsed.delete(node.id);
    this.commitSource(renumberLists(result.source));
    const created = this.findNodeByLine(result.line);
    if (!created) return;
    this.reveal(created.id);
    this.activeId = created.id;
    this.draw();
    const placed = this.activePlaced();
    if (placed) this.startEditing(placed.node, "end", true);
  }
  removeNode() {
    const current = this.activePlaced();
    if (!current) return;
    const removedId = current.node.id;
    const next = deleteNode(this.source, current.node);
    if (next === null) return;
    this.commitSource(renumberLists(next));
    this.selectAfterDelete(removedId);
    this.applyActive();
  }
  /**
   * Après suppression, les frères suivants remontent d'un rang : l'identifiant
   * du disparu désigne donc désormais son frère suivant, s'il en avait un.
   */
  selectAfterDelete(id) {
    if (this.elements.has(id)) {
      this.activeId = id;
      return;
    }
    const parts = id.split("/");
    const index = Number(parts[parts.length - 1]);
    if (index > 0) {
      const previous = [...parts.slice(0, -1), String(index - 1)].join("/");
      if (this.elements.has(previous)) {
        this.activeId = previous;
        return;
      }
    }
    this.activeId = parts.slice(0, -1).join("/");
  }
  /**
   * Déplace le nœud actif dans la structure, sa descendance avec lui.
   *
   * Toute opération refusée par `edit.ts` s'arrête ici sans bruit : c'est la
   * règle du plugin, une touche qui n'a rien à faire ne dit rien.
   */
  moveNode(kind) {
    const current = this.activePlaced();
    if (!current || !this.tree || !current.parent) return;
    const node = current.node;
    const parent = current.parent.node;
    const unit = detectIndentUnit(this.tree, this.indentUnitFallback());
    let result = null;
    switch (kind) {
      case "outdent":
        result = outdentNode(this.source, node, parent);
        break;
      case "indent":
        result = indentNode(this.source, node, parent, unit);
        break;
      case "up":
      case "down":
        result = moveSibling(this.source, node, parent, kind);
        break;
    }
    if (!result) return;
    this.commitSource(renumberLists(result.source));
    this.selectByLine(result.line);
  }
  /** Donne au nœud actif un niveau de titre. */
  applyHeading(level) {
    const current = this.activePlaced();
    if (!current) return;
    const line = current.node.line;
    const next = setHeadingLevel(this.source, current.node, level);
    if (next === null) return;
    this.commitSource(renumberLists(next));
    this.selectByLine(line);
  }
  /**
   * Rend actif le nœud qui occupe désormais cette ligne.
   *
   * Un nœud est identifié par son chemin : déplacer une branche change donc
   * son identifiant, et seule la ligne source permet de la retrouver.
   */
  selectByLine(line) {
    const moved = this.findNodeByLine(line);
    if (!moved) return;
    this.reveal(moved.id);
    this.activeId = moved.id;
    this.draw();
  }
  // ------------------------------------------------------------- sélection
  /** Met à jour la surbrillance sans relancer le calcul de disposition. */
  applyActive() {
    for (const [id, element] of this.elements) {
      element.classList.toggle("is-active", id === this.activeId);
    }
    this.scrollIntoView();
    this.applyTransform();
  }
  select(id) {
    this.activeId = id;
    this.applyActive();
  }
  activePlaced() {
    var _a;
    if (!this.lastLayout || !this.activeId) return null;
    return (_a = this.lastLayout.all.find((p) => p.node.id === this.activeId)) != null ? _a : null;
  }
  /** Déplace la carte du minimum nécessaire pour que le nœud actif reste visible. */
  scrollIntoView() {
    const placed = this.activePlaced();
    if (!placed) return;
    const view = this.viewport.getBoundingClientRect();
    const left = placed.left * this.zoom + this.pan.x;
    const top = placed.top * this.zoom + this.pan.y;
    const right = left + placed.width * this.zoom;
    const bottom = top + placed.height * this.zoom;
    if (left < SCROLL_MARGIN) this.pan.x += SCROLL_MARGIN - left;
    else if (right > view.width - SCROLL_MARGIN) {
      this.pan.x -= right - (view.width - SCROLL_MARGIN);
    }
    if (top < SCROLL_MARGIN) this.pan.y += SCROLL_MARGIN - top;
    else if (bottom > view.height - SCROLL_MARGIN) {
      this.pan.y -= bottom - (view.height - SCROLL_MARGIN);
    }
  }
  // --------------------------------------------------------------- clavier
  /**
   * Raccourcis tenus sous Ctrl. Renvoie `true` si la touche a été prise en
   * charge : l'appelant doit alors l'empêcher d'aller plus loin.
   *
   * Public parce que l'hôte doit pouvoir l'appeler **avant** que la touche
   * n'atteigne la carte : Obsidian lit le clavier en phase de capture et
   * consomme ses propres raccourcis — Ctrl+↑ y replie les titres — sans que
   * notre écouteur ne les voie jamais.
   */
  handleShortcut(event) {
    if (!(event.ctrlKey || event.metaKey)) return false;
    const key = event.key.toLowerCase();
    if (this.editingId) {
      if (event.shiftKey || event.altKey) return false;
      if (key === "b") this.toggleEmphasisInEditor("bold");
      else if (key === "i") this.toggleEmphasisInEditor("italic");
      else return false;
      return true;
    }
    if (!this.activePlaced()) return false;
    const level = headingLevelFromKey(event);
    if (key === "z" && !event.shiftKey) this.undo();
    else if (key === "y" || key === "z" && event.shiftKey) this.redo();
    else if (event.key === "ArrowLeft") this.moveNode("outdent");
    else if (event.key === "ArrowRight") this.moveNode("indent");
    else if (event.key === "ArrowUp") this.moveNode("up");
    else if (event.key === "ArrowDown") this.moveNode("down");
    else if (level !== null) this.applyHeading(level);
    else return false;
    return true;
  }
  /** Plie ou déplie tous les descendants d'un nœud, lui-même exclu. */
  setCollapsedBelow(node, collapse) {
    const walk = (current) => {
      if (current.children.length > 0) {
        if (collapse) this.collapsed.add(current.id);
        else this.collapsed.delete(current.id);
      }
      current.children.forEach(walk);
    };
    node.children.forEach(walk);
  }
  // ------------------------------------------------------------ zoom / pan
  centre(contentHeight) {
    const rect = this.viewport.getBoundingClientRect();
    this.pan = {
      x: 40,
      y: Math.max(24, (rect.height - contentHeight) / 2)
    };
  }
  applyTransform() {
    this.canvas.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
  }
  /**
   * Zoome en gardant immobile le point `(x, y)` du viewport : celui qui est
   * sous le curseur, ou celui qui tient entre deux doigts.
   *
   * Ne peint pas — l'appelant peut ainsi enchaîner un zoom et un déplacement
   * et n'appliquer qu'une seule transformation.
   */
  zoomAround(x, y, factor) {
    const next = Math.min(3, Math.max(0.2, this.zoom * factor));
    const ratio = next / this.zoom;
    this.pan.x = x - (x - this.pan.x) * ratio;
    this.pan.y = y - (y - this.pan.y) * ratio;
    this.zoom = next;
  }
  /** Reprend les repères du geste sur les pointeurs présents. */
  syncGesture() {
    const points = [...this.pointers.values()];
    if (points.length === 0) return;
    this.lastCenter = centreOf(points);
    this.lastSpread = spreadOf(points);
  }
  /** Fin du geste : on cesse d'écouter le document. */
  releasePointers() {
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerEnd);
    document.removeEventListener("pointercancel", this.onPointerEnd);
    this.pointers.clear();
    this.panning = false;
    this.viewport.classList.remove("is-panning");
  }
  on(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this.cleanups.push(() => target.removeEventListener(type, handler, options));
  }
};
function headingLevelFromKey(event) {
  if (/^[1-6]$/.test(event.key)) return Number(event.key);
  const physical = event.code.match(/^(?:Digit|Numpad)([1-6])$/);
  return physical ? Number(physical[1]) : null;
}
function centreOf(points) {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  return { x: x / points.length, y: y / points.length };
}
function spreadOf(points) {
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}
function el(tag, className) {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}
function placeCaret(element, where) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(where === "start");
  const selection = window.getSelection();
  selection == null ? void 0 : selection.removeAllRanges();
  selection == null ? void 0 : selection.addRange(range);
}
function textOffset(root, node, offset) {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}
function selectText(root, start, end) {
  var _a, _b;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let seen = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = (_b = (_a = node.textContent) == null ? void 0 : _a.length) != null ? _b : 0;
    if (!started && start <= seen + length) {
      range.setStart(node, start - seen);
      started = true;
    }
    if (started && end <= seen + length) {
      range.setEnd(node, end - seen);
      break;
    }
    seen += length;
  }
  if (!started) return;
  const selection = window.getSelection();
  selection == null ? void 0 : selection.removeAllRanges();
  selection == null ? void 0 : selection.addRange(range);
}

// src/view.ts
var MINDEDIT_VIEW = "mindedit-view";
var MindEditView = class extends import_obsidian.TextFileView {
  constructor(leaf) {
    super(leaf);
    this.raw = "";
    this.renderer = null;
  }
  getViewType() {
    return MINDEDIT_VIEW;
  }
  getDisplayText() {
    var _a, _b;
    return (_b = (_a = this.file) == null ? void 0 : _a.basename) != null ? _b : "Sans titre";
  }
  getIcon() {
    return "network";
  }
  getViewData() {
    return this.raw;
  }
  setViewData(data, clear) {
    var _a, _b, _c, _d;
    this.raw = data;
    if ((_a = this.renderer) == null ? void 0 : _a.isEditing()) return;
    (_d = this.renderer) == null ? void 0 : _d.setContent(data, (_c = (_b = this.file) == null ? void 0 : _b.basename) != null ? _c : "Sans titre", clear);
  }
  clear() {
    this.raw = "";
  }
  async onOpen() {
    var _a, _b;
    this.contentEl.empty();
    this.contentEl.addClass("mindedit-view");
    this.contentEl.dataset.ignoreSwipe = "true";
    this.renderer = new MindmapRenderer(this.contentEl);
    this.renderer.indentUnitFallback = () => this.obsidianIndentUnit();
    this.renderer.onChange = (markdown) => {
      this.raw = markdown;
      this.requestSave();
    };
    if (this.raw) {
      this.renderer.setContent(this.raw, (_b = (_a = this.file) == null ? void 0 : _a.basename) != null ? _b : "Sans titre", true);
    }
    this.registerShortcuts();
    this.renderer.focus();
  }
  /**
   * Donne à la carte ses raccourcis Ctrl avant qu'Obsidian ne les consomme.
   *
   * Obsidian lit le clavier en phase de capture, sur la fenêtre : un raccourci
   * qu'il exécute — Ctrl+↑ « replier plus », par exemple — n'arrive jamais
   * jusqu'à la carte. La portée de la vue active est consultée avant les
   * raccourcis globaux : c'est là qu'on se place.
   *
   * Une touche reconnue ici n'est plus cherchée ailleurs. Quand la carte n'en
   * fait rien (Ctrl+Z pendant une saisie), on la laisse simplement filer
   * jusqu'au texte, sans l'empêcher.
   */
  registerShortcuts() {
    const scope = new import_obsidian.Scope(this.app.scope);
    const forward = (event) => {
      var _a;
      return ((_a = this.renderer) == null ? void 0 : _a.handleShortcut(event)) ? false : true;
    };
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "z", "y", "b", "i"];
    for (const key of [...keys, "1", "2", "3", "4", "5", "6"]) {
      scope.register(["Mod"], key, forward);
    }
    scope.register(["Mod", "Shift"], "z", forward);
    this.scope = scope;
  }
  /**
   * Indentation configurée dans Obsidian (Éditeur → « Indenter avec des
   * tabulations » et « Taille de tabulation »), pour que nos ajouts s'alignent
   * sur ce que fait la touche Tab de l'éditeur Markdown.
   *
   * `getConfig` ne fait pas partie de l'API publique : on se replie sur quatre
   * espaces si elle venait à disparaître.
   */
  obsidianIndentUnit() {
    const vault = this.app.vault;
    if (typeof vault.getConfig !== "function") return "    ";
    if (vault.getConfig("useTab") === true) return "	";
    const size = vault.getConfig("tabSize");
    return " ".repeat(typeof size === "number" && size > 0 ? size : 4);
  }
  async onClose() {
    var _a;
    (_a = this.renderer) == null ? void 0 : _a.destroy();
    this.renderer = null;
  }
};

// src/main.ts
var FLAG = "mindmap";
var MindEditPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    this.registerView(MINDEDIT_VIEW, (leaf) => new MindEditView(leaf));
    this.addRibbonIcon(
      "network",
      "Basculer en mindmap",
      () => this.toggleCurrentView()
    );
    this.addCommand({
      id: "toggle",
      name: "Basculer entre Markdown et mindmap",
      callback: () => this.toggleCurrentView()
    });
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (!file) return;
        const leaf = this.app.workspace.getMostRecentLeaf();
        if (!leaf || leaf.getViewState().type !== "markdown") return;
        if (this.hasFlag(file)) void this.setLeafType(leaf, MINDEDIT_VIEW);
      })
    );
  }
  onunload() {
  }
  hasFlag(file) {
    var _a;
    const frontmatter = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
    return (frontmatter == null ? void 0 : frontmatter[FLAG]) === true;
  }
  async toggleCurrentView() {
    const leaf = this.app.workspace.getMostRecentLeaf();
    if (!leaf) return;
    const type = leaf.getViewState().type;
    if (type === MINDEDIT_VIEW) {
      const file = leaf.view.file;
      if (file) await this.writeFlag(file, false);
      await this.setLeafType(leaf, "markdown");
      return;
    }
    if (type === "markdown") {
      const file = leaf.view.file;
      if (!file) return;
      await this.writeFlag(file, true);
      await this.setLeafType(leaf, MINDEDIT_VIEW);
      return;
    }
    new import_obsidian2.Notice("MindEdit : ouvrez d'abord une note Markdown.");
  }
  /** Ajoute ou retire le drapeau sans jamais toucher au corps de la note. */
  async writeFlag(file, enabled) {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      if (enabled) frontmatter[FLAG] = true;
      else delete frontmatter[FLAG];
    });
  }
  async setLeafType(leaf, type) {
    const state = leaf.getViewState();
    await leaf.setViewState({
      ...state,
      type,
      state: { ...state.state, mode: type === "markdown" ? "source" : void 0 }
    });
  }
};
