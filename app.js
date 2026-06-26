const DEFAULT_CONFIG = {
  siteHost: "heibai.com",
  endpoints: {
    prices: "",
    tronAddress: "",
    ethereumAddress: "",
    batchBalance: "",
  },
};

const CONFIG = {
  ...DEFAULT_CONFIG,
  ...(window.APP_CONFIG ?? {}),
  endpoints: {
    ...DEFAULT_CONFIG.endpoints,
    ...(window.APP_CONFIG?.endpoints ?? {}),
  },
};

const fallbackPrices = {
  USDT: 6.79,
  BTC: 418716.3,
  TRX: 2.23,
  ETH: 11177.29,
};

const state = {
  chain: "tron",
};

const siteHost = document.querySelector("#siteHost");
const queryForm = document.querySelector("#queryForm");
const addressInput = document.querySelector("#addressInput");
const formHint = document.querySelector("#formHint");
const resultPanel = document.querySelector("#resultPanel");
const batchButton = document.querySelector("#batchButton");
const chainTabs = document.querySelectorAll(".chain-tabs button");

siteHost.textContent = CONFIG.siteHost;

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
    renderResult(state.chain, address, data);
    setHint("查询完成");
  } catch (error) {
    resultPanel.hidden = true;
    setHint(error instanceof Error ? error.message : "查询失败，请稍后再试");
  }
});

batchButton.addEventListener("click", () => {
  setHint("批量查询接口已预留，等待后端接口地址接入");
});

async function loadPrices() {
  let prices = fallbackPrices;

  if (CONFIG.endpoints.prices) {
    try {
      const response = await fetch(CONFIG.endpoints.prices);
      if (!response.ok) throw new Error("价格接口异常");
      prices = normalizePrices(await response.json());
    } catch {
      prices = fallbackPrices;
    }
  }

  Object.entries(prices).forEach(([symbol, value]) => {
    const node = document.querySelector(`[data-symbol="${symbol}"]`);
    if (node) node.textContent = `${value} ¥`;
  });
}

async function queryAddress(chain, address) {
  const endpoint =
    chain === "tron" ? CONFIG.endpoints.tronAddress : CONFIG.endpoints.ethereumAddress;

  if (!endpoint) {
    return getPreviewAddressData(chain, address);
  }

  const url = new URL(endpoint);
  url.searchParams.set("address", address);

  const response = await fetch(url);
  if (!response.ok) throw new Error("地址查询接口异常");

  return normalizeAddressResult(await response.json());
}

function normalizePrices(payload) {
  return {
    USDT: payload.USDT ?? payload.usdt ?? fallbackPrices.USDT,
    BTC: payload.BTC ?? payload.btc ?? fallbackPrices.BTC,
    TRX: payload.TRX ?? payload.trx ?? fallbackPrices.TRX,
    ETH: payload.ETH ?? payload.eth ?? fallbackPrices.ETH,
  };
}

function normalizeAddressResult(payload) {
  return {
    income: payload.income ?? payload.totalIn ?? payload.usdtIn ?? "--",
    outcome: payload.outcome ?? payload.totalOut ?? payload.usdtOut ?? "--",
    txCount: payload.txCount ?? payload.count ?? payload.transactions?.length ?? "--",
  };
}

function getPreviewAddressData(chain, address) {
  const seed = address.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return {
    income: `${(seed % 3000).toLocaleString()} USDT`,
    outcome: `${(seed % 1700).toLocaleString()} USDT`,
    txCount: chain === "tron" ? (seed % 88) + 1 : (seed % 42) + 1,
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

loadPrices();
