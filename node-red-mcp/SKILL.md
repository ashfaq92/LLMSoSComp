---
name: node-red-flow-management
description: Safe and effective creation, modification, and management of Node-RED flows for home automation using MQTT sensors and MCP integration. Use when creating new flows, modifying existing flows, or troubleshooting Node-RED deployments.
---

# Node-RED Flow Management

Guides Claude Code in safely creating and managing Node-RED flows for a home automation system using the official Node-RED Admin API.

**Important:** This skill is designed for **Claude Code** (the CLI tool), which automatically loads and applies this skill when working with Node-RED flows.

## System Context

**Environment:**
- Node-RED: http://localhost:1880
- MQTT Broker: 192.168.50.104:1883 (HiveMQHome)
- Primary use: Home automation with Zigbee sensors via Home Assistant/zigbee2mqtt
- MCP Server: Real-time sensor data at `/mcp` endpoint
- Timebase Historian: Historical data storage via separate MCP server

**Topic Structure:**
- Pattern: `Home/{Location}/{Metric}`
- Examples: `Home/Kitchen/Temperature`, `Home/Bedroom/Humidity`
- Sensor IDs: Always lowercase (kitchen, bedroom, living_room)
- Temperature: Stored in Celsius, convert to Fahrenheit when displaying

**Data Format:**
```json
{
  "name": "Temperature",
  "value": 17.22,
  "timestamp": 1764346999117,
  "properties": {
    "Quality": {
      "type": "Int32",
      "value": 192
    }
  }
}
````

**Quality Codes:**

* 192 = Good (linkquality > 75)
* 128 = Uncertain (linkquality 50-75)
* 0 = Bad (linkquality < 50)

## Node-RED Admin API

The MCP server uses the **official Node-RED Admin API** for all operations:

* `GET /flows` - Get all flow configurations
* `GET /flow/:id` - Get individual flow by ID
* `POST /flow` - Add new flow to configuration
* `PUT /flow/:id` - Update individual flow
* `DELETE /flow/:id` - Delete individual flow

See: https://nodered.org/docs/api/admin/methods/

**Benefits:**
- API-compliant and officially supported
- Safe single-flow operations (no full replacement)
- Better error handling and validation
- Future-proof against Node-RED updates

## Available MCP Tools

Claude has access to these node-red-control tools via the MCP server:

**Flow Management (Official API):**
* `get-flows` - Get all flows (uses `GET /flows`)
* `get-flow` - Get specific flow by ID (uses `GET /flow/:id`)
* `create-flow` - Create new flow tab with nodes (uses `POST /flow`)
* `update-flow` - Modify existing flow tab (uses `PUT /flow/:id`)
* `delete-flow` - Remove flow tab (uses `DELETE /flow/:id`) - **USE WITH EXTREME CAUTION**
* `list-tabs` - List all flow tab names and IDs

**Discovery & Visualization:**
* `find-nodes-by-type` - Find all nodes of specific type (e.g., 'mqtt in', 'function')
* `search-nodes` - Search nodes by name or property
* `get-flows-formatted` - Get human-readable flow structure
* `visualize-flows` - Generate visual text representation

**Node Triggering:**
* `inject` - Trigger inject nodes remotely
  - **Note:** Requires `node-red-contrib-http-inject` package or HTTP In nodes
  - Not part of official Node-RED API
  - Will provide helpful error if not available

## Critical Safety Rules

**ALWAYS:**

1. Describe changes clearly before deploying (what nodes, how they're wired, what they do)
2. Get existing flow with `get-flow` (by ID) before modifying it
3. Use descriptive node names (never "function 1", "mqtt in 2")
4. Include error handling (catch nodes where appropriate)
5. Explain what the flow does and how to test it
6. Use the official Node-RED Admin API endpoints via MCP tools

**NEVER:**

1. Delete or modify flows without explicit user confirmation
2. Create flows with hardcoded credentials (use config nodes/env vars)
3. Deploy flows that send external communications without asking first
4. Assume global context keys - check what exists first
5. Create infinite loops or excessive rate flows

**ASK CONFIRMATION before deploying flows that:**

* Send emails, SMS, webhooks, or external API calls
* Write to files or databases
* Control physical devices
* Use complex function node logic
* Modify or delete existing flows

## Context-Efficient Communication

**To avoid context bloat, follow these rules:**

1. **For simple flows (<5 nodes):** Show the complete flow JSON for user review
2. **For medium flows (5-15 nodes):** Describe the changes in detail, only show JSON if user requests it
3. **For complex flows (>15 nodes):** Always describe changes, never show full JSON unless explicitly requested

**When describing changes instead of showing JSON:**

* List each node being added/modified with its type and name
* Explain the wiring/connections between nodes
* Show any function node code or important configuration
* Provide a clear summary of what the flow will do

**Example description format:**

I'll add 3 nodes to your flow:

1. MQTT In node: "Subscribe Kitchen Temp"

   * Topic: Home/Kitchen/Temperature
   * Connected to node 2
2. Function node: "Parse Temperature Data"

   * Extracts value and timestamp
   * Connected to node 3
3. Debug node: "Display Temp"

   * Shows parsed temperature value
     ...

This preserves safety (user knows what's happening) while avoiding large JSON dumps in the conversation.

## Flow Creation Workflow

### 1. Understand Requirements

Ask clarifying questions:

* What triggers the flow? (MQTT message, HTTP request, timer, inject button)
* What data is needed? (which sensors, what metrics)
* What should happen? (store data, send alert, display value)
* Any conditions or thresholds?

### 2. Read Existing Context

Before creating similar flows:

```javascript
// Check what's already in global context
get-flows-formatted  // See all flows
search-nodes("mqtt") // Find MQTT nodes
```

### 3. Design & Explain

Present the approach clearly:

* **For simple flows (<5 nodes):** Present complete flow structure JSON for review
* **For medium/complex flows (>5 nodes):** Describe the design instead:

  * List all nodes that will be added/modified (type and name)
  * Describe how they'll be wired together
  * Show any function node code or critical configuration
  * Explain data flow through the nodes
  * Note any assumptions or dependencies

### 4. Deploy & Verify

After deployment:

* Confirm deployment success
* Explain how to test (click inject, send MQTT message, etc.)
* Point to debug nodes for monitoring
* Provide troubleshooting tips

## Node Standards

**Naming Convention:**

* Descriptive and specific: "Parse Kitchen Temperature" not "function 1"
* Action-based: "Store Sensor Data", "Check Temperature Threshold"
* Include location/context when relevant

**Node Positioning:**

* Use consistent grid spacing (x: multiples of ~150-200, y: multiples of ~60-80)
* Left-to-right flow direction
* Group related nodes vertically aligned

**Color Standards:**

* No need to set colors explicitly (use Node-RED defaults)
* Rely on node types for visual distinction

## Common Patterns

### Pattern: MQTT Data Storage

```javascript
// Function node: "Store Sensor Data"
const parts = msg.topic.split('/');
const location = parts[1].toLowerCase();  // "Kitchen" -> "kitchen"
const metric = parts[2].toLowerCase();    // "Temperature" -> "temperature"

