import z from "@deepseek-ai/schemastery";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { WebError } from "@deepseek-ai/dsh-web";

/**
 * Tavily search through its native REST API (`POST {baseURL}/search`). The key
 * travels both as the JSON `api_key` field (Tavily's documented form) and as a
 * Bearer header (accepted by the same edge). `include_answer` populates the
 * result's optional `content` so the web_search tool can surface a summary
 * answer alongside cited sources.
 *
 * No secret ever lives in this package: the API key is resolved per request
 * through the harness credential service (managed `$DSH_HOME/.credentials.yaml`
 * or the launching environment) under the reference `TAVILY_API_KEY`, or from
 * a literal `apiKey` in the `web-search-tavily` settings section.
 */

/** Stable id this provider registers under. */
const TAVILY_PROVIDER_ID = "tavily";
/** Default endpoint (REST root; `/search` is appended). */
const TAVILY_DEFAULT_BASE_URL = "https://api.tavily.com";
/** Default credential reference for the API key. */
const TAVILY_DEFAULT_API_KEY_ENV = "TAVILY_API_KEY";
/** Requested results when the tool layer sets no bound. */
const TAVILY_DEFAULT_MAX_RESULTS = 5;
/** Tavily's documented max_results ceiling. */
const TAVILY_MAX_RESULTS = 20;

/**
 * Map a Tavily search response to the seam's normalized result: one source per
 * `results[]` item (skipping URL-less entries) with title/snippet/publishedAt
 * carried through only when present, plus the generated answer as `content`.
 */
function mapTavilyResponse(response) {
  const sources = [];
  for (const item of response.results ?? []) {
    if (typeof item?.url !== "string" || item.url.length === 0) continue;
    sources.push({
      url: item.url,
      ...(typeof item.title === "string" && item.title.length > 0 ? { title: item.title } : {}),
      ...(typeof item.content === "string" && item.content.length > 0 ? { snippet: item.content } : {}),
      ...(typeof item.published_date === "string" && item.published_date.length > 0 ? { publishedAt: item.published_date } : {})
    });
  }
  return {
    ...(typeof response.answer === "string" && response.answer.length > 0 ? { content: response.answer } : {}),
    sources,
    truncated: false
  };
}

/** The Tavily-backed search provider. */
class TavilySearchProvider {
  resolveOptions;
  id = TAVILY_PROVIDER_ID;
  /**
   * @param resolveOptions - the options for the NEXT operation, snapshotted
   * once at each operation's entry so settings hot-reload applies from the
   * following search onward.
   */
  constructor(resolveOptions) {
    this.resolveOptions = resolveOptions;
  }
  available() {
    const options = this.resolveOptions();
    return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== void 0) && URL.canParse(options.baseURL);
  }
  async search(request, signal) {
    const options = this.resolveOptions();
    const apiKey = await this.apiKey(options);
    const endpoint = `${options.baseURL}/search`;
    const body = {
      api_key: apiKey,
      query: request.query,
      max_results: Math.min(Math.max(request.maxResults ?? TAVILY_DEFAULT_MAX_RESULTS, 1), TAVILY_MAX_RESULTS),
      search_depth: "basic",
      include_answer: true
    };
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(body),
        ...(signal !== void 0 ? { signal } : {})
      });
    } catch (error) {
      if (signal?.aborted === true || error?.name === "AbortError") {
        throw new WebError("Tavily search aborted", "WEB_ABORTED", { cause: error });
      }
      throw new WebError(`Tavily search request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
    }
    if (!response.ok) {
      let message = `Tavily API error (HTTP ${response.status})`;
      try {
        const parsed = await response.json();
        const detail = typeof parsed.detail === "string" ? parsed.detail : parsed.detail?.error ?? parsed.error ?? parsed.message;
        if (typeof detail === "string" && detail.length > 0) message = detail;
      } catch {
        /* keep the status-based message */
      }
      throw new WebError(message, "WEB_PROVIDER_ERROR");
    }
    try {
      return mapTavilyResponse(await response.json());
    } catch (error) {
      throw new WebError(`Tavily returned an unprocessable response body: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
    }
  }
  /**
   * Resolve one operation's credential without retaining it on the provider.
   */
  async apiKey(options) {
    if (options.apiKey !== void 0 && options.apiKey.length > 0) return options.apiKey;
    let resolved;
    try {
      resolved = await options.resolveApiKey?.() ?? Promise.resolve(void 0);
    } catch (error) {
      throw new WebError(`Tavily search credential resolution failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
    }
    if (resolved !== void 0 && resolved.length > 0) return resolved;
    throw new WebError(`Tavily search has no API key for "${options.apiKeyEnv ?? TAVILY_DEFAULT_API_KEY_ENV}"; store it through the credentials service (the web Models page writes it), export it in the launching environment, or set a literal "apiKey" in the web-search-tavily config`, "WEB_PROVIDER_CREDENTIAL_MISSING");
  }
}

/** Cordis plugin name used by loader diagnostics. */
const name = "web-search-tavily";
/** The web seam this provider registers into. */
const inject = ["web"];
const Config = z.object({
  apiKey: z.string().role("secret"),
  apiKeyEnv: z.string().role("credential-ref").default(TAVILY_DEFAULT_API_KEY_ENV),
  baseURL: z.string()
});
/** Settings namespace carrying this provider's endpoint and key reference. */
const WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE = settingsNamespace(name);

/**
 * Project one resolved section into the options the provider serves its next
 * search with.
 */
function resolveOptions(ctx, config) {
  const apiKeyEnv = credentialRef(config.apiKeyEnv ?? TAVILY_DEFAULT_API_KEY_ENV);
  const literalApiKey = typeof config.apiKey === "string" && config.apiKey.length > 0 ? config.apiKey : void 0;
  return {
    ...(literalApiKey === void 0 ? {} : { apiKey: literalApiKey }),
    resolveApiKey: async () => {
      const credentials = ctx.get("credentials");
      if (credentials !== void 0) return (await credentials.resolve(apiKeyEnv))?.value;
      const ambient = launchEnvironmentOf(ctx).get(apiKeyEnv);
      return ambient !== void 0 && ambient.value.length > 0 ? ambient.value : void 0;
    },
    apiKeyEnv,
    baseURL: config.baseURL ?? TAVILY_DEFAULT_BASE_URL
  };
}

/** Register the Tavily search provider with ctx.web. */
function apply(ctx, config) {
  let current = () => config;
  installSettingsSection(ctx, WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, Config, config, {
    setSource: (source) => {
      current = source;
    },
    onChange: () => {}
  });
  ctx.web.registerSearchProvider(new TavilySearchProvider(() => resolveOptions(ctx, current())));
}

export { Config, TAVILY_DEFAULT_API_KEY_ENV, TAVILY_DEFAULT_BASE_URL, TAVILY_DEFAULT_MAX_RESULTS, TAVILY_MAX_RESULTS, TAVILY_PROVIDER_ID, TavilySearchProvider, WEB_SEARCH_TAVILY_SETTINGS_NAMESPACE, apply, inject, name };
