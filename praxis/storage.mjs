import { projectInventory, inspectInventory } from './inventory.mjs';
export function createStorageIntegration() { return {
  inventory: { project: projectInventory, inspection: { input: 'intelligenceRuntime', read: inspectInventory } },
  "rootId": "intelligence",
  "paths": {
    "intelligence": ""
  },
  "sources": [
    {
      "kind": "json",
      "path": "intelligence",
      "relative": "data.json",
      "target": "data.json",
      "optional": true
    }
  ],
  "omissions": [],
  relocation: {
  "registeredRoots": [
    {
      "target": "data.json",
      "path": "intelligence",
      "parent": true
    }
  ]
}
}; }
