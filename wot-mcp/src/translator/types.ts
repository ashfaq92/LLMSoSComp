/**
 * types
 * 
 * Types for the WoT → MCP translation layer
 */

import { DataSchema } from 'wot-typescript-definitions';

/**
 * WoT Form definition (HTTP binding details)
 */
export interface Form {
  href: string;
  contentType?: string;
  op?: string | string[];
  [key: string]: unknown;
}

/**
 * Extracted affordance metadata (forms with protocol bindings)
 */
export interface AffordanceMetadata {
  forms?: Form[];
}

/**
 * Translated WoT Property → MCP Resource
 */
export interface TranslatedProperty {
  // MCP resource URI: wot://{thingId}/properties/{name}
  uri: string;
  // Human-readable name
  name: string;
  // Description from TD
  description?: string;
  // MIME type for the resource content
  mimeType: string;
  // Whether the property is writable
  writable: boolean;
  // Original WoT property name
  wotName: string;
  // JSON Schema for the property value
  schema?: DataSchema;
  // Affordance forms (HTTP binding details: href, contentType, etc.)
  affordance?: AffordanceMetadata;
}

/**
 * Translated WoT Action → MCP Tool
 */
export interface TranslatedAction {
  // Tool name: {thingId}_{actionName}
  name: string;
  // Description from TD
  description: string;
  // JSON Schema for input parameters
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  // Original WoT action name
  wotName: string;
  // Thing ID this action belongs to
  thingId: string;
  // Whether the input was wrapped in {value: ...} for MCP compatibility
  inputWrapped?: boolean;
  // Affordance forms (HTTP binding details: href, contentType, etc.)
  affordance?: AffordanceMetadata;
}

/**
 * Translated WoT Event → MCP Resource with subscription support
 */
export interface TranslatedEvent {
  // MCP resource URI: wot://{thingId}/events/{name}
  uri: string;
  // Human-readable name
  name: string;
  // Description from TD
  description?: string;
  // MIME type (always application/json for events)
  mimeType: string;
  // Original WoT event name
  wotName: string;
  // JSON Schema for event data
  schema?: DataSchema;
  // Affordance forms (HTTP binding details: href, contentType, etc.)
  affordance?: AffordanceMetadata;
}

/**
 * Complete translated Thing
 */
export interface TranslatedThing {
  // Thing ID (from TD id or title)
  id: string;
  // Human-readable title
  title: string;
  // Description
  description?: string;
  // Original Thing Description (stored for get_thing_description tool)
  originalTd?: any;
  // Translated properties as MCP resources
  properties: TranslatedProperty[];
  // Translated actions as MCP tools
  actions: TranslatedAction[];
  // Translated events as MCP resources
  events: TranslatedEvent[];
}

/**
 * MCP Resource definition
 */
export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: {
    audience?: ('user' | 'assistant')[];
    priority?: number;
    lastModified?: string;
  };
}

/**
 * MCP Tool definition
 */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** 
 * MCP Resource content
 */
export interface McpResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}
