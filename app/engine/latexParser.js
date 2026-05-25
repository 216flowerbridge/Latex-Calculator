function cleanLatex(input) {
  let text = String(input || "").trim();

  text = text.replace(/^\$\$([\s\S]*)\$\$$/, "$1");
  text = text.replace(/^\$([\s\S]*)\$$/, "$1");
  text = text.replace(/^\\\[([\s\S]*)\\\]$/, "$1");
  text = text.replace(/^\\\(([\s\S]*)\\\)$/, "$1");

  text = text.replace(/\\begin\{equation\*?\}/g, "");
  text = text.replace(/\\end\{equation\*?\}/g, "");
  text = text.replace(/\\begin\{align\*?\}/g, "");
  text = text.replace(/\\end\{align\*?\}/g, "");
  text = text.replace(/&=/g, "=");
  text = text.replace(/\\left/g, "");
  text = text.replace(/\\right/g, "");
  text = text.replace(/\\,/g, " ");
  text = text.replace(/\\;/g, " ");
  text = text.replace(/\\!/g, "");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function findTopLevelEquals(text) {
  let brace = 0;
  let paren = 0;
  let bracket = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") brace += 1;
    else if (ch === "}") brace = Math.max(0, brace - 1);
    else if (ch === "(") paren += 1;
    else if (ch === ")") paren = Math.max(0, paren - 1);
    else if (ch === "[") bracket += 1;
    else if (ch === "]") bracket = Math.max(0, bracket - 1);
    else if (ch === "=" && brace === 0 && paren === 0 && bracket === 0) return i;
  }

  return -1;
}

function readGroup(text, startIndex) {
  let i = startIndex;
  while (i < text.length && /\s/.test(text[i])) i += 1;

  if (text[i] !== "{") {
    let end = i;
    while (end < text.length && /[A-Za-z0-9_.\\]+/.test(text[end])) end += 1;
    if (end === i) throw new Error(`无法读取 LaTeX 参数：${text.slice(startIndex)}`);
    return { content: text.slice(i, end), endIndex: end };
  }

  let depth = 0;
  for (let j = i; j < text.length; j += 1) {
    if (text[j] === "{") depth += 1;
    if (text[j] === "}") depth -= 1;
    if (depth === 0) {
      return { content: text.slice(i + 1, j), endIndex: j + 1 };
    }
  }

  throw new Error("花括号没有闭合。");
}

function replaceCommandTwoGroups(text, command, replacer) {
  let output = "";
  let i = 0;
  const token = `\\${command}`;

  while (i < text.length) {
    const found = text.indexOf(token, i);
    if (found < 0) {
      output += text.slice(i);
      break;
    }

    output += text.slice(i, found);
    const first = readGroup(text, found + token.length);
    const second = readGroup(text, first.endIndex);
    output += replacer(first.content, second.content);
    i = second.endIndex;
  }

  return output;
}

function replaceSqrt(text) {
  let output = "";
  let i = 0;
  const token = "\\sqrt";

  while (i < text.length) {
    const found = text.indexOf(token, i);
    if (found < 0) {
      output += text.slice(i);
      break;
    }

    output += text.slice(i, found);
    let pos = found + token.length;
    while (pos < text.length && /\s/.test(text[pos])) pos += 1;

    if (text[pos] === "[") {
      const endBracket = text.indexOf("]", pos);
      if (endBracket < 0) throw new Error("根式次数方括号没有闭合。");
      const degree = text.slice(pos + 1, endBracket);
      const radicand = readGroup(text, endBracket + 1);
      output += `((${latexToExpression(radicand.content)})^(1/(${latexToExpression(degree)})))`;
      i = radicand.endIndex;
    } else {
      const radicand = readGroup(text, pos);
      output += `sqrt(${latexToExpression(radicand.content)})`;
      i = radicand.endIndex;
    }
  }

  return output;
}

function parseMatrix(cleaned) {
  const match = cleaned.match(/\\begin\{(bmatrix|pmatrix|matrix|Bmatrix|vmatrix|Vmatrix)\}([\s\S]*?)\\end\{\1\}/);
  if (!match) return null;

  const body = match[2].trim();
  const rows = body
    .split(/\\\\/)
    .map((row) => row.trim())
    .filter(Boolean);

  const matrix = rows.map((row) =>
    row.split("&").map((cell) => latexToExpression(cell.trim()))
  );

  if (matrix.length === 0) throw new Error("矩阵为空。");
  const width = matrix[0].length;
  if (matrix.some((row) => row.length !== width)) throw new Error("矩阵每一行的列数不一致。");

  return matrix;
}

