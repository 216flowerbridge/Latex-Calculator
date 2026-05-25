const katex = require("katex");
const { calculate, EXAMPLES } = require("../../engine/calculator");

const $ = (id) => document.getElementById(id);

const elements = {
  latexInput: $("latexInput"),
  preview: $("preview"),
  exampleSelect: $("exampleSelect"),
  operationSelect: $("operationSelect"),
  variableInput: $("variableInput"),
  orderInput: $("orderInput"),
  lowerInput: $("lowerInput"),
  upperInput: $("upperInput"),
  approachInput: $("approachInput"),
  directionSelect: $("directionSelect"),
  subsInput: $("subsInput"),
  resultOutput: $("resultOutput"),
  latexOutput: $("latexOutput"),
  parsedOutput: $("parsedOutput"),
  errorOutput: $("errorOutput")
};

function initializeExamples() {
  for (const item of EXAMPLES) {
    const option = document.createElement("option");
    option.textContent = item.name;
    option.value = item.latex;
    elements.exampleSelect.appendChild(option);
  }
  elements.exampleSelect.selectedIndex = 0;
  elements.latexInput.value = EXAMPLES[0].latex;
  renderPreview();
}

function renderPreview() {
  const source = elements.latexInput.value.trim();
  if (!source) {
    elements.preview.textContent = "请输入 LaTeX 公式。";
    return;
  }

  try {
    katex.render(source, elements.preview, {
      throwOnError: false,
      displayMode: true,
      strict: false
    });
  } catch (error) {
    elements.preview.textContent = source;
  }
}

function getRequest() {
  return {
    latex: elements.latexInput.value,
    operation: elements.operationSelect.value,
    variable: elements.variableInput.value.trim() || "x",
    order: Number(elements.orderInput.value || 1),
    lower: elements.lowerInput.value.trim(),
    upper: elements.upperInput.value.trim(),
    approach: elements.approachInput.value.trim() || "0",
    direction: elements.directionSelect.value,
    substitutions: elements.subsInput.value.trim()
  };
}

function runCalculation() {
  elements.errorOutput.textContent = "";
  try {
    const response = calculate(getRequest());
    elements.resultOutput.textContent = response.resultText;
    elements.latexOutput.textContent = response.resultLatex;
    elements.parsedOutput.textContent = response.details;
    showTab("result");
  } catch (error) {
    elements.resultOutput.textContent = "";
    elements.latexOutput.textContent = "";
    elements.parsedOutput.textContent = "";
    elements.errorOutput.textContent = error && error.stack ? error.stack : String(error);
    showTab("error");
  }
}

function showTab(name) {
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name);
  });

  document.querySelectorAll(".tab-page").forEach((page) => {
    page.classList.remove("active");
  });

  $(`${name}Tab`).classList.add("active");
}

function copyText(text) {
  navigator.clipboard.writeText(text || "");
}

document.addEventListener("DOMContentLoaded", () => {
  initializeExamples();

  elements.exampleSelect.addEventListener("change", () => {
    elements.latexInput.value = elements.exampleSelect.value;
    renderPreview();
  });

  elements.latexInput.addEventListener("input", renderPreview);
  $("calculateBtn").addEventListener("click", runCalculation);

  $("clearBtn").addEventListener("click", () => {
    elements.latexInput.value = "";
    elements.resultOutput.textContent = "";
    elements.latexOutput.textContent = "";
    elements.parsedOutput.textContent = "";
    elements.errorOutput.textContent = "";
    renderPreview();
  });

  $("matrixBtn").addEventListener("click", () => {
    elements.latexInput.value = String.raw`\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}`;
    renderPreview();
  });

  $("copyInputBtn").addEventListener("click", () => copyText(elements.latexInput.value));
  $("copyResultBtn").addEventListener("click", () => copyText(elements.resultOutput.textContent));

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => showTab(button.dataset.tab));
  });
});
