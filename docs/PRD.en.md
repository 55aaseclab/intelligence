# Intelligence product requirements

Browse a private collection of source material and compare the people, products or projects it describes. Each material, object and reported change links to its source. Read paper, interview, comment and blog formats in their own views. Live snapshots are read-only on disk. Preview uses fictional records.

## Praxis provider

The app owns a version-1 `praxis-provider.mjs` contract for source-backed workbench cards and data-source metadata. Reads use host-supplied authorized callbacks; the provider has no direct filesystem, credential or network access. Preserve native object links, real revisions or stable content hashes, and distinct empty, partial and unavailable results. Personal card handling never modifies shared records. See [provider contract](PRAXIS-PROVIDER.md).

## Release identity

App release 0.1.3 reports the packaged application version from `/health`; registration, package metadata and runtime responses agree. Preview and configured data remain read-only.