function replaceFunctions(text) {
  const functionMap = [
    ["arcsin", "asin"],
    ["arccos", "acos"],
    ["arctan", "atan"],
    ["sin", "sin"],
    ["cos", "cos"],
    ["tan", "tan"],
    ["cot", "cot"],
    ["sec", "sec"],
    ["csc", "csc"],
    ["ln", "log"],
    ["log", "log"],
    ["exp", "exp"]
  ];

  for (const [latexName, jsName] of functionMap) {
    const command = `\\${latexName}`;
    text = text.replaceAll(command, jsName);
  }

  text = text.replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|log|exp)\s*\{([^{}]+)\}/g, "$1($2)");
  text = text.replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|log|exp)\s+([A-Za-z0-9_.]+)/g, "$1($2)");

  return text;
}

function normalizeOperators(text) {
  const replacements = [
    [/\\cdot/g, "*"],
    [/\\times/g, "*"],
    [/\\div/g, "/"],
    [/\\pi/g, "pi"],
    [/\\infty/g, "Infinity"],
    [/\\alpha/g, "alpha"],
    [/\\beta/g, "beta"],
    [/\\gamma/g, "gamma"],
    [/\\delta/g, "delta"],
    [/\\theta/g, "theta"],
    [/\\lambda/g, "lambda"],
    [/\\mu/g, "mu"],
    [/\\sigma/g, "sigma"],
    [/\\omega/g, "omega"],
    [/\\phi/g, "phi"],
    [/\\varphi/g, "phi"]
  ];

  for (const [pattern, value] of replacements) text = text.replace(pattern, value);

  text = text.replace(/\\operatorname\{([^{}]+)\}/g, "$1");
  text = text.replace(/\\mathrm\{([^{}]+)\}/g, "$1");
  text = text.replace(/\\,/g, "");
  text = text.replace(/[{}]/g, (ch) => (ch === "{" ? "(" : ")"));

  return text;
}

function addSimpleImplicitMultiplication(text) {
  text = text.replace(/(\d)([A-Za-z])/g, "$1*$2");
  text = text.replace(/(\))(\()/g, "$1*$2");
  text = text.replace(/(\d)(\()/g, "$1*$2");
  return text;
}

function latexToExpression(input) {
  let text = cleanLatex(input);

  let previous = "";
  while (previous !== text) {
    previous = text;
    text = replaceCommandTwoGroups(text, "frac", (a, b) => `((${latexToExpression(a)})/(${latexToExpression(b)}))`);
  }

  text = replaceSqrt(text);
  text = replaceFunctions(text);
  text = normalizeOperators(text);
  text = text.replace(/\^\s*\(([^()]+)\)/g, "^($1)");
  text = text.replace(/\^\s*\{([^{}]+)\}/g, "^($1)");
  text = text.replace(/\s+/g, "");
  text = addSimpleImplicitMultiplication(text);

  if (text.includes("\\")) {
    throw new Error(`仍存在未识别的 LaTeX 命令：${text}`);
  }

  return text;
}

function parseLatex(input) {
  const cleaned = cleanLatex(input);
  if (!cleaned) throw new Error("请输入 LaTeX 公式。");

  const matrix = parseMatrix(cleaned);
  if (matrix) {
    return {
      kind: "matrix",
      original: input,
      cleaned,
      matrix,
      expression: JSON.stringify(matrix)
    };
  }

  const eqIndex = findTopLevelEquals(cleaned);
  if (eqIndex >= 0) {
    const leftLatex = cleaned.slice(0, eqIndex).trim();
    const rightLatex = cleaned.slice(eqIndex + 1).trim();
    const left = latexToExpression(leftLatex);
    const right = latexToExpression(rightLatex);

    return {
      kind: "equation",
      original: input,
      cleaned,
      left,
      right,
      expression: `(${left})-(${right})`,
      equation: `${left}=${right}`
    };
  }

  return {
    kind: "expression",
    original: input,
    cleaned,
    expression: latexToExpression(cleaned)
  };
}

module.exports = {
  cleanLatex,
  latexToExpression,
  parseLatex
};