// Parse payload
const data = typeof msg.payload === 'string'
  ? JSON.parse(msg.payload)
  : msg.payload;

// Store in global context
let sensorData = global.get('sensorData') || {};
if (!sensorData[location]) sensorData[location] = {};
sensorData[location][metric] = data.value;
sensorData[location].lastUpdate = data.timestamp || Date.now();
sensorData[location].quality = data.properties?.Quality?.value;
global.set('sensorData', sensorData);

return msg;
```

### Pattern: Temperature Alert

Flow structure:

1. MQTT In: Subscribe to `Home/+/Temperature`
2. Switch: Check threshold (> 30 = too hot, < 15 = too cold)
3. Delay: Rate limit to 1 per 5 minutes (avoid spam)
4. Function: Format alert message with location and value
5. Debug or notification node

Recommended details:

* Prefer a **Switch** node with two rules (too hot / too cold) and a third “otherwise” rule to drop messages.
* Add a **RBE** (report by exception) or **Delay (rate limit)** node to prevent repeated alerts.
* Put a **Debug** node on the alert path during testing.

### Pattern: MCP Endpoint Handler

Purpose: Provide an HTTP endpoint that exposes the latest in-memory sensor values (from `global.sensorData`) to other services (including LLM tooling) without dumping full flow JSON.

Flow structure (basic, safe read-only):

1. HTTP In: `GET /mcp/sensors`
2. Function: Validate query params (optional), read from `global.sensorData`, shape output
3. HTTP Response: return JSON
4. Catch: capture runtime errors (optional but recommended)
5. Debug: log errors during testing

Function node: "MCP: Serve Sensor Snapshot"

```javascript
// Supports:
//   GET /mcp/sensors
//   GET /mcp/sensors?location=kitchen
//   GET /mcp/sensors?location=kitchen&metric=temperature

