import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const THING_DIRECTORY = "http://localhost:8080/things";

const server = new Server(
  { name: "WoT-MCP-Bridge", version: "1.0.0" },
  { capabilities: { resources: {}, tools: {} } }
);

let allTDs = [];

// Discover all things from directory
async function discoverThings() {
  try {
    const res = await fetch(THING_DIRECTORY);
    const tds = await res.json();
    
    console.error(`\n✓ Discovered ${tds.length} things from directory:`);
    tds.forEach(td => {
      const actionCount = Object.keys(td.actions || {}).length;
      const propCount = Object.keys(td.properties || {}).length;
      console.error(`  • ${td.title}: ${actionCount} actions, ${propCount} properties`);
    });
    
    return tds;
  } catch (err) {
    console.error(`✗ Failed to discover things: ${err.message}`);
    console.error(`  Make sure Thing Directory is running on port 8080`);
    return [];
  }
}

// Extract URL from TD forms
function getFormUrl(forms) {
  if (!forms || forms.length === 0) return null;
  return forms[0].href;
}

// List all resources (properties from all things)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = [];
  
  allTDs.forEach(td => {
    Object.entries(td.properties || {}).forEach(([propName, prop]) => {
      resources.push({
        uri: `wot://${td.id}/properties/${propName}`,
        name: `${td.title} - ${prop.title || propName}`,
        mimeType: "application/json",
        description: prop.description || `Property ${propName} of ${td.title}`
      });
    });
  });
  
  return { resources };
});

// Read a specific resource (property value)
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const match = request.params.uri.match(/^wot:\/\/([^/]+)\/properties\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid URI format: ${request.params.uri}`);
  }
  
  const [, thingId, propName] = match;
  const td = allTDs.find(t => t.id === thingId);
  
  if (!td) {
    throw new Error(`Thing ${thingId} not found`);
  }
  
  const property = td.properties[propName];
  if (!property) {
    throw new Error(`Property ${propName} not found in ${td.title}`);
  }
  
  const url = getFormUrl(property.forms);
  if (!url) {
    throw new Error(`No form URL found for ${propName}`);
  }
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2)
      }]
    };
  } catch (err) {
    throw new Error(`Failed to read property: ${err.message}`);
  }
});

// List all tools (actions from all things)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [];
  
  allTDs.forEach(td => {
    Object.entries(td.actions || {}).forEach(([actionName, action]) => {
      tools.push({
        name: `${td.id}__${actionName}`,
        description: `[${td.title}] ${action.description || actionName}`,
        inputSchema: action.input || {
          type: "object",
          properties: {},
          required: []
        }
      });
    });
    
    // Also add writable properties as "set" tools
    Object.entries(td.properties || {}).forEach(([propName, prop]) => {
      if (!prop.readOnly) {
        tools.push({
          name: `${td.id}__set_${propName}`,
          description: `[${td.title}] Set ${prop.title || propName}`,
          inputSchema: {
            type: "object",
            properties: {
              [propName]: {
                type: prop.type,
                description: prop.description,
                ...(prop.minimum !== undefined && { minimum: prop.minimum }),
                ...(prop.maximum !== undefined && { maximum: prop.maximum }),
                ...(prop.enum && { enum: prop.enum })
              }
            },
            required: [propName]
          }
        });
      }
    });
  });
  
  return { tools };
});

// Call a tool (invoke action or set property)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const parts = request.params.name.split('__');
  if (parts.length !== 2) {
    throw new Error(`Invalid tool name format: ${request.params.name}`);
  }
  
  const [thingId, actionOrProp] = parts;
  const td = allTDs.find(t => t.id === thingId);
  
  if (!td) {
    throw new Error(`Thing ${thingId} not found`);
  }
  
  let url, method, body;
  
  // Check if it's a "set_property" tool
  if (actionOrProp.startsWith('set_')) {
    const propName = actionOrProp.substring(4); // Remove "set_" prefix
    const property = td.properties[propName];
    
    if (!property) {
      throw new Error(`Property ${propName} not found in ${td.title}`);
    }
    
    url = getFormUrl(property.forms);
    method = 'PUT';
    body = JSON.stringify(request.params.arguments || {});
  } else {
    // It's an action
    const action = td.actions[actionOrProp];
    
    if (!action) {
      throw new Error(`Action ${actionOrProp} not found in ${td.title}`);
    }
    
    url = getFormUrl(action.forms);
    method = 'POST';
    body = JSON.stringify(request.params.arguments || {});
  }
  
  if (!url) {
    throw new Error(`No form URL found for ${actionOrProp}`);
  }
  
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body
    });
    
    const result = await res.json();
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  } catch (err) {
    throw new Error(`Failed to invoke ${actionOrProp}: ${err.message}`);
  }
});

// Initialize and start
(async () => {
  console.error('\n═══════════════════════════════════════════════════════');
  console.error('  🌉 WoT to MCP Bridge');
  console.error('═══════════════════════════════════════════════════════');
  
  allTDs = await discoverThings();
  
  if (allTDs.length === 0) {
    console.error('\n⚠️  No things discovered!');
    console.error('    Make sure Thing Directory and devices are running.\n');
  } else {
    console.error(`\n📡 Exposing ${allTDs.length} WoT devices to MCP`);
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✓ MCP server ready\n');
})();