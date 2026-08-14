# dsh-tavily-web-search

[Tavily](https://tavily.com) 搜索提供者插件（组合包 / bundle），为 [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/)（dsh）注册 `ctx.web` 搜索能力，走 Tavily 原生 REST API（`POST https://api.tavily.com/search`）。

- 按 [官方插件开发文档](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish) 打包为组合包：`dsh.bundle` manifest + `cordis.patch.yml` 层。
- 注册提供者 id `tavily`，并把 `web` 能力行的 `searchProvider` 钉扎为 `tavily`（可在 profile 的 `cordis.patch.yml` 中覆盖）。
- 摘要答案：请求带 `include_answer`，结果映射为 web_search 工具的 answer 内容，同时返回带 title/snippet/publishedAt 的引用源列表。
- 结果上限：`max_results` 按工具层 `maxResults` 收紧，硬上限 20（Tavily 文档上限）。

## 安装

前提：已安装 `dsh` CLI 与 [pnpm](https://pnpm.io)。

```sh
# 从 GitHub 安装（源码为纯 JS，无需构建授权）
dsh plugin --profile <name> add github:paul-yangmy/dsh-tavily-web-search

# 或本地开发链接
dsh plugin --profile <name> add /path/to/dsh-tavily-web-search

# 或 tarball / npm（若已发布）
dsh plugin --profile <name> add ./dsh-tavily-web-search-0.1.0.tgz
dsh plugin --profile <name> add dsh-tavily-web-search
```

> 安全建议：从 git 安装时锁定 commit（`github:paul-yangmy/dsh-tavily-web-search#<sha>`），避免后续推送改变实际运行的代码。

## 配置

**API 密钥不放在包内**，按以下优先级在每次搜索时解析（见 `lib/index.js`）：

1. settings 中 `web-search-tavily.apiKey` 字面量（不推荐，settings 非密钥库）；
2. 凭据引用 `web-search-tavily.apiKeyEnv`（默认 `TAVILY_API_KEY`）→ 凭据服务 `$DSH_HOME/.credentials.yaml` → 启动环境变量。

```sh
# 推荐：把密钥写入 dsh 凭据库（hot-reload，无需重启）
# $DSH_HOME/.credentials.yaml
TAVILY_API_KEY: tvly-<your-key>
```

settings.yaml（可选，默认值即如此）：

```yaml
web-search-tavily:
  baseURL: https://api.tavily.com
```

安装后 web_search 工具即刻生效；若同时安装了其他搜索提供者插件，最后安装的层按行胜出。

## 依赖

peerDependencies 全部由 profile 内置的 `@deepseek-ai/dsh-base` 提供（`dsh-web`、`dsh-credentials`、`dsh-settings`、`dsh-launch-environment`、`cordis`）；运行时唯一第三方依赖为 `@deepseek-ai/schemastery`。

## 冒烟测试

```sh
# 仅验证模块可加载与导出结构（不联网、不需要密钥）
node test/smoke.mjs
```

## License

MIT
