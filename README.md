# LaTeX Math Studio

这是一个真正的桌面软件项目，目标是打包成类似 QQ 那样的安装包：

- Windows：`LaTeX Math Studio Setup x.x.x.exe`
- Windows 免安装版：`LaTeX Math Studio x.x.x.exe`
- macOS：`.dmg`
- Linux：`.AppImage` / `.deb`

最终用户只需要下载安装包并双击运行，不需要安装 Python、Node.js、虚拟环境或任何开发工具。

## 软件功能

- 输入 LaTeX 数学公式。
- 本地渲染公式预览。
- 将 LaTeX 转成可计算表达式。
- 支持：
  - 化简
  - 数值计算
  - 求导
  - 不定积分
  - 定积分
  - 极限
  - 解方程
  - 变量代入
  - 矩阵行列式
  - 矩阵逆
  - 矩阵转置

## 技术方案

本项目使用 Electron 做桌面软件壳，使用本地 JavaScript 计算引擎：

- Electron：桌面窗口、菜单、安装包。
- KaTeX：本地公式预览。
- Nerdamer：符号计算，包含化简、求导、积分、解方程等。
- Math.js：矩阵数值计算。
- 自定义 LaTeX 识别器：处理 `\frac`、`\sqrt`、三角函数、指数、方程、矩阵等常见结构。

## 最终用户如何安装

最终用户不需要看源码。你打包后，只发给用户：

```text
LaTeX Math Studio Setup 1.0.0.exe
```

用户双击安装即可。

## 你作为开发者如何生成安装包

你有两种方式。

### 方式 A：在自己 Windows 电脑上打包

这一步只给开发者用。最终用户不需要安装这些东西。

1. 安装 Node.js LTS。
2. 解压本项目。
3. 在项目目录运行：

```bash
npm install
npm run dist:win
```

生成文件在：

```text
dist/
```

你要发给普通用户的是：

```text
dist/LaTeX Math Studio Setup 1.0.0.exe
```

也可以发免安装版：

```text
dist/LaTeX Math Studio 1.0.0.exe
```

### 方式 B：不用自己电脑打包，用 GitHub 自动生成安装包

本项目已经包含：

```text
.github/workflows/build.yml
```

操作：

1. 在 GitHub 新建一个仓库。
2. 把本项目所有文件上传进去。
3. 打开仓库的 Actions 页面。
4. 运行 `Build desktop installers`。
5. 等运行完成后，在 Artifacts 下载：
   - `windows-installer`
   - `macos-installer`
   - `linux-installer`

Windows 用户下载 `windows-installer` 里面的 `.exe` 文件即可。

## 本地开发运行

开发者调试时可以运行：

```bash
npm install
npm start
```

注意：这是开发调试方式，不是给最终用户使用的方式。

## 当前识别范围

支持常见写法：

```latex
\frac{x^2 - 1}{x - 1}
```

```latex
x^3 + \sin{x}
```

```latex
\sqrt{2} + \pi
```

```latex
x^2 - 4 = 0
```

```latex
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}
```

不重点支持：

- 自定义宏
- 复杂分段函数
- 证明环境
- 物理单位系统
- 论文模板里的复杂排版命令
- 任意 LaTeX 宏包语法

如果需要进一步增强识别率，可以把 `app/engine/latexParser.js` 替换成更完整的 LaTeX AST 解析器，或接入 CAS 后端。
