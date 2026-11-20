import { initializeDatabase } from './database.mjs';
import { createDemoIntegration } from './demo.mjs';
import { createStackIntegration } from './stack.mjs';
import { localCompose } from './local-compose.mjs';
export function createDeploymentIntegration() { return {
  initializeDatabase,
  initialDatabases: [{"path": "intelligence.db", "spaceId": "local", "value": {"schemaVersion": 1, "preview": false, "updatedAt": "${now}", "collections": [{"id": "inbox", "title": "Inbox", "description": "Incoming materials", "domain": "mixed", "monitoringState": "not_configured"}], "materials": [], "objects": [], "events": []}}],
  demo: createDemoIntegration(),
  stack: createStackIntegration(),
  localCompose,
  "dataId": "intelligence",
  "volumes": [
    "intelligence"
  ],
  "runtime": {
    "INTELLIGENCE_DATA_DIR": "/data/intelligence",
    "INTELLIGENCE_DATABASE_FILE": "/data/intelligence/intelligence.db",
    "INTELLIGENCE_PREVIEW": "0"
  },
  "businessBindings": {},
  "initialFiles": [],
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
