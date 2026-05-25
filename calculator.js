const nerdamer = require("nerdamer");
require("nerdamer/Algebra");
require("nerdamer/Calculus");
require("nerdamer/Solve");
require("nerdamer/Extra");

const math = require("mathjs");
const { parseLatex } = require("./latexParser");

const EXAMPLES = [
  { name: "化简：有理式", latex: String.raw`\frac{x^2 - 1}{x - 1}` },
  { name: "求导：多项式 + 三角函数", latex: String.raw`x^3 + \sin{x}` },
  { name: "不定积分", latex: String.raw`x^2 + \cos{x}` },
  { name: "定积分", latex: String.raw`x^2` },
  { name: "极限", latex: String.raw`\frac{\sin{x}}{x}` },
  { name: "解方程", latex: String.raw`x^2 - 4 = 0` },
  { name: "数值计算", latex: String.raw`\sqrt{2} + \pi` },
  { name: "矩阵", latex: String.raw`\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}` }
];

function inferOperation(parsed) {
  if (parsed.kind === "matrix") return "矩阵行列式";
  if (parsed.kind === "equation") return "解方程";
  return "化简";
}

function parseSubstitutions(text) {
  const result = {};
  if (!text || !text.trim()) return result;

  for (const part of text.split(",")) {
    const item = part.trim();
    if (!item) continue;
    const idx = item.indexOf("=");
    if (idx < 0) throw new Error(`变量代入格式错误：${item}。正确写法示例：x=2, y=pi`);
    const key = item.slice(0, idx).trim();
    const value = item.slice(idx + 1).trim();
    if (!key || !value) throw new Error(`变量代入格式错误：${item}`);
    result[key] = value;
  }

  return result;
}

function nerdText(expr) {
  return nerdamer(expr).text();
}

function nerdLatex(expr) {
  try {
    return nerdamer(expr).toTeX();
  } catch {
    return String(expr);
  }
}

function resultToLatex(value) {
  try {
    if (Array.isArray(value)) return JSON.stringify(value, null, 2);
    return nerdLatex(String(value));
  } catch {
    return String(value);
  }
}

function expressionWithSubstitution(expr, substitutions) {
  const subs = parseSubstitutions(substitutions);
  if (Object.keys(subs).length === 0) throw new Error("请填写代入值，例如：x=2, y=pi");

  let out = String(expr);
  for (const [name, value] of Object.entries(subs)) {
    const regex = new RegExp(`\\b${name}\\b`, "g");
    out = out.replace(regex, `(${value})`);
  }
  return out;
}

function substituteVariable(expr, variable, value) {
  const regex = new RegExp(`\\b${variable}\\b`, "g");
  return String(expr).replace(regex, `(${value})`);
}

function calculateExpression(parsed, request, operation) {
  const expr = parsed.expression;
  const variable = request.variable || "x";

  if (operation === "化简") {
    return nerdText(expr);
  }

  if (operation === "数值计算") {
    const expression = request.substitutions
      ? expressionWithSubstitution(expr, request.substitutions)
      : expr;
    return nerdamer(expression).evaluate().text();
  }

  if (operation === "求导") {
    let current = expr;
    const order = Math.max(1, Number(request.order || 1));
    for (let i = 0; i < order; i += 1) {
      current = nerdamer.diff(current, variable).text();
    }
    return current;
  }

  if (operation === "不定积分") {
    return nerdamer.integrate(expr, variable).text();
  }

  if (operation === "定积分") {
    if (!request.lower || !request.upper) throw new Error("定积分需要填写下限和上限。");
    const anti = nerdamer.integrate(expr, variable).text();
    const upperExpr = substituteVariable(anti, variable, request.upper);
    const lowerExpr = substituteVariable(anti, variable, request.lower);
    return nerdamer(`(${upperExpr})-(${lowerExpr})`).evaluate().text();
  }

  if (operation === "极限") {
    const point = request.approach || "0";
    const dir = request.direction ? `,${request.direction}` : "";
    try {
      return nerdamer(`limit(${expr},${variable},${point}${dir})`).text();
    } catch (error) {
      throw new Error(`极限计算失败。当前表达式：${expr}。底层错误：${error.message || error}`);
    }
  }

  if (operation === "解方程") {
    const equation = parsed.kind === "equation" ? parsed.equation : `${expr}=0`;
    try {
      const solved = nerdamer.solveEquations(equation, variable);
      return Array.isArray(solved) ? JSON.stringify(solved, null, 2) : String(solved);
    } catch (error) {
      try {
        return nerdamer(`solve(${expr},${variable})`).text();
      } catch {
        throw new Error(`解方程失败。当前方程：${equation}。底层错误：${error.message || error}`);
      }
    }
  }

  if (operation === "变量代入") {
    const expression = expressionWithSubstitution(expr, request.substitutions);
    return nerdamer(expression).evaluate().text();
  }

  throw new Error(`该操作不适用于普通表达式：${operation}`);
}

function calculateMatrix(parsed, operation) {
  const matrix = parsed.matrix.map((row) => row.map((cell) => Number(nerdamer(cell).evaluate().text())));

  if (operation === "化简" || operation === "自动判断") {
    return JSON.stringify(parsed.matrix.map((row) => row.map((cell) => nerdText(cell))), null, 2);
  }

  if (operation === "矩阵行列式") {
    return String(math.det(matrix));
  }

  if (operation === "矩阵逆") {
    return JSON.stringify(math.inv(matrix), null, 2);
  }

  if (operation === "矩阵转置") {
    return JSON.stringify(math.transpose(matrix), null, 2);
  }

  if (operation === "数值计算") {
    return JSON.stringify(matrix, null, 2);
  }

  throw new Error(`该操作不适用于矩阵：${operation}`);
}

function calculate(request) {
  const parsed = parseLatex(request.latex);
  let operation = request.operation || "自动判断";
  if (operation === "自动判断") operation = inferOperation(parsed);

  let result;
  if (parsed.kind === "matrix") {
    result = calculateMatrix(parsed, operation);
  } else {
    result = calculateExpression(parsed, request, operation);
  }

  const parsedDetails = [
    `执行操作：${operation}`,
    "",
    `原始 LaTeX：`,
    parsed.original,
    "",
    `清洗后 LaTeX：`,
    parsed.cleaned,
    "",
    `识别类型：${parsed.kind}`,
    "",
    `计算表达式：`,
    parsed.kind === "matrix" ? JSON.stringify(parsed.matrix, null, 2) : parsed.expression,
    parsed.equation ? `\n方程表达式：\n${parsed.equation}` : "",
    "",
    `计算结果：`,
    result,
    "",
    "说明：本软件的识别器面向常见数学公式。自定义 LaTeX 宏、复杂分段函数、证明环境和排版环境可能需要先化简成标准数学公式。"
  ].filter(Boolean).join("\n");

  return {
    resultText: String(result),
    resultLatex: resultToLatex(result),
    details: parsedDetails
  };
}

module.exports = {
  calculate,
  EXAMPLES
};
