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
	WARN/ERROR 日志自动送至已配置的 AI 提供商，支持流式输出、在本地端点不可达时的回退策略，并自动跳转到出错文件/行。

- **保存/Ctrl+S 部署**
	每次保存（或 Ctrl+S/Cmd+S）自动部署项目。

- **内置调试**  
	输出通道具备 Java 专属语法着色与结构化错误提示。

- **浏览器自动化**  
	多浏览器自动打开/刷新。

- **本地化 UI（中英双语）**  
	命令、状态栏文案和提示已本地化，新增语言切换并在首次运行时自动跟随 VS Code 语言。

- **实例管理 UI 和设置窗口**  
	在一个地方管理所有 Tomcat 实例：启动、停止、终止、刷新、在浏览器中打开，并从统一视图配置 Tomcat/Java 路径和 HTTP 端口。


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

### ![](resources/tomcat-icon-dark.png) 实例视图

实例视图实时展示所有运行中和已保存的 Tomcat 实例。你可以在此统一启动、停止、终止服务器，管理 Tomcat/Java 路径和 HTTP 端口，并一键在浏览器中打开已部署应用。每个实例显示 PID、端口、版本和工作区，并支持快捷配置和浏览器操作。

![](resources/tomcat-view-showcase.png)

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
| `Tomcat: 启动`        | 启动 Tomcat 服务器                                  |
| `Tomcat: 停止`         | 停止正在运行的服务器                                |
| `Tomcat: 清理`        | 清理 Tomcat `webapps`、`temp`、`work` 目录          |
| `Tomcat: 部署`       | 部署当前 Java EE 项目                               |
| `Tomcat: 刷新实例列表` | 刷新所有运行和已保存 Tomcat 实例的列表 |
| `Tomcat: 终止实例`     | 强制终止选中的 Tomcat 实例            |
| `Tomcat: 在浏览器中打开`   | 在浏览器中打开实例已部署的应用         |
| `Tomcat: 新建实例`      | 启动一个新的 Tomcat 实例               |
| `Tomcat: 配置字段`   | 编辑实例的 Tomcat Home、Java Home、端口或浏览器 |
| `Tomcat: 添加 Tomcat 路径`   | 添加新的 Tomcat 安装路径               |
| `Tomcat: 移除 Tomcat 路径`| 移除已保存的 Tomcat 安装路径           |
| `Tomcat: 刷新版本`  | 刷新可用的 Tomcat 版本                 |
| `Tomcat: 设为当前 Tomcat`   | 设为当前激活的 Tomcat Home             |
| `Tomcat: 添加 Java 路径`     | 添加新的 Java 安装路径                 |
| `Tomcat: 移除 Java 路径`  | 移除已保存的 Java 安装路径             |
| `Tomcat: 设为当前 Java`     | 设为当前激活的 Java Home               |
| `Tomcat: 设置 HTTP 端口`     | 更改实例的 HTTP 端口                   |
| `Tomcat: 添加 HTTP 端口`     | 向快捷选择列表添加新的 HTTP 端口        |
| `Tomcat: 移除 HTTP 端口`  | 移除已保存的 HTTP 端口                 |
| `Tomcat: 设置构建类型`    | 更改实例的构建策略                     |
| `Tomcat: 设置日志级别`     | 更改实例的日志级别                     |

## 配置

在 <kbd>Ctrl+,</kbd> 中搜索 “Tomcat” 即可配置：

