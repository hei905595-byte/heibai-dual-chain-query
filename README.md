# 双链地址查询 UI

这是一个独立前端项目，不依赖现有 `web3-points-dapp`。

## 预览

页面必须通过 HTTP 静态服务打开；直接使用 `file://` 时不会生成或展示模拟查询结果。

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
    tronIntel: "/api/intel/tron",
    ethereumAddress: "/api/address/ethereum",
    batchBalance: "/api/balance/batch",
  },
  evidenceHosts: ["tronscan.org", "nile.tronscan.org", "apilist.tronscanapi.com"],
};
```

后续拿到真实接口后，填入：

- `prices`: 币价接口
- `tronAddress`: TRON 地址查询接口
- `tronIntel`: TRON 地址深度情报接口
- `ethereumAddress`: Ethereum 地址查询接口
- `batchBalance`: 批量余额查询接口

页面所有接口请求都会自动读取 `window.APP_CONFIG`。正式接口地址只改
`config.js`，不需要改 `app.js`。

默认接口封装在 `api.js`：

```js
api.prices("USDT,BTC,TRX,ETH");
api.tronAddress(addr);
api.tronIntel(addr);
api.ethereumAddress(addr);
api.batchBalance(data);
```

线上批量余额弹窗最多接受 20 个地址，支持换行、逗号分隔、自动去重和双链识别。

接口不可用时页面明确显示失败，不生成预览数据或模拟情报。
证据链接仅在使用 HTTPS 且域名存在于 `evidenceHosts` 白名单时显示；接口返回的任意外部 URL 不会直接写入页面。

## Git 上传

这个目录可以作为独立仓库：

```bash
git init
git add .
git commit -m "Initial dual-chain query UI"
```

如果部署环境需要真实接口配置，把 `config.example.js` 复制为 `config.js` 后一起上传。
