# dsh-tavily-web-search

<p align="center">
  <strong>简体中文</strong> | <a href="README.en.md">English</a>
</p>

让 DSH 的 `web_search` 通过 [Tavily](https://tavily.com) 返回更完整的搜索结果：除了链接列表，还有 Tavily 生成的摘要答案和结构化引用来源。

## 安装

推荐直接安装到 DSH 的 `web` profile：

```sh
dsh plugin --profile web add github:paul-yangmy/dsh-tavily-web-search
# 如果 dsh web 正在运行，重启后刷新页面
```

运行 `dsh --profile web --dump-config` 确认插件已经进入最终配置。需要本地开发时，克隆仓库后在仓库目录运行 `dsh plugin --profile web add .`；源码为纯 JS，不需要额外构建。

## 怎么用

1. 在 [Tavily](https://tavily.com) 控制台创建 API Key。
2. 把 API Key 写入 DSH 凭据服务：

```yaml
# $DSH_HOME/.credentials.yaml
TAVILY_API_KEY: tvly-<your-key>
```

3. 在 DSH 中让模型搜索网页。插件加载后会自动把 `web_search` 的搜索提供者设为 `tavily`，返回结果包含摘要 `content`，以及带 `title` / `snippet` / `publishedAt` 的引用源。

可选配置（默认值一般不用改）：

```yaml
# settings.yaml
web-search-tavily:
  baseURL: https://api.tavily.com
  apiKeyEnv: TAVILY_API_KEY
```

如果你的 DSH profile 不是 `web`，把安装和 `--dump-config` 命令里的 `web` 换成你的 profile 名。

## 安全

API Key 不会打进插件包，也不会写入代码。每次搜索按 `apiKey` 字面量（不推荐）→ 凭据服务 → 启动环境变量的顺序解析。推荐使用 DSH 凭据服务，密钥支持热更新，无需重启。

## 限制

- 目前固定使用 Tavily `search_depth: "basic"`，不暴露 advanced 深度选项。
- `max_results` 受工具层约束，并硬上限为 20（Tavily 文档上限）。
- 实际可用性取决于 Tavily 服务与网络。
- 若同时安装多个搜索提供者插件，最后安装的插件层按行胜出；需要换回其他提供者时，在 profile 的 `cordis.patch.yml` 覆盖 `web.searchProvider`。

## License

MIT