| **设置项**                    | **默认值**        | **说明**                                                                                |
|------------------------------|-------------------|------------------------------------------------------------------------------------------|
| `tomcat.language`            | `auto`            | 扩展界面语言（`auto`、`en`、`zh-CN`），首次运行 `auto` 将跟随 VS Code 显示语言。            |
| `tomcat.buildType`           | `Local`           | 默认部署策略（`Local`、`Maven`、`Gradle`）                                                |
| `tomcat.autoDeployMode`      | `Disable`         | 自动部署触发方式（`Disable`、`On Save`、`On Shortcut`）                                   |
| `tomcat.browser`             | `Google Chrome`   | 浏览器自动打开/调试（`Disable`、`Google Chrome`、`Microsoft Edge`、`Firefox`、`Safari`、`Brave`、`Opera`） |
| `tomcat.port`                | `8080`            | Tomcat 监听端口（有效范围：`1024`-`49151`）                                               |
| `tomcat.ports`               | `[]`              | 常用 HTTP 端口列表，便于快速选择（数字数组，按工作区保存）                                 |
| `tomcat.homes`               | `[]`              | 多版本 Tomcat 安装路径列表，用于管理多个 Tomcat 版本                                      |
| `tomcat.javaHomes`           | `[]`              | 已配置的 Java Home 列表（字符串数组）；`tomcat.javaHome` 为当前激活项                        |
| `tomcat.base`                | ``                | CATALINA_BASE 路径（conf/webapps/logs）；未设置时默认使用 `tomcat.home`                     |
| `tomcat.protectedWebApps`    | `['ROOT', 'docs', 'examples', 'manager', 'host-manager']` | 清理时保留的应用列表 |
| `tomcat.logLevel`            | `INFO`            | 最低日志级别（`DEBUG`、`INFO`、`SUCCESS`、`HTTP`、`APP`、`WARN`、`ERROR`）                 |
| `tomcat.showTimestamp`       | `true`            | 是否在日志中显示时间戳                                                                   |
| `tomcat.autoReloadBrowser`   | `true`            | 部署后自动刷新浏览器；如遇问题可关闭                                                     |
| `tomcat.logEncoding`         | `utf8`            | 日志编码（`utf8`、`ascii`、`utf-8`、`utf16le`、`utf-16le`、`ucs2`、`ucs-2`、`base64`、`base64url`、`latin1`、`binary`、`hex`） |
| `tomcat.ai.provider`         | `none`           | AI 提供商（`none`、`local`、`aliyun-dashscope`、`baichuan`、`zhipu`、`deepseek`、`custom`） |
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


## 4.0.0 更新内容

### 新增
实例管理 UI 与设置窗口：在一个视图中统一管理所有 Tomcat 实例，支持启动、停止、终止、刷新服务器，一键打开应用，配置 Tomcat/Java Home 和端口。全新设置窗口让多实例管理与配置更高效直观。
- 将 Tomcat 实例元数据持久化至工作区（`.tomcat/instances.json`），在 VS Code 重启后恢复运行/已管理实例信息。
- 新的实例管理 UI：运行实例树视图（按 PID 管理启动/停止/终止），支持保存 Tomcat Home、Java Home 和常用 HTTP 端口（添加/删除）。
- 增加用于实例生命周期与配置的命令与 TreeView 操作（新建实例、刷新、添加/删除 home/port、设为活动、设置浏览器、设置日志级别）。

### 变更
- 在扩展停用时不再强制关闭非托管的 Tomcat 进程；新增托管实例跟踪与持久化。
- 部署策略改进：优先复用合适的运行实例（同应用复用 → 空闲实例 → 新建实例）。
- 浏览器支持增强：可用性检测、回退到上一次可用浏览器、以及更稳健的启动/超时处理。
- 大规模本地化改造：所有用户可见文案迁移至运行时 i18n，提供中英文翻译。

### 修复
- 修复 i18n 扫描过程中引入的若干 JSON/TypeScript 问题。
- 优化端口分配与更新行为，避免不必要的重启并增强端口占用检测。

[查看完整更新日志](https://github.com/Al-rimi/tomcat/blob/main/CHANGELOG.md)

## 路线图与未来工作

- 为每个实例提供独立日志面板与过滤视图，提升排查效率。
- 支持远程/SSH 的 Tomcat 实例管理与跨工作区的实例持久化同步。
- 改进实例树视图：分组、筛选与内联操作增强。
- 加强 AI 能力：多提供商编排、更丰富的建议与可定制的解释模板。

如需将某项规划提前到 v4.x，请告诉我优先级，我可为其准备 PR 或问题清单。

---

**许可证**： [MIT](LICENSE) • 💖 **支持**：给我们的 [GitHub 仓库](https://github.com/Al-rimi/tomcat) 加星 • [VS Code 市场](https://marketplace.visualstudio.com/items?itemName=Al-rimi.tomcat)
