# Node-RED MCP Server

MCP (Model Context Protocol) server for managing Node-RED flows using natural language with Claude.

## Features

- Create, read, update, and delete Node-RED flows using official API
- Search and find nodes by type or name
- Trigger inject nodes remotely (requires additional setup)
- Visualize flow structures
- Full integration with Claude Code

## Available Tools

- `get-flows` - Get all Node-RED flows/tabs
- `get-flow` - Get a specific flow by ID or name
- `list-tabs` - List all flow tab names and IDs
- `create-flow` - Create a new flow tab with nodes
- `update-flow` - Update an existing flow
- `delete-flow` - Delete a flow tab (use with caution)
- `get-flows-formatted` - Get flows in human-readable format
- `find-nodes-by-type` - Find nodes by type (e.g., 'mqtt in', 'debug')
- `search-nodes` - Search nodes by name or property
- `inject` - Trigger an inject node (requires node-red-contrib-http-inject)
- `visualize-flows` - Generate visual representation of flows

## Installation

### Prerequisites

- Node.js 18+ installed
- Node-RED running (default: http://localhost:1880)
- Claude Code installed

### Step 1: Install Dependencies

```bash
cd node-red-mcp-server
npm install
```

### Step 2: Configure Claude Code

Add this MCP server to your Claude Code configuration file:

**Linux/Mac:** `~/.config/claude-code/mcp_settings.json`
**Windows:** `%APPDATA%\claude-code\mcp_settings.json`

```json
{
  "mcpServers": {
    "node-red-control": {
      "command": "node",
      "args": ["/home/aijyu/OneDrive/Ashfaq/node-red-mcp-server/index.js"],
      "env": {
        "NODE_RED_URL": "http://localhost:1880"
      }
    }
  }
}
```

**Important:** Update the path in `args` to match your actual installation directory.

### Step 3: Install the Claude Skill

Copy the skill file to Claude Code's skills directory:

**Linux/Mac:**
```bash
mkdir -p ~/.config/claude-code/skills
cp SKILL.md ~/.config/claude-code/skills/node-red-flow-management.md
```

**Windows:**
```powershell
mkdir $env:APPDATA\claude-code\skills
copy SKILL.md $env:APPDATA\claude-code\skills\node-red-flow-management.md
```

### Step 4: Restart Claude Code

After configuration, restart Claude Code to load the MCP server and skill.

## Configuration

### Environment Variables

- `NODE_RED_URL` - Base URL for Node-RED (default: `http://localhost:1880`)

You can override this in the MCP configuration or by setting it in your environment.

### Node-RED Setup

Ensure Node-RED is accessible and the HTTP API is enabled (it is by default).

If you've secured Node-RED with authentication, you'll need to modify the MCP server code to include credentials in the `nodeRedAPI` function.

## Usage Examples

Once configured, you can use natural language in Claude Code to manage flows:

```
Create a simple test flow with an inject and debug node
```

```
Update this flow to include a function node that generates random numbers
```

```
Show me all MQTT nodes in my flows
```

```
Add a temperature monitoring flow that subscribes to Home/Kitchen/Temperature
```

## API Compliance

This MCP server uses the official Node-RED Admin API endpoints:

- **GET /flows** - Get all flows
- **GET /flow/:id** - Get individual flow
- **POST /flow** - Add new flow
- **PUT /flow/:id** - Update flow
- **DELETE /flow/:id** - Delete flow

See [Node-RED Admin API Documentation](https://nodered.org/docs/api/admin/methods/) for details.

### Note on Inject Nodes

The `inject` tool attempts to trigger inject nodes remotely. However, **this is not part of the official Node-RED API**.

To enable remote triggering:
1. Install `node-red-contrib-http-inject` package
2. Or use HTTP In nodes instead of Inject nodes
3. Or manually click inject buttons in the Node-RED UI

## Troubleshooting

### MCP Server Not Connecting

1. Check that Node-RED is running: `curl http://localhost:1880`
2. Verify the path in `mcp_settings.json` is correct
3. Check Claude Code logs for errors

### Flows Not Updating

1. Verify Node-RED API is accessible
2. Check for errors in Claude Code output
3. Ensure flow IDs are correct

### Permission Errors

Make sure the MCP server script has execute permissions:
```bash
chmod +x /home/aijyu/OneDrive/Ashfaq/node-red-mcp-server/index.js
```

## Development

To test the server manually:
```bash
npm start
```

The server uses stdio transport, so it expects JSON-RPC messages via stdin/stdout.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│             │   MCP   │              │  HTTP   │              │
│ Claude Code │◄───────►│  MCP Server  │◄───────►│  Node-RED    │
│             │         │              │         │              │
└─────────────┘         └──────────────┘         └──────────────┘
```

## License

MIT