const sensorData = global.get('sensorData') || {};
const q = msg.req?.query || {};
const location = (q.location || '').toString().trim().toLowerCase();
const metric = (q.metric || '').toString().trim().toLowerCase();

let result;

if (!location) {
  // Return full snapshot
  result = sensorData;
} else if (!sensorData[location]) {
  msg.statusCode = 404;
  result = { error: `Unknown location: ${location}` };
} else if (!metric) {
  // Return all metrics for a location
  result = sensorData[location];
} else if (sensorData[location][metric] === undefined) {
  msg.statusCode = 404;
  result = { error: `Unknown metric for ${location}: ${metric}` };
} else {
  // Return single metric value (and metadata if present)
  result = {
    location,
    metric,
    value: sensorData[location][metric],
    lastUpdate: sensorData[location].lastUpdate,
    quality: sensorData[location].quality
  };
}

msg.payload = result;
msg.headers = { "Content-Type": "application/json" };
return msg;
```

Notes:

* Keep this endpoint **read-only** by default. If adding write/update endpoints, **ask for confirmation** and add authentication/authorization.
* If exposing beyond localhost, add security (auth, IP allow-list, HTTPS) and confirm with the user first.

## Natural Language Flow Ops (Agent Behavior)

When the user asks to create/update a flow using natural language:

1. **Read first (before modify):**

   * Use `list-tabs` to find the relevant tab(s)
   * Use `get-flow` with the flow ID to get the specific flow details
   * The official API returns: `GET /flow/:id` provides flow tab + all nodes
   * Alternative: Use `get-flows-formatted` for human-readable overview

2. **Plan and explain:**

   * Summarize what you're going to change (nodes, wiring, purpose)
   * Follow the Context-Efficient Communication rules
   * For updates, explain what's being added/removed/modified

3. **Make the change with MCP tools:**

   * **Create new flow:** Use `create-flow` (calls `POST /flow`)
     - Provide: label (flow name) and nodes array
     - IDs are auto-generated if not provided
   * **Update existing flow:** Use `update-flow` (calls `PUT /flow/:id`)
     - Provide: flow ID and complete nodes array
     - This replaces all nodes in that flow
   * **Delete flow:** Use `delete-flow` (calls `DELETE /flow/:id`)
     - **Always ask confirmation first**
   * **Verify structure:** Use `visualize-flows` to show flow visualization

4. **Test instructions:**

   * If an Inject node exists, instruct user to click it in Node-RED UI
   * Note: `inject` tool requires additional setup (node-red-contrib-http-inject)
   * If MQTT-based, instruct how to publish a test message (topic + sample payload)
   * Recommend adding temporary Debug nodes during validation
   * Direct user to check http://localhost:1880 in browser

5. **Confirm risky actions:**

   * If the change affects external communications, files/databases, physical devices, or modifies/deletes existing flows: request explicit confirmation before proceeding

## Examples (from recorded demo)

### Example 1: Create a simple test flow (Inject -> Debug)

Goal: When Inject is clicked, write a message to the debug window.

* Create a new flow tab: "AI Test Flow"
* Add Inject node: "Inject Test Message" (payload: string)
* Add Debug node: "Debug Output"
* Wire Inject -> Debug
* Test: click Inject, confirm message appears in Debug sidebar

### Example 2: Update an existing flow by adding another Inject -> Debug pair

Goal: Add two new nodes to an existing flow with a different message.

* Read the existing flow with `get-flow`
* Add Inject node: "Inject Message 2"
* Add Debug node: "Debug Output 2"
* Wire Inject Message 2 -> Debug Output 2
* Test: click the new Inject and verify output

### Example 3: Insert a Function node between Inject and Debug (random sum)

Goal: Generate two random integers 1–10, sum them, and print details to debug.

* Read the existing flow with `get-flow`
* Add Function node: "Generate Random Sum"
* Wire: Inject -> Function -> Debug
* Function logic (example):

  * Create `a` and `b` random 1–10
  * Compute `sum = a + b`
  * Set `msg.payload` to a readable string or object
* Test: click Inject multiple times and observe different values

## Troubleshooting Guidelines

When debugging Node-RED + MQTT + sensors:

* Verify MQTT broker host/port match environment (192.168.50.104:1883).
* Confirm zigbee2mqtt topic format matches expected `Home/{Location}/{Metric}`.
* Use a Debug node on MQTT In output to inspect raw payload and topic.
* If parsing fails, ensure JSON payload is valid or handle string/non-string payloads.
* Check linkquality/Quality codes and optionally filter out poor quality readings.
* Avoid high-frequency loops:

  * Use Delay nodes and/or RBE nodes to reduce spam.
  * Never wire outputs back into inputs without deliberate rate limiting.

## Skill Maintenance

If a new node type or pattern is used and the behavior is unclear or inconsistent:

* Add a new “Common Pattern” section describing the correct approach.
* Include:

  * Node list + wiring
  * Key configuration fields
  * Any Function node code
  * Testing steps
* Keep changes incremental and follow the same structure and formatting used in this document.

```
```
````markdown
## Detailed Node Configuration Standards

### MQTT In Node (Subscribe)

**Name:** `Subscribe {Location} {Metric}` (e.g., `Subscribe Kitchen Temperature`)  
**Broker:** Use existing MQTT broker config node (do **not** create duplicates unless necessary)  
**Server:** `192.168.50.104`  
**Port:** `1883`  
**Topic:**
- Single metric: `Home/Kitchen/Temperature`
- Wildcard by location: `Home/+/Temperature`
- Wildcard by metric (use sparingly): `Home/Kitchen/+`

**QoS:** Default unless you have a reason to change it  
**Retain handling:** Assume default; if retained messages cause issues, explain and adjust deliberately

**Payload expectations:**
- Prefer JSON payload (object) matching the System Context schema.
- If payload is stringified JSON, parse safely in a Function node.

### MQTT Out Node (Publish)

Only add if user explicitly requests publishing control messages or test publishes.
- **ASK CONFIRMATION** if publishing can control devices or triggers automations.

### Debug Node

**Name:** `Debug {Purpose}` (e.g., `Debug Raw Payload`, `Debug Parsed Temp`)  
**Output:** `msg.payload` (default)  
**Temporary debug:** Add during testing, remove or disable after validation for noise control.

### Inject Node

**Name:** `Inject {Purpose}` (e.g., `Inject Test Message`)  
**Payload type:** string or JSON object depending on downstream nodes  
**Repeat:** Off by default (avoid loops/spam). Only enable repeating inject if rate-limited and explicitly needed.

### Function Node

**Name:** Verb-based and specific, e.g.:
- `Parse Temperature Payload`
- `Store Sensor Snapshot`
- `Generate Random Sum`

**Rules:**
- Include comments for any non-trivial logic.
- Never hardcode credentials/tokens in code.
- Defensive parsing: handle `msg.payload` as object or string.

**Template: Safe JSON parse**
```javascript
let data = msg.payload;
if (typeof data === "string") {
  try {
    data = JSON.parse(data);
  } catch (e) {
    node.warn("Invalid JSON payload");
    msg.payload = { error: "Invalid JSON", raw: msg.payload };
    return msg; // or route to error output if using multiple outputs
  }
}
msg.payload = data;
return msg;
````

