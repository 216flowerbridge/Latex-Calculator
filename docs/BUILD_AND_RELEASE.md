# 打包和发布说明

## 目标

把源码变成用户能下载、安装、运行的软件。

最终用户拿到的是：

```text
LaTeX Math Studio Setup 1.0.0.exe
```

而不是源码，也不是 Python 脚本，也不是需要命令行运行的项目。

## Windows 打包命令

```bash
npm install
npm run dist:win
```

输出目录：

```text
dist/
```

常见输出：

```text
LaTeX Math Studio Setup 1.0.0.exe
LaTeX Math Studio 1.0.0.exe
win-unpacked/
```

其中：

- `Setup ... .exe` 是安装包。
- 不带 `Setup` 的 `.exe` 是免安装便携版。
- `win-unpacked` 是解包后的程序目录，不建议直接发给普通用户。

## GitHub Actions 自动打包

仓库已经配置：

```text
.github/workflows/build.yml
```

每次推送代码，或者手动运行 workflow，都会生成三个平台的安装包。

下载路径：

```text
GitHub 仓库 -> Actions -> 选择一次成功的运行 -> Artifacts
```

## 代码签名说明

未签名的 Windows 安装包可能被 SmartScreen 提示“未知发布者”。这是正常现象，不代表程序有病毒。

如果要像商业软件一样减少拦截，需要购买代码签名证书，并在 electron-builder 中配置签名参数。

## 后续增强建议

1. 加入自动更新。
2. 加入公式历史记录。
3. 加入多标签计算。
4. 增加更完整的 LaTeX AST 解析。
5. 引入 WebAssembly CAS 或远程 CAS 服务以提高复杂符号计算能力。
