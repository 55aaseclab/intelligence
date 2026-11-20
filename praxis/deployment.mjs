import { createDemoIntegration } from './demo.mjs';
import { createStackIntegration } from './stack.mjs';
import { localCompose } from './local-compose.mjs';
export function createDeploymentIntegration() { return {
  demo: createDemoIntegration(),
  stack: createStackIntegration(),
  localCompose,
  "dataId": "intelligence",
  "volumes": [
    "intelligence"
  ],
  "runtime": {
    "INTELLIGENCE_DATA_DIR": "/data/intelligence",
    "INTELLIGENCE_PREVIEW": "0"
  },
  "businessBindings": {},
  "initialFiles": [
    {
      "path": "data.json",
      "value": {
        "schemaVersion": 1,
        "preview": false,
        "updatedAt": "${now}",
        "collections": [
          {
            "id": "inbox",
            "title": "Inbox",
            "description": "Incoming materials",
            "domain": "mixed",
            "monitoringState": "not_configured"
          }
        ],
        "materials": [],
        "objects": [],
        "events": []
      }
    }
  ],
  "native": {
    "dockerfile": "Dockerfile.praxis",
    "command": [
      "node",
      "src/server.mjs"
    ]
  },
  provider: {
  "port": 4330,
  "portEnvs": [
    "INTELLIGENCE_PORT",
    "PORT"
  ]
}
}; }