### Switch Node (Threshold / Routing)

**Name:** `Check {Metric} Threshold`
**Rules:** Keep explicit and readable:

* `msg.payload.value > 30`
* `msg.payload.value < 15`

If you’re operating on stored globals, switch on a computed `msg.value` you set in a prior function.

### Delay Node (Rate limiting)

**Name:** `Rate Limit Alerts`
**Common setup:** “rate limit” to 1 msg / 5 min, drop intermediate
Use to prevent spam and accidental floods.

### Catch Node (Error Handling)

Add **Catch** nodes when:

* You introduce Function nodes with parsing logic
* You add HTTP endpoints
* You add any integration that can throw runtime errors

**Name:** `Catch Errors - {FlowName}`
Wire Catch -> Debug (during testing) and/or to a safe notification path.

## Data Handling Conventions

### Internal data model in global context

**Global key:** `sensorData` (object)

Structure (recommended):

```json
{
  "kitchen": {
    "temperature": 17.22,
    "humidity": 41.0,
    "lastUpdate": 1764346999117,
    "quality": 192
  },
  "bedroom": {
    "temperature": 19.1,
    "lastUpdate": 1764346999117,
    "quality": 128
  }
}
```

### Celsius vs Fahrenheit display

* Store **Celsius** in global context.
* Convert only for UI/debug display if requested.

