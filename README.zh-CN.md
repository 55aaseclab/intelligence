# Intelligence 情报阅读

[English](README.md) · [产品需求](docs/PRD.md) · [路线图](docs/ROADMAP.md)

浏览集合中的来源资料、对比对象并回顾变化。使用 Node 22 或以上版本执行 `npm test` 和 `npm start -- --demo --host 127.0.0.1`，在本机打开 `http://127.0.0.1:4330/` 查看虚构预览。

使用私有快照时，通过 `INTELLIGENCE_DATA_DIR` 指定外部绝对目录，放入符合 schema 的 `data.json`，设置 `preview: false` 及仅所有者可读写的文件权限，使用 `npm start -- --host 127.0.0.1` 启动。服务提供只读接口，不修改原始快照。`fixtures/preview.json` 是虚构格式示例。

## Praxis 集成

应用维护的[供数合同](docs/PRAXIS-PROVIDER.md)提供按授权过滤、有来源依据的卡片与数据源描述，不增加 HTTP 元数据入口。使用 `npm run test:provider` 验证隔离供数测试。
