#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Node-RED configuration
const NODE_RED_URL = process.env.NODE_RED_URL || "http://localhost:1880";
const NODE_RED_API_BASE = `${NODE_RED_URL}`;

// Helper function to make Node-RED API calls
async function nodeRedAPI(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${NODE_RED_API_BASE}${endpoint}`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw new Error(`Node-RED API error: ${error.message}`);
  }
}

// Create MCP server
const server = new Server(
  {
    name: "node-red-control",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define all tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get-flows",
        description: "Get all Node-RED flows/tabs",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get-flow",
        description: "Get a specific Node-RED flow by ID or name",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Flow tab ID or name to retrieve",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "list-tabs",
        description: "List all flow tab names and IDs",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create-flow",
        description: "Create a new Node-RED flow tab with nodes",
        inputSchema: {
          type: "object",
          properties: {
            label: {
              type: "string",
              description: "Name/label for the new flow tab",
            },
            nodes: {
              type: "array",
              description: "Array of node objects to add to the flow",
            },
          },
          required: ["label", "nodes"],
        },
      },
      {
        name: "update-flow",
        description: "Update an existing Node-RED flow",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Flow tab ID to update",
            },
            nodes: {
              type: "array",
              description: "Complete array of nodes for this flow (replaces existing)",
            },
          },
          required: ["id", "nodes"],
        },
      },
      {
        name: "delete-flow",
        description: "Delete a Node-RED flow tab (use with caution)",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Flow tab ID to delete",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "get-flows-formatted",
        description: "Get flows in a human-readable formatted structure",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "find-nodes-by-type",
        description: "Find all nodes of a specific type across all flows",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              description: "Node type to search for (e.g., 'mqtt in', 'function', 'debug')",
            },
          },
          required: ["type"],
        },
      },
      {
        name: "search-nodes",
        description: "Search for nodes by name or property value",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query string to match against node names",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "inject",
        description: "Trigger an inject node by ID (requires node-red-contrib-http-inject or HTTP In node setup)",
        inputSchema: {
          type: "object",
          properties: {
            nodeId: {
              type: "string",
              description: "ID of the inject node to trigger",
            },
          },
          required: ["nodeId"],
        },
      },
      {
        name: "visualize-flows",
        description: "Generate a visual text representation of flows",
        inputSchema: {
          type: "object",
          properties: {
            flowId: {
              type: "string",
              description: "Optional: specific flow ID to visualize. If omitted, visualizes all flows.",
            },
          },
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get-flows": {
        const flows = await nodeRedAPI("GET", "/flows");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(flows, null, 2),
            },
          ],
        };
      }

      case "get-flow": {
        // Use the official API endpoint GET /flow/:id
        try {
          const flow = await nodeRedAPI("GET", `/flow/${args.id}`);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(flow, null, 2),
              },
            ],
          };
        } catch (error) {
          // If ID lookup fails, try searching by label
          const flows = await nodeRedAPI("GET", "/flows");
          const flowTab = flows.flows.find(
            (f) => f.label === args.id && f.type === "tab"
          );
          if (!flowTab) {
            throw new Error(`Flow not found: ${args.id}`);
          }
          // Get using the found ID
          const flow = await nodeRedAPI("GET", `/flow/${flowTab.id}`);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(flow, null, 2),
              },
            ],
          };
        }
      }

      case "list-tabs": {
        const flows = await nodeRedAPI("GET", "/flows");
        const tabs = flows.flows.filter((f) => f.type === "tab");
        const tabList = tabs.map((t) => ({
          id: t.id,
          label: t.label,
          disabled: t.disabled || false,
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tabList, null, 2),
            },
          ],
        };
      }

      case "create-flow": {
        // Use the official API endpoint POST /flow
        const newFlowId = generateId();

        // Create flow object with nodes
        const flowData = {
          id: newFlowId,
          type: "tab",
          label: args.label,
          disabled: false,
          info: "",
          nodes: args.nodes.map((node) => ({
            ...node,
            id: node.id || generateId(),
            z: newFlowId,
          })),
        };

        await nodeRedAPI("POST", "/flow", flowData);

        return {
          content: [
            {
              type: "text",
              text: `Flow "${args.label}" created successfully with ID: ${newFlowId}\nAdded ${flowData.nodes.length} nodes.`,
            },
          ],
        };
      }

      case "update-flow": {
        // Use the official API endpoint PUT /flow/:id
        // First get the existing flow to preserve metadata
        const existingFlow = await nodeRedAPI("GET", `/flow/${args.id}`);

        // Update with new nodes
        const updatedFlow = {
          ...existingFlow,
          nodes: args.nodes.map((node) => ({
            ...node,
            id: node.id || generateId(),
            z: args.id,
          })),
        };

        await nodeRedAPI("PUT", `/flow/${args.id}`, updatedFlow);

        return {
          content: [
            {
              type: "text",
              text: `Flow "${existingFlow.label}" updated successfully.\nNow contains ${updatedFlow.nodes.length} nodes.`,
            },
          ],
        };
      }

      case "delete-flow": {
        // Use the official API endpoint DELETE /flow/:id
        // Get flow info first for confirmation message
        const flow = await nodeRedAPI("GET", `/flow/${args.id}`);

        await nodeRedAPI("DELETE", `/flow/${args.id}`);

        return {
          content: [
            {
              type: "text",
              text: `Flow "${flow.label}" (${args.id}) deleted successfully.`,
            },
          ],
        };
      }

      case "get-flows-formatted": {
        const flows = await nodeRedAPI("GET", "/flows");
        const tabs = flows.flows.filter((f) => f.type === "tab");

        let formatted = "Node-RED Flows Overview\n" + "=".repeat(50) + "\n\n";

        for (const tab of tabs) {
          const tabNodes = flows.flows.filter((n) => n.z === tab.id);
          formatted += `Flow: ${tab.label} (${tab.id})\n`;
          formatted += `  Disabled: ${tab.disabled || false}\n`;
          formatted += `  Nodes: ${tabNodes.length}\n`;

          if (tabNodes.length > 0) {
            formatted += "  Node List:\n";
            for (const node of tabNodes) {
              formatted += `    - ${node.type}: "${node.name || "unnamed"}" (${node.id})\n`;
            }
          }
          formatted += "\n";
        }

        return {
          content: [
            {
              type: "text",
              text: formatted,
            },
          ],
        };
      }

      case "find-nodes-by-type": {
        const flows = await nodeRedAPI("GET", "/flows");
        const matchingNodes = flows.flows.filter(
          (n) => n.type === args.type
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(matchingNodes, null, 2),
            },
          ],
        };
      }

      case "search-nodes": {
        const flows = await nodeRedAPI("GET", "/flows");
        const query = args.query.toLowerCase();
        const matchingNodes = flows.flows.filter(
          (n) =>
            n.name?.toLowerCase().includes(query) ||
            n.label?.toLowerCase().includes(query) ||
            n.type?.toLowerCase().includes(query)
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(matchingNodes, null, 2),
            },
          ],
        };
      }

      case "inject": {
        // Note: Node-RED doesn't have a built-in API endpoint for triggering inject nodes
        // This requires either:
        // 1. node-red-contrib-http-inject package
        // 2. Creating HTTP In nodes instead
        // 3. Using the admin UI

        // Try the common endpoint used by node-red-contrib-http-inject
        try {
          await nodeRedAPI("POST", `/inject/${args.nodeId}`, {});
          return {
            content: [
              {
                type: "text",
                text: `Inject node ${args.nodeId} triggered successfully.`,
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Cannot trigger inject node. This feature requires either:\n` +
            `1. Install node-red-contrib-http-inject package\n` +
            `2. Use HTTP In nodes instead of Inject nodes\n` +
            `3. Manually click the inject button in Node-RED UI\n` +
            `Original error: ${error.message}`
          );
        }
      }

      case "visualize-flows": {
        const flows = await nodeRedAPI("GET", "/flows");
        let tabs = flows.flows.filter((f) => f.type === "tab");

        if (args.flowId) {
          tabs = tabs.filter((t) => t.id === args.flowId);
        }

        let visualization = "Node-RED Flow Visualization\n" + "=".repeat(60) + "\n\n";

        for (const tab of tabs) {
          const tabNodes = flows.flows.filter((n) => n.z === tab.id);
          visualization += `┌─ ${tab.label} (${tab.id})\n`;
          visualization += `│  Nodes: ${tabNodes.length}\n`;
          visualization += `│\n`;

          for (const node of tabNodes) {
            const wires = node.wires ? node.wires.flat().filter(Boolean) : [];
            visualization += `│  [${node.type}] ${node.name || "unnamed"}\n`;
            visualization += `│    ID: ${node.id}\n`;

            if (wires.length > 0) {
              visualization += `│    Wires to: ${wires.join(", ")}\n`;
            }
            visualization += `│\n`;
          }
          visualization += `└${"─".repeat(58)}\n\n`;
        }

        return {
          content: [
            {
              type: "text",
              text: visualization,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Helper function to generate unique IDs (Node-RED style)
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Node-RED MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