Helper snippet:

```javascript
function cToF(c) { return (c * 9/5) + 32; }
```

### Quality filtering

If the user wants “ignore bad readings”:

* Good: 192
* Uncertain: 128
* Bad: 0

Example filter (drop bad):

```javascript
const q = data?.properties?.Quality?.value;
if (q === 0) return null; // drops message
```

## Timebase Historian Integration (Optional)

Only implement if the user explicitly requests storing historical data.

**ASK CONFIRMATION** before:

* Writing to databases
* Persisting files
* Sending data to external services

Recommended pattern:

1. Parse MQTT payload
2. Validate fields (`timestamp`, `value`, `metric`, `location`)
3. Send to Timebase MCP server (or an HTTP endpoint) with batching/rate limits
4. Handle failures with retries + dead-letter logging (or at minimum, Debug + Catch)

If the Timebase write mechanism is HTTP:

* Use HTTP Request node with env/config node for base URL
* Never hardcode URLs containing credentials

## MCP Tool Usage Rules (Agent Procedure)

When operating as the agent with MCP tools:

### Read-before-write

For **any** update:

1. `list-tabs` to find relevant flow tab (gets ID and label)
2. `get-flow` with the flow ID to inspect existing nodes and wiring
   - Official API: `GET /flow/:id` returns complete flow structure
3. Identify what will be added/changed/removed

### Explain-before-change

Before calling `update-flow` or `create-flow`:

* Summarize the plan:

  * Node types + names
  * Wiring (which nodes connect to which)
  * What it does (purpose/functionality)
  * How to test (steps for user to verify)

### Make the change

* **Create new flow:** Use `create-flow` (POST /flow)
  - Provide label and nodes array
  - Node IDs auto-generated if not provided
* **Update existing flow:** Use `update-flow` (PUT /flow/:id)
  - Must provide flow ID
  - Nodes array replaces all existing nodes
* **Delete flow:** Use `delete-flow` (DELETE /flow/:id)
  - Always confirm with user first
* Use descriptive node names consistently
* Avoid duplicate MQTT broker config nodes (reuse existing)

### Verify & test guidance

After the change:

