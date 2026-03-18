# Tomcat AI 部署助手（VS Code） [![版本](https://img.shields.io/visual-studio-marketplace/v/Al-rimi.tomcat?label=%E7%89%88%E6%9C%AC)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![下载量](https://img.shields.io/visual-studio-marketplace/d/Al-rimi.tomcat?label=%E4%B8%8B%E8%BD%BD)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![评分](https://img.shields.io/visual-studio-marketplace/stars/Al-rimi.tomcat?label=%E8%AF%84%E5%88%86)](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat) [![构建状态](https://img.shields.io/github/actions/workflow/status/Al-rimi/tomcat/ci.yml?label=%E6%9E%84%E5%BB%BA)](https://github.com/Al-rimi/tomcat/actions)

[English](README.md)

面向 VS Code 的 AI 驱动 Tomcat 管理：流式日志解释、一键部署、浏览器自动刷新。

![](resources/tomcat-video-showcase.gif)

## 功能特性

- **全量服务器日志监控**  
	实时查看全部 Tomcat 日志，带语法高亮。

- **多种构建策略**  
	提供 Local、Maven、Gradle 三种部署方式。

- **AI 解释（流式）**  
	WARN/ERROR 日志自动送至已配置的 AI 提供商，流式“打字”输出并自动跳转到出错文件/行。

- **保存/Ctrl+S 部署**
	每次保存（或 Ctrl+S/Cmd+S）自动部署项目。

- **内置调试**  
	输出通道具备 Java 专属语法着色与结构化错误提示。

- **浏览器自动化**  
	多浏览器自动打开/刷新。

## 安装

1. 打开 VS Code  
2. 进入扩展视图（`Ctrl+Shift+X`）  
3. 搜索 `Al-rimi.tomcat`  
4. 点击 <kbd>Install</kbd>

命令行：
```bash
code --install-extension Al-rimi.tomcat
```

## 使用

> 仅当当前项目被识别为 Java EE 项目时，才会显示“编辑器按钮”和“状态栏”入口（遵循 VS Code 编辑器操作与状态栏规范）。

<details>
<summary>何时被判定为 Java EE 项目？点击展开</summary>

```typescript
public static isJavaEEProject(): boolean {
		const workspaceFolders = vscode.workspace.workspaceFolders;

		if (!workspaceFolders) {
				return false;
		}

		const rootPath = workspaceFolders[0].uri.fsPath;
		const webInfPath = path.join(rootPath, 'src', 'main', 'webapp', 'WEB-INF');

		if (fs.existsSync(webInfPath)) {
				return true;
		}

		if (fs.existsSync(path.join(webInfPath, 'web.xml'))) {
				return true;
		}

		const pomPath = path.join(rootPath, 'pom.xml');

		if (
				fs.existsSync(pomPath) &&
				fs.readFileSync(pomPath, 'utf-8').includes('<packaging>war</packaging>')
		) {
				return true;
		}

		const gradlePath = path.join(rootPath, 'build.gradle');

		if (
				fs.existsSync(gradlePath) &&
				fs.readFileSync(gradlePath, 'utf-8').match(/(tomcat|jakarta|javax\.ee)/i)
		) {
				return true;
		}

		const targetPath = path.join(rootPath, 'target');

		if (
				fs.existsSync(targetPath) &&
				fs.readdirSync(targetPath).some(file => file.endsWith('.war') || file.endsWith('.ear'))
		) {
				return true;
		}

		return false;
}
```

[方法位置](src/services/Builder.ts#L121-L159)。如有误报/漏报或更好的检测思路，欢迎贡献：

[![提交问题](https://img.shields.io/badge/-提交问题-red?style=flat-square&logo=github)](https://github.com/Al-rimi/tomcat/issues/new?title=Improve+Java+EE+Project+Detection+Logic)

---

</details>

### ![](resources/tomcat-icon-dark.png) 编辑器按钮

点击编辑器标题栏中的 Tomcat 图标即可部署项目。

![](resources/tomcat-editor-showcase.png)

### ![](resources/server.png) 状态栏

点击底部状态栏的 Tomcat 状态切换自动部署模式。

![](resources/tomcat-status-showcase.png)

### 命令面板

在命令面板（`Ctrl+Shift+P`）快速访问核心命令：

| 命令                    | 描述                                               |
|------------------------|----------------------------------------------------|
| `Tomcat: Start`        | 启动 Tomcat 服务器                                  |
| `Tomcat: Stop`         | 停止正在运行的服务器                                |
| `Tomcat: Clean`        | 清理 Tomcat `webapps`、`temp`、`work` 目录          |
| `Tomcat: Deploy`       | 部署当前 Java EE 项目                               |

## 配置

在 <kbd>Ctrl+,</kbd> 中搜索 “Tomcat” 即可配置：

| **设置项**                    | **默认值**        | **说明**                                                                                |
|------------------------------|-------------------|------------------------------------------------------------------------------------------|
| `tomcat.autoDeployBuildType` | `Local`           | 默认部署策略（`Local`、`Maven`、`Gradle`）                                                |
| `tomcat.autoDeployMode`      | `Disable`         | 自动部署触发方式（`Disable`、`On Save`、`On Shortcut`）                                   |
| `tomcat.browser`             | `Google Chrome`   | 浏览器自动打开/调试（`Disable`、`Google Chrome`、`Microsoft Edge`、`Firefox`、`Safari`、`Brave`、`Opera`） |
| `tomcat.port`                | `8080`            | Tomcat 监听端口（有效范围：`1024`-`65535`）                                               |
| `tomcat.base`                | ``                | CATALINA_BASE 路径（conf/webapps/logs）；未设置时默认使用 `tomcat.home`                     |
| `tomcat.protectedWebApps`    | `['ROOT', 'docs', 'examples', 'manager', 'host-manager']` | 清理时保留的应用列表 |
| `tomcat.logLevel`            | `INFO`            | 最低日志级别（`DEBUG`、`INFO`、`SUCCESS`、`HTTP`、`APP`、`WARN`、`ERROR`）                 |
| `tomcat.showTimestamp`       | `true`            | 是否在日志中显示时间戳                                                                   |
| `tomcat.autoReloadBrowser`   | `true`            | 部署后自动刷新浏览器；如遇问题可关闭                                                     |
| `tomcat.logEncoding`         | `utf8`            | 日志编码（`utf8`、`ascii`、`utf-8`、`utf16le`、`utf-16le`、`ucs2`、`ucs-2`、`base64`、`base64url`、`latin1`、`binary`、`hex`） |
| `tomcat.ai.provider`         | `local`           | AI 提供商（`none`、`local`、`aliyun-dashscope`、`baichuan`、`zhipu`、`deepseek`、`custom`） |
| `tomcat.ai.endpoint`         | `http://127.0.0.1:11434/api/chat` | AI 聊天/补全接口地址 |
| `tomcat.ai.model`            | `qwen2.5:7b`      | 发送给 AI 的模型标识                                                                      |
| `tomcat.ai.apiKey`           | ``                | 托管提供商的可选 Bearer Token                                                             |
| `tomcat.ai.localStartCommand`| `ollama serve`    | 当本地端点不可达时，用于启动本地 AI 服务的命令                                            |

> `tomcat.home` 和 `tomcat.javaHome` 已自动检测并从设置中隐藏。  
> WARN/ERROR 日志自动触发 AI 解释；仅当端点是 localhost 且不可达时才自动尝试启动本地 AI。

## 环境要求

- **运行时**：
	- JDK 11+
	- Apache Tomcat 9+
  
- **构建工具**（可选）：
	- `Maven` 3.6+ *或* `Gradle` 6.8+（当选择对应构建类型时）

## 开发者文档

技术实现与贡献指南：
- [系统架构](https://github.com/Al-rimi/tomcat/tree/main/docs/ARCHITECTURE.md)
- [开发指南](https://github.com/Al-rimi/tomcat/tree/main/docs/DEVELOPMENT.md)
- [测试策略](https://github.com/Al-rimi/tomcat/tree/main/docs/TESTING.md)

## 已知问题

- **浏览器自动刷新兼容性**  
	<details>
	<summary>部分浏览器可能不支持自动刷新（点击展开）</summary>

	扩展使用 Chrome Debug Protocol（CDP）在部署后刷新页面，当前支持：
	- Google Chrome
	- Microsoft Edge
	- Brave
	- Opera

	**不支持**：
	- Firefox
	- Safari
  
	以上浏览器缺少 CDP，无法自动刷新。
	</details>

- **调试模式启动失败**  
	<details>
	<summary>在某些系统配置下浏览器调试模式可能启动失败（点击展开）</summary>

	扩展使用的命令模板：
	```bash
	start chrome.exe --remote-debugging-port=9222 http://localhost:8080/app-name
	```
	**常见解决方案**：
	1. 确认浏览器可执行文件已在 PATH 中
	2. 确认端口 9222 未被占用
	3. 升级浏览器到最新版本

	如问题仍在，可关闭设置 `tomcat.autoReloadBrowser`。
	</details>

[![反馈问题](https://img.shields.io/badge/-反馈问题-red?style=flat-square&logo=github)](https://github.com/Al-rimi/tomcat/issues/new)  
[![提交修复](https://img.shields.io/badge/-提交修复-green?style=flat-square&logo=github)](https://github.com/Al-rimi/tomcat/pulls)


## 3.0.1 更新内容

### 新增
- WARN/ERROR 日志的流式 AI 解释，Tomcat 输出通道与状态栏实时显示输入效果。
- 自动跳转构建错误文件/行，保存及构建成功时自动清理诊断。
- 新增 `tomcat.base`（CATALINA_BASE）设置和运行时支持，可让 base 与 home 分离。

### 变更
- 精简 AI 设置面板（provider、endpoint、model、API key、start command），强制开启自动解释，仅在 localhost 端点时自动启动本地 AI。
- 状态栏在响应流式输出时显示 “AI typing”。
- 依赖更新（mocha 11.7.5，并锁定传递依赖 `diff` 8.0.3、`serialize-javascript` 7.0.4）以适配最新模型与工具链。

### 修复
- 通过强制安全的传递依赖（`diff`、`serialize-javascript`）并重新生成 lockfile 解决高危审计问题。
- 修复 Maven/Gradle 错误的 Windows 路径解析，消除残留错误标记并确保跳转定位可靠。

[查看完整更新日志](https://github.com/Al-rimi/tomcat/blob/main/CHANGELOG.md)

---

**许可证**： [MIT](LICENSE) • 💖 **支持**：给我们的 [GitHub 仓库](https://github.com/Al-rimi/tomcat) 加星 • [VS Code 市场](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat)
