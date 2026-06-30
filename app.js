import { api } from "./api.js";
import { safeEvidenceUrl } from "./link-policy.mjs";

const DEFAULT_CONFIG = {
  siteHost: "heibai.com",
  endpoints: {
    prices: "",
    tronAddress: "",
    tronIntel: "",
    ethereumAddress: "",
    batchBalance: "",
  },
  navigation: {
    points: "/points",
    query: "/query",
    guard: "/guard",
  },
  evidenceHosts: [
    "tronscan.org",
    "nile.tronscan.org",
    "shasta.tronscan.org",
    "apilist.tronscanapi.com",
    "nileapi.tronscan.org",
    "shastapi.tronscan.org",
  ],
};

const CONFIG = {
  ...DEFAULT_CONFIG,
  ...(window.APP_CONFIG ?? {}),
  endpoints: {
    ...DEFAULT_CONFIG.endpoints,
    ...(window.APP_CONFIG?.endpoints ?? {}),
  },
  navigation: {
    ...DEFAULT_CONFIG.navigation,
    ...(window.APP_CONFIG?.navigation ?? {}),
  },
};

const state = {
  chain: "tron",
};

const siteHost = document.querySelector("#siteHost");
const queryForm = document.querySelector("#queryForm");
const addressInput = document.querySelector("#addressInput");
const formHint = document.querySelector("#formHint");
const resultPanel = document.querySelector("#resultPanel");
const intelPanel = document.querySelector("#intelPanel");
const batchButton = document.querySelector("#batchButton");
const batchDialog = document.querySelector("#batchDialog");
const batchForm = document.querySelector("#batchForm");
const batchAddresses = document.querySelector("#batchAddresses");
const batchStatus = document.querySelector("#batchStatus");
const batchResults = document.querySelector("#batchResults");
const chainTabs = document.querySelectorAll(".chain-tabs button");

siteHost.textContent = CONFIG.siteHost;
document.querySelectorAll("[data-app-link]").forEach((link) => {
  link.href = CONFIG.navigation[link.dataset.appLink];
});

chainTabs.forEach((button) => {
  button.addEventListener("click", () => {
    state.chain = button.dataset.chain;
    chainTabs.forEach((item) => item.classList.toggle("active", item === button));
    addressInput.placeholder =
      state.chain === "tron"
        ? "请输入要查询的 TRX 地址"
        : "请输入要查询的 ETH 地址";
    formHint.textContent =
      state.chain === "tron"
        ? "当前查询 TRON 链 USDT / TRX 交易记录"
        : "当前查询 Ethereum 链 USDT / ETH 交易记录";
  });
});

document.querySelector(".refresh-button").addEventListener("click", () => {
  loadPrices();
});

queryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const address = addressInput.value.trim();
  if (!address) return;

  setHint("正在查询地址记录...");

  try {
    const data = await queryAddress(state.chain, address);
    renderResult(state.chain, address, data.summary);
    if (data.intel) renderIntel(data.intel);
    else intelPanel.hidden = true;
    setHint("查询完成");
  } catch (error) {
    resultPanel.hidden = true;
    intelPanel.hidden = true;
    setHint(error instanceof Error ? error.message : "查询失败，请稍后再试");
  }
});

batchButton.addEventListener("click", () => {
  batchDialog.showModal();
});

document.querySelector("#batchCancel").addEventListener("click", () => batchDialog.close());

batchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const addresses = parseBatchInput(batchAddresses.value);
  if (!addresses.length) {
    batchStatus.textContent = "请至少输入一个地址。";
    return;
  }
  if (addresses.length > 20) {
    batchStatus.textContent = "每次最多查询 20 个地址。";
    return;
  }
  batchStatus.textContent = `正在查询 ${addresses.length} 个地址…`;
  batchResults.replaceChildren();
  try {
    const payload = await api.batchBalance({ addresses });
    renderBatchBalances(payload.results || []);
    batchStatus.textContent = `完成：返回 ${payload.count ?? payload.results?.length ?? 0} 条结果。`;
  } catch (error) {
    batchStatus.textContent = error instanceof Error ? error.message : "批量查询失败。";
  }
});

async function loadPrices() {
  try {
    const prices = normalizePrices(await api.prices("USDT,BTC,TRX,ETH"));
    Object.entries(prices).forEach(([symbol, value]) => {
      const node = document.querySelector(`[data-symbol="${symbol}"]`);
      if (node) node.textContent = `$${value}`;
    });
  } catch {
    document.querySelectorAll("[data-symbol]").forEach((node) => {
      node.textContent = "暂不可用";
    });
    setHint("币价服务暂不可用，地址查询结果不会使用模拟数据");
  }
}

