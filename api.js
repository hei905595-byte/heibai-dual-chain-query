const DEFAULT_ENDPOINTS = {
  prices: "/api/prices",
  tronAddress: "/api/address/tron",
  tronIntel: "/api/intel/tron",
  ethereumAddress: "/api/address/ethereum",
  batchBalance: "/api/balance/batch",
};

export const api = {
  prices: (symbols) =>
    fetchJson(withQuery(getEndpoint("prices"), { symbols })),

  tronAddress: (addr) =>
    fetchJson(withAddress(getEndpoint("tronAddress"), addr)),

  tronIntel: (addr) =>
    fetchJson(withAddress(getEndpoint("tronIntel"), addr)),

  ethereumAddress: (addr) =>
    fetchJson(withAddress(getEndpoint("ethereumAddress"), addr)),

  batchBalance: (data) =>
    fetchJson(getEndpoint("batchBalance"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

function getEndpoint(key) {
  return window.APP_CONFIG?.endpoints?.[key] || DEFAULT_ENDPOINTS[key];
}

function withQuery(url, params) {
  const target = new URL(url, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      target.searchParams.set(key, value);
    }
  });

  return target.toString();
}

function withAddress(url, address) {
  if (url.includes("{addr}")) {
    return url.replace("{addr}", encodeURIComponent(address));
  }

  return `${url.replace(/\/+$/, "")}/${encodeURIComponent(address)}`;
}

async function fetchJson(url, options) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("接口响应超时，请稍后重试");
    throw new Error("网络连接失败，请检查网络后重试");
  } finally {
    window.clearTimeout(timer);
  }
  if (!response.ok) {
    let message = `接口请求失败：${response.status}`;
    try {
      const body = await response.json();
      message = body?.error?.message || body?.error || message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
}
