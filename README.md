# Intelligence

[简体中文](README.zh-CN.md) · [Requirements](docs/PRD.en.md) · [Roadmap](docs/ROADMAP.en.md)

Browse source materials, compare entities and review changes in a collection. The Node.js app reads an explicitly provided snapshot, or a small fictional catalog in preview mode.

```sh
npm test
npm start -- --demo --host 127.0.0.1
```

Open `http://127.0.0.1:4330/`. For a private collection, start with `INTELLIGENCE_DATA_DIR=/absolute/private/path npm start -- --host 127.0.0.1`. Supply a validated, externally stored `data.json` with `preview: false` and owner-only file permissions. The read-only service validates the schema and references, never rewrites the original and serves only its typed API and public static assets. See `fixtures/preview.json` for a fictional schema example.

## Praxis integration

The app-owned [provider contract](docs/PRAXIS-PROVIDER.md) supplies authorized source-backed cards and data-source metadata without exposing a new HTTP endpoint. Run `npm run test:provider` for the isolated provider checks.