async function queryAddress(chain, address) {
  if (window.location.protocol === "file:") {
    throw new Error("真实查询需要通过已部署的 API 服务访问");
  }

  if (chain === "tron") {
    const intel = await api.tronIntel(address);
    return { summary: normalizeIntelSummary(intel), intel };
  }

  const payload = await api.ethereumAddress(address);
  return { summary: normalizeAddressResult(payload), intel: null };
}

function normalizePrices(payload) {
  const required = ["USDT", "BTC", "TRX", "ETH"];
  const normalized = Object.fromEntries(required.map((symbol) => [symbol, payload[symbol] ?? payload[symbol.toLowerCase()]]));
  if (required.some((symbol) => !Number.isFinite(Number(normalized[symbol])))) {
    throw new Error("币价响应不完整");
  }
  return {
    USDT: Number(normalized.USDT), BTC: Number(normalized.BTC),
    TRX: Number(normalized.TRX), ETH: Number(normalized.ETH),
  };
}

function normalizeAddressResult(payload) {
  return {
    income: payload.income ?? payload.totalIn ?? payload.usdtIn ?? "--",
    outcome: payload.outcome ?? payload.totalOut ?? payload.usdtOut ?? "--",
    txCount: payload.txCount ?? payload.count ?? payload.transactions?.length ?? "--",
  };
}

function normalizeIntelSummary(report) {
  const usdt = report.trc20?.tokens?.find((token) => token.symbol === "USDT");
  return {
    income: usdt ? formatTokenAmount(usdt.rawIn, usdt.decimals, "USDT") : "0 USDT",
    outcome: usdt ? formatTokenAmount(usdt.rawOut, usdt.decimals, "USDT") : "0 USDT",
    txCount: report.activity?.transactionCount ?? "--",
  };
}

function renderResult(chain, address, data) {
  document.querySelector("#resultChain").textContent =
    chain === "tron" ? "TRON" : "Ethereum";
  document.querySelector("#resultAddress").textContent = address;
  document.querySelector("#incomeValue").textContent = data.income;
  document.querySelector("#outcomeValue").textContent = data.outcome;
  document.querySelector("#txCount").textContent = data.txCount;
  resultPanel.hidden = false;
}

function setHint(message) {
  formHint.textContent = message;
}

function renderIntel(report) {
  const warnings = report.completeness?.warnings || [];
  const badge = document.querySelector("#intelBadge");
  badge.textContent = report.completeness?.complete ? "数据完整" : "部分数据";
  badge.classList.toggle("partial", !report.completeness?.complete);
  document.querySelector("#intelWindow").textContent =
    `统计窗口：${report.window?.from || "--"} 至 ${report.window?.to || "--"}`;

  const warningBox = document.querySelector("#intelWarnings");
  warningBox.replaceChildren();
  warningBox.hidden = warnings.length === 0;
  warnings.forEach((warning) => warningBox.append(createText("p", warning)));

  const approvalItems = report.approvals?.items || [];
  const riskyApprovals = approvalItems.filter((item) => item.riskLevel !== "low").length;
  const riskAssessment = report.riskAssessment || {};
  const stats = [
    ["近30天交易", report.activity?.transactionCount ?? 0],
    ["交互合约", report.activity?.contractInteractions?.length ?? 0],
    ["TRC20事件", report.trc20?.totalTransfers ?? 0],
    ["当前授权", report.approvals?.enabled ? approvalItems.length : "未接入"],
    ["风险授权", report.approvals?.enabled ? riskyApprovals : "未知"],
    ["风险等级", riskAssessment.level || "未知"],
    ["规则分", Number.isFinite(riskAssessment.score) ? riskAssessment.score : "--"],
  ];
  const statsNode = document.querySelector("#intelStats");
  statsNode.replaceChildren(...stats.map(([label, value]) => {
    const card = document.createElement("div");
    card.append(createText("strong", String(value)), createText("span", label));
    return card;
  }));

  const groups = document.querySelector("#intelGroups");
  groups.replaceChildren();
  appendIntelGroup(groups, "高频合约交互", (report.activity?.contractInteractions || []).map((item) => ({
    title: item.label?.name || shortAddress(item.contractAddress),
    meta: `${item.count} 次 · ${item.firstSeen || "--"} 至 ${item.lastSeen || "--"}`,
    badge: item.label?.category || "合约",
    evidence: item.evidence?.[0]?.url,
  })), "近30天没有识别到合约调用");

  appendIntelGroup(groups, "TRC20 代币活动", (report.trc20?.tokens || []).map((item) => ({
    title: `${item.symbol} · ${shortAddress(item.tokenAddress)}`,
    meta: `${item.count} 笔（转入 ${item.inCount} / 转出 ${item.outCount}）`,
    badge: item.label?.category || "Token",
    evidence: item.evidence?.[0]?.url,
  })), "近30天没有识别到 TRC20 事件");

  appendIntelGroup(groups, "当前授权与风险", approvalItems.map((item) => ({
    title: `${item.token?.tokenAbbr || item.token?.symbol || "Token"} → ${item.spenderLabel?.name || shortAddress(item.spender)}`,
    meta: item.reasons?.length ? item.reasons.join(" · ") : "有限授权或暂无风险标签",
    badge: item.riskLevel === "high" ? "高风险" : item.riskLevel === "medium" ? "高暴露" : "低风险",
    tone: item.riskLevel,
    evidence: item.evidence?.url,
  })), report.approvals?.enabled ? "当前没有返回授权记录" : "授权数据源尚未接入，不能据此判断安全");

  appendIntelGroup(groups, "风险规则命中", (riskAssessment.rules || []).map((item) => ({
    title: item.title || item.id,
    meta: `${item.id} · ${item.count ?? 1} 项证据 · +${item.points ?? 0} 分`,
    badge: item.severity || "INFO",
    tone: item.severity === "HIGH" ? "high" : item.severity === "MEDIUM" ? "medium" : "low",
    evidence: item.evidence?.[0],
  })), riskAssessment.level === "UNKNOWN" ? "数据不完整，暂不能形成风险结论" : "没有命中当前版本的证据规则");

  appendIntelGroup(groups, "项目参与", (report.projects?.items || []).map((item) => ({
    title: item.project_name || item.name || "未命名项目",
    meta: item.url || "TRONSCAN 项目参与记录",
    badge: "项目",
    evidence: item.url || report.projects?.source,
  })), report.projects?.enabled ? "没有返回项目参与记录" : "项目数据源尚未接入");

  appendIntelGroup(groups, "近期交易证据", (report.activity?.transactions || []).slice(0, 20).map((item) => ({
    title: `${item.type} · ${shortAddress(item.contractAddress || item.recipient || report.address)}`,
    meta: `${item.time || "--"} · ${item.status || "状态未知"}`,
    badge: item.type === "TriggerSmartContract" ? "合约" : item.type === "CreateSmartContract" ? "部署" : "交易",
    evidence: item.evidenceUrl,
  })), "没有返回近期交易证据");

  document.querySelector("#intelDisclaimer").textContent = [
    report.disclaimer,
    ...(riskAssessment.limitations || []),
  ].filter(Boolean).join(" ");
  intelPanel.hidden = false;
}

function appendIntelGroup(parent, title, rows, emptyMessage) {
  const section = document.createElement("section");
  section.className = "intel-group";
  section.append(createText("h3", title));
  if (rows.length === 0) {
    const empty = createText("p", emptyMessage);
    empty.className = "intel-empty";
    section.append(empty);
  } else {
    const list = document.createElement("ul");
    rows.forEach((row) => {
      const item = document.createElement("li");
      const copy = document.createElement("div");
      copy.append(createText("strong", row.title), createText("span", row.meta));
      const badge = createText("em", row.badge);
      if (row.tone) badge.dataset.tone = row.tone;
      item.append(copy, badge);
      const evidenceUrl = safeEvidenceUrl(row.evidence, CONFIG.evidenceHosts);
      if (evidenceUrl) {
        const link = createText("a", "核验证据 ↗");
        link.href = evidenceUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        item.append(link);
      }
      list.append(item);
    });
    section.append(list);
  }
  parent.append(section);
}

function formatTokenAmount(raw, decimals, symbol) {
  const value = String(raw || "0").padStart(Number(decimals || 0) + 1, "0");
  const places = Number(decimals || 0);
  const integer = places ? value.slice(0, -places) : value;
  const fraction = places ? value.slice(-places).replace(/0+$/, "").slice(0, 6) : "";
  return `${integer}${fraction ? `.${fraction}` : ""} ${symbol}`;
}

function shortAddress(value) {
  if (!value) return "未知地址";
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function createText(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function parseBatchInput(value) {
  return [...new Set(String(value).split(/[\s,，;；]+/).map(item => item.trim()).filter(Boolean))];
}

function renderBatchBalances(results) {
  batchResults.replaceChildren(...results.map(result => {
    const row = document.createElement("article");
    const detail = document.createElement("div");
    detail.append(createText("strong", shortAddress(result.address)), createText("span", result.chain ? result.chain.toUpperCase() : "无法识别链"));
    const value = result.ok
      ? `${Number(result.balance).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${result.symbol}`
      : result.error?.message || "查询失败";
    const badge = createText("em", value);
    badge.dataset.ok = String(Boolean(result.ok));
    row.append(detail, badge);
    return row;
  }));
}

loadPrices();
