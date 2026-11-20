import { projectInventory, inspectInventory } from './inventory.mjs';
export function createStorageIntegration() { return {
  inventory: { project: projectInventory, inspection: { input: 'intelligenceRuntime', read: inspectInventory } },
  "rootId": "intelligence",
  "paths": {
    "intelligence": ""
  },
  "sources": [
    {
      "kind": "sqlite",
      "path": "intelligence",
      "relative": "intelligence.db",
      "target": "intelligence.db",
      "optional": true
    }
  ],
  "omissions": [],
  relocation: {
  "registeredRoots": [
    {
      "target": "intelligence.db",
      "path": "intelligence",
      "parent": true
    }
  ]
}
}; }
