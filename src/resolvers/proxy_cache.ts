import { Resolver } from "../resolver";

const cache = await caches.open("proxy-cache");
const HOP_BY_HOP = [
  "Keep-Alive",
  "Transfer-Encoding",
  "TE",
  "Connection",
  "Trailer",
  "Upgrade",
  "Proxy-Authorization",
  "Proxy-Authenticate",
];
const toModuleResponse = async (resp: Response) => {
  const headers: Record<string, string> = {};
  resp.headers.forEach((key, value) => {
    headers[key] = value;
  });
  return {
    content: await resp.text(),
    headers,
  };
};
export const NPM = new Resolver({
  pathname: /^\/proxy-cache/,

  parseUrl(url) {
    return {
      name: url.toString(),
      version: null,
      filePath: "",
    };
  },

  async fetchVersions() {
    return [];
  },

  async resolveModule(_registry, _data, _options, req) {
    const requestHeaders = new Headers(req.headers);

    const url = new URL(req.url);
    const toUrl = new URL(
      url.pathname.substring(1) + url.search,
    );
    HOP_BY_HOP.forEach((h) => requestHeaders.delete(h));
    requestHeaders.set("origin", toUrl.origin);
    requestHeaders.set("host", toUrl.host);
    requestHeaders.set("x-forwarded-host", url.host);
    const newRequest = new Request(
      toUrl,
      {
        headers: requestHeaders,
        redirect: "follow",
      },
    );

    const cacheResp = await cache.match(req);
    if (cacheResp) {
      return toModuleResponse(cacheResp);
    }

    return fetch(newRequest).then((resp) => {
      cache.put(req, resp.clone());
      return resp;
    }).then(toModuleResponse);
  },

  getRedirectUrl(_registry, data) {
    return data.name;
  },
});
