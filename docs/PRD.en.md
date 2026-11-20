# Intelligence product requirements

Browse a private collection of source material and compare the people, products or projects it describes. Each material, object and reported change links to its source. Read paper, interview, comment and blog formats in their own views. Live snapshots are read-only on disk. Preview uses fictional records.

## Praxis provider

The app owns a version-1 `praxis-provider.mjs` contract for source-backed workbench cards and data-source metadata. Reads use host-supplied authorized callbacks; the provider has no direct filesystem, credential or network access. Preserve native object links, real revisions or stable content hashes, and distinct empty, partial and unavailable results. Personal card handling never modifies shared records. See [provider contract](PRAXIS-PROVIDER.md).

## Release identity

App release 0.1.3 reports the packaged application version from `/health`; registration, package metadata and runtime responses agree. Preview and configured data remain read-only.

## App-owned Praxis integration

This app owns its reviewed `praxis-integration.mjs`: native entry policy, typed business operations and MCP guidance where supported. Praxis loads that declaration from the installed source and retains authorization, signing, policy leases and audit. Installation does not grant access or start a backend. Existing native interfaces, data ownership and recovery boundaries remain in force.

## Structured database storage

The authoritative structured store uses app-owned SQLite with stable space/resource identities and unchanged native/API/CLI behavior. Use explicit JSON import/export and lossless conversion; preserve revisions, ordering, extension fields, receipts, events and mode. Keep originals/assets separate, do not initialize a missing configured source silently, and retain immutable legacy sources and a reversible cutover. Prove synthetic parity, isolation, concurrent/replayed writes, integrity and export/reopen before deployment.