* Provide step-by-step test instructions
* Direct user to click inject buttons in Node-RED UI (http://localhost:1880)
* Note: `inject` tool requires `node-red-contrib-http-inject` package
* Recommend temporary Debug nodes to validate output
* If MQTT-based, provide sample publish command for testing

### Visualization

Use `visualize-flows` when:

* User asks “show me the flow”
* Flow is medium/complex and a diagram improves clarity
* Troubleshooting wiring issues

## Confirmation Matrix (Hard Rules)

You **must** ask for explicit confirmation before doing any of these:

1. **Modify existing flows** (adding/removing nodes, rewiring, changing topics)
2. **Delete flows** or tabs (`delete-flow`)
3. Add anything that:

   * Sends emails/SMS/webhooks
   * Calls external APIs
   * Controls physical devices
   * Writes to files/databases
4. Adds complex Function logic that:

   * Runs frequently
   * Loops back into itself
   * Could spam outputs without rate limiting
5. Exposes endpoints beyond localhost or adds authentication changes

If the user confirms, proceed and document exactly what you will do.

## “Agent Output Format” (What you should say)

When responding to a user request, structure your response like this:

1. **Understanding**

   * 1–2 sentences confirming what the user wants

2. **Plan (Nodes + Wiring)**

   * Numbered list of nodes to add/modify with names and types
   * Wiring described left-to-right
   * Any important configs (MQTT topic, HTTP path, thresholds)

3. **Code (only if needed)**

   * Function node code blocks
   * Any non-default configuration notes

4. **Risk/Confirmation**

   * If action is risky, ask for confirmation here

5. **Test Steps**

   * Exact steps to validate (Inject click, MQTT publish example, endpoint curl)

## Minimal Test Snippets

### Publish a test MQTT message

Example:

* Topic: `Home/Kitchen/Temperature`
* Payload:

```json
{"name":"Temperature","value":21.5,"timestamp":1764346999117,"properties":{"Quality":{"type":"Int32","value":192}}}
```

### Test MCP HTTP endpoint locally

If you create `GET /mcp/sensors`:

* In browser: `http://localhost:1880/mcp/sensors`
* Or terminal:

```bash
curl http://localhost:1880/mcp/sensors
curl "http://localhost:1880/mcp/sensors?location=kitchen"
curl "http://localhost:1880/mcp/sensors?location=kitchen&metric=temperature"
```

## Example: “AI Test Flow” (Canonical Simple Flow)

**Goal:** Inject -> Debug prints a message

Nodes:

1. Inject: `Inject AI Message`

   * Payload: `"This is an AI generated flow"`
2. Debug: `Debug AI Message`

   * Output: `msg.payload`

Wiring:

* Inject -> Debug

Test:

* Click Inject
* Verify Debug sidebar shows the message

## Example: “AI Updated Flow” (Add second Inject/Debug)

Nodes added:

1. Inject: `Inject AI Message 2`

   * Payload: `"This is an example of an AI updated existing flow"`
2. Debug: `Debug AI Message 2`

Wiring:

* Inject AI Message 2 -> Debug AI Message 2

Test:

* Click new Inject
* Confirm second message appears

## Example: “Random Sum Function” (Inject -> Function -> Debug)

Function node: `Generate Random Sum`

```javascript
// Generate two random integers from 1 to 10
const a = Math.floor(Math.random() * 10) + 1;
const b = Math.floor(Math.random() * 10) + 1;
const sum = a + b;

// Output as a readable message
msg.payload = `Number 1 is ${a}, number 2 is ${b}, and the sum is ${sum}`;
return msg;
```

Test:

* Click Inject repeatedly
* Observe different values in Debug

## Skill Evolution Workflow (Self-Improving Instructions)

When you notice the agent produced something “a little funny” (incorrect wiring, wrong node choice, unsafe pattern):

1. Identify what went wrong (one sentence)
2. Add or refine a section in this document:

   * Add a new “Common Pattern”
   * Add a new “Node Configuration” entry
   * Add a new “Safety rule” if needed
3. Include:

   * Correct nodes + wiring
   * Key configuration fields
   * Function code (if applicable)
   * How to test
4. Keep the format consistent with this file so future runs are repeatable.

## Appendix: Recommended Node-RED Best-Practice Reminders

* Prefer small, single-purpose Function nodes over “do everything” functions.
* Use Debug nodes early during development; disable them in production.
* Use Delay/RBE to avoid flooding when subscribed to high-frequency topics.
* Keep broker config nodes centralized and reused.
* Avoid global context bloat—store only the latest snapshot unless history is required.
* Document thresholds and topic patterns in node names and comments.