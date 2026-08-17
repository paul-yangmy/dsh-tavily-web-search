# dsh-tavily-web-search

<p align="center">
  <a href="README.md">简体中文</a> | <strong>English</strong>
</p>

Make DSH's `web_search` return richer results through [Tavily](https://tavily.com): not just a list of links, but a generated answer and structured citations.

## Install

Install the plugin from GitHub into DSH's `web` profile:

```sh
dsh plugin --profile web add github:paul-yangmy/dsh-tavily-web-search
# If dsh web is running, restart it and refresh the page.
```

Run `dsh --profile web --dump-config` to confirm that the plugin is present in the final configuration. For local development, clone the repository and run `dsh plugin --profile web add .` from its root. The source is plain JavaScript, so no build step is required.

## Use it

1. Create an API key in the [Tavily](https://tavily.com) dashboard.
2. Store the key in the DSH credentials service:

```yaml
# $DSH_HOME/.credentials.yaml
TAVILY_API_KEY: tvly-<your-key>
```

3. Ask the model to search the web in DSH. Once the plugin is loaded, it automatically sets the `web_search` search provider to `tavily`. Results include an answer as `content`, plus cited sources with `title` / `snippet` / `publishedAt`.

Optional settings (defaults usually need no changes):

```yaml
# settings.yaml
web-search-tavily:
  baseURL: https://api.tavily.com
  apiKeyEnv: TAVILY_API_KEY
```

If your DSH profile is not `web`, replace `web` with your profile name in the install and `--dump-config` commands.

## Security

The API key is never bundled into the plugin or written into code. It is resolved on every search from, in order: a literal `apiKey` (not recommended), the credentials service, or the launching environment. Using the DSH credentials service is recommended; the key hot-reloads without a restart.

## Limitations

- Tavily `search_depth: "basic"` is used and the advanced depth option is not exposed yet.
- `max_results` is bounded by the tool layer and capped at 20 (the Tavily documented limit).
- Actual availability depends on the Tavily service and network.
- If multiple search provider plugins are installed, the last installed layer wins. To switch back to another provider, override `web.searchProvider` in your profile's `cordis.patch.yml`.

## License

MIT
