# 双链地址查询 UI

这是一个独立前端项目，不依赖现有 `web3-points-dapp`。

## 预览

直接用浏览器打开 `index.html` 即可。

## 接口接入

复制配置示例：

```bash
cp config.example.js config.js
```

然后编辑 `config.js`：

```js
window.APP_CONFIG = {
  siteHost: "your-domain.com",
  endpoints: {
    prices: "/api/prices",
    tronAddress: "/api/address/tron",
    ethereumAddress: "/api/address/ethereum",
    batchBalance: "/api/balance/batch",
  },
};
```

后续拿到真实接口后，填入：

- `prices`: 币价接口
- `tronAddress`: TRON 地址查询接口
- `ethereumAddress`: Ethereum 地址查询接口
- `batchBalance`: 批量余额查询接口

页面所有接口请求都会自动读取 `window.APP_CONFIG`。正式接口地址只改
`config.js`，不需要改 `app.js`。

默认接口封装在 `api.js`：

```js
api.prices("USDT,BTC,TRX,ETH");
api.tronAddress(addr);
api.ethereumAddress(addr);
api.batchBalance(data);
```

当前没有接口地址时会使用本地预览数据，方便先看 UI。

## Git 上传

这个目录可以作为独立仓库：

```bash
git init
git add .
git commit -m "Initial dual-chain query UI"
```

如果部署环境需要真实接口配置，把 `config.example.js` 复制为 `config.js` 后一起上传。
