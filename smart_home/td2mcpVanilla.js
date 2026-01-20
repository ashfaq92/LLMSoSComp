import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

const THING_DIRECTORY = "http://localhost:8080/things"

function safeName(str) {
  return str.replace(/[^a-zA-Z0-9_-]/g, "_")
}

const toolMap = new Map()
let allTDs = []

// -----------------------------
// Discover all things from Thing Directory
// -----------------------------
async function discoverThings() {
  try {
    const res = await fetch(THING_DIRECTORY)
    const tds = await res.json()
    console.error(`\n✓ Discovered ${tds.length} things from directory:`)
    tds.forEach(td => {
      const actionCount = Object.keys(td.actions || {}).length
      const propCount = Object.keys(td.properties || {}).length
      console.error(`  • ${td.title}: ${actionCount} actions, ${propCount} properties`)
    })
    return tds
  } catch (err) {
    console.error(`✗ Failed to discover things: ${err.message}`)
    return []
  }
}

// -----------------------------
// Extract form URL from TD
// -----------------------------
function getFormUrl(forms) {
  if (!forms || forms.length === 0) return null
  return forms[0].href
}

// -----------------------------
// Initialize server
// -----------------------------
const server = new Server(
  { name: "WoT-MCP-Bridge", version: "1.0.0" },
  { capabilities: { resources: {}, tools: {} } }
)

// -----------------------------
// List resources (properties)
// -----------------------------
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = []
  allTDs.forEach(td => {
    Object.entries(td.properties || {}).forEach(([propName, prop]) => {
      resources.push({
        uri: `wot://${td.id}/properties/${propName}`,
        name: `${td.title} - ${prop.title || propName}`,
        mimeType: "application/json",
        description: prop.description || `Property ${propName} of ${td.title}`,
      })
    })
  })
  return { resources }
})

// -----------------------------
// Read resource (property value)
// -----------------------------
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const match = request.params.uri.match(/^wot:\/\/([^/]+)\/properties\/(.+)$/)
  if (!match) throw new Error(`Invalid URI: ${request.params.uri}`)
  const [, thingId, propName] = match
  const td = allTDs.find(t => t.id === thingId)
  if (!td) throw new Error(`Thing ${thingId} not found`)
  const property = td.properties[propName]
  if (!property) throw new Error(`Property ${propName} not found in ${td.title}`)
  const url = getFormUrl(property.forms)
  if (!url) throw new Error(`No form URL found for ${propName}`)
  const res = await fetch(url)
  const data = await res.json()
  return {
    contents: [
      { uri: request.params.uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }
    ],
  }
})

// -----------------------------
// List tools (actions + set/get properties)
// -----------------------------
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = []

  allTDs.forEach(td => {
    // Actions
    Object.entries(td.actions || {}).forEach(([actionName, action]) => {
      const toolName = safeName(`${td.title}_${actionName}`)
      toolMap.set(toolName, { thingId: td.id, type: "action", name: actionName })
      tools.push({
        name: toolName,
        description: `[${td.title}] ${action.description || actionName}`,
        inputSchema: action.input || { type: "object", properties: {} },
      })
    })

    // Properties
    Object.entries(td.properties || {}).forEach(([propName, prop]) => {
      // Writable properties (set)
      if (!prop.readOnly) {
        const toolName = safeName(`${td.title}_set_${propName}`)
        toolMap.set(toolName, { thingId: td.id, type: "property", name: propName })
        tools.push({
          name: toolName,
          description: `[${td.title}] Set ${prop.title || propName}`,
          inputSchema: { type: "object", properties: { [propName]: { type: prop.type } }, required: [propName] },
        })
      }

      // Read-only properties (get)
      if (prop.readOnly) {
        const toolName = safeName(`${td.title}_get_${propName}`)
        toolMap.set(toolName, { thingId: td.id, type: "readonly_property", name: propName })
        tools.push({
          name: toolName,
          description: `[${td.title}] Get ${prop.title || propName}`,
          inputSchema: { type: "object", properties: {} },
        })
      }
    })
  })

  return { tools }
})

// -----------------------------
// Call a tool (invoke action or set/get property)
// -----------------------------
// Call a tool (invoke action or set/get property)
// 
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const entry = toolMap.get(request.params.name)
    if (!entry) throw new Error(`Unknown tool: ${request.params.name}`)

    const { thingId, type, name } = entry
    const td = allTDs.find(t => t.id === thingId)
    if (!td) throw new Error(`Thing ${thingId} not found`)

    let url, method, body

    if (type === "property") {
      // Writable property - send just the value, not the arguments object
      const property = td.properties[name]
      if (!property) throw new Error(`Property ${name} not found in ${td.title}`)
      url = getFormUrl(property.forms)
      method = "PUT"
      // Extract the value from arguments - the key should match the property name
      const args = request.params.arguments || {}
      const value = args[name] !== undefined ? args[name] : args
      body = JSON.stringify(value)
      console.error(`[td2mcp] Setting ${td.title}.${name} = ${body}`)
    } else if (type === "readonly_property") {
      // Read-only property
      const property = td.properties[name]
      if (!property) throw new Error(`Property ${name} not found in ${td.title}`)
      url = getFormUrl(property.forms)
      method = "GET"
      body = undefined
    } else {
      // Action
      const action = td.actions[name]
      if (!action) throw new Error(`Action ${name} not found in ${td.title}`)
      url = getFormUrl(action.forms)
      method = "POST"
      body = JSON.stringify(request.params.arguments || {})
    }

    if (!url) throw new Error(`No form URL found for ${name}`)

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body })
    
    let result
    try {
      const text = await res.text()
      result = text ? JSON.parse(text) : { status: 'success' }
    } catch (e) {
      result = { status: 'success', message: 'Operation completed' }
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    }
  } catch (error) {
    // Always return valid JSON even on error
    return {
      content: [{ type: "text", text: JSON.stringify({ error: error.message }, null, 2) }],
    }
  }
})

// -----------------------------
// Start server
// -----------------------------
async function main() {
  console.error("\n🌉 WoT-MCP Bridge starting...")
  allTDs = await discoverThings()
  if (allTDs.length === 0) console.error("⚠️ No things discovered!")
  
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("✓ MCP server ready\n")
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
});