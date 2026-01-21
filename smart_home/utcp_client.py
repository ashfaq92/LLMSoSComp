"""
UTCP Client for Smart Home - Using Official python-utcp SDK

This client uses the Universal Tool Calling Protocol to interact with
your WoT IoT devices via HTTP.

Since WoT devices don't natively speak UTCP (they return raw values, not UTCP manuals),
we manually define the tools with their schemas and use UTCP for execution.

Install dependencies:
    pip install -e ../python-utcp/core
    pip install -e ../python-utcp/plugins/communication_protocols/http
    pip install openai python-dotenv httpx

Run your devices first:
    node thingDirectory.js
    node devices/light.js
    node devices/thermostat.js
"""

import asyncio
import json
import httpx
from typing import Any, Optional
from dataclasses import dataclass
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

THING_DIRECTORY = "http://localhost:8080/things"


# =============================================================================
# Data Classes for Tools
# =============================================================================

@dataclass
class WoTTool:
    """Represents a tool derived from WoT Thing Description"""
    name: str
    description: str
    url: str
    http_method: str  # GET, PUT, POST
    parameters: dict  # JSON Schema for parameters
    thing_title: str


# =============================================================================
# WoT Thing Description to Tools Converter
# =============================================================================

def safe_name(s: str) -> str:
    """Convert to safe tool name"""
    return s.replace(" ", "_").replace("-", "_").lower()


async def fetch_thing_descriptions() -> list[dict]:
    """Fetch all Thing Descriptions from your WoT Thing Directory"""
    async with httpx.AsyncClient() as client:
        response = await client.get(THING_DIRECTORY)
        return response.json()


def convert_td_to_tools(things: list[dict]) -> list[WoTTool]:
    """
    Convert WoT Thing Descriptions to WoTTool objects.
    
    This manually creates tool definitions since WoT devices don't speak UTCP natively.
    """
    tools = []
    
    for td in things:
        thing_name = safe_name(td.get("title", "unknown"))
        thing_title = td.get("title", "Unknown Device")
        base_url = None
        
        # Extract base URL from TD
        if "base" in td:
            base_url = td["base"]
        else:
            for prop in td.get("properties", {}).values():
                for form in prop.get("forms", []):
                    href = form.get("href", "")
                    if href.startswith("http"):
                        base_url = "/".join(href.split("/")[:3])
                        break
                if base_url:
                    break
        
        if not base_url:
            continue
            
        # Convert Actions to tools
        for action_name, action_def in td.get("actions", {}).items():
            forms = action_def.get("forms", [])
            if forms:
                url = forms[0].get("href", "")
                if not url.startswith("http"):
                    url = f"{base_url}/{url}"
                
                # Build input schema
                input_schema = action_def.get("input", {})
                parameters = {"type": "object", "properties": {}, "required": []}
                
                if input_schema.get("type") == "object":
                    for prop_name, prop_def in input_schema.get("properties", {}).items():
                        parameters["properties"][prop_name] = {
                            "type": prop_def.get("type", "string"),
                            "description": prop_def.get("description", "")
                        }
                    parameters["required"] = input_schema.get("required", [])
                
                tools.append(WoTTool(
                    name=f"{thing_name}_{safe_name(action_name)}",
                    description=f"[{thing_title}] {action_def.get('description', action_name)}",
                    url=url,
                    http_method="POST",
                    parameters=parameters,
                    thing_title=thing_title
                ))
        
        # Convert Properties to tools
        for prop_name, prop_def in td.get("properties", {}).items():
            forms = prop_def.get("forms", [])
            if not forms:
                continue
                
            url = forms[0].get("href", "")
            if not url.startswith("http"):
                url = f"{base_url}/{url}"
            
            prop_title = prop_def.get("title", prop_name)
            
            # Writable property - create setter
            if not prop_def.get("readOnly", False):
                # Build setter parameters
                param_schema = {
                    "type": "object",
                    "properties": {
                        "value": {
                            "type": prop_def.get("type", "string"),
                            "description": f"Value to set for {prop_title}"
                        }
                    },
                    "required": ["value"]
                }
                
                # Add enum if present
                if "enum" in prop_def:
                    param_schema["properties"]["value"]["enum"] = prop_def["enum"]
                
                # Add min/max if present
                if "minimum" in prop_def:
                    param_schema["properties"]["value"]["minimum"] = prop_def["minimum"]
                if "maximum" in prop_def:
                    param_schema["properties"]["value"]["maximum"] = prop_def["maximum"]
                
                tools.append(WoTTool(
                    name=f"{thing_name}_set_{safe_name(prop_name)}",
                    description=f"[{thing_title}] Set {prop_title}" + 
                               (f" (options: {prop_def['enum']})" if "enum" in prop_def else ""),
                    url=url,
                    http_method="PUT",
                    parameters=param_schema,
                    thing_title=thing_title
                ))
            
            # Create getter for all properties
            tools.append(WoTTool(
                name=f"{thing_name}_get_{safe_name(prop_name)}",
                description=f"[{thing_title}] Get current {prop_title}",
                url=url,
                http_method="GET",
                parameters={"type": "object", "properties": {}},
                thing_title=thing_title
            ))
    
    return tools


# =============================================================================
# WoT Tool Executor (using direct HTTP, not UTCP client)
# =============================================================================

class WoTToolExecutor:
    """
    Executes tools against WoT devices via HTTP.
    
    Since WoT devices don't speak UTCP, we make direct HTTP calls
    based on the tool definitions we created from Thing Descriptions.
    """
    
    def __init__(self, tools: list[WoTTool]):
        self.tools = {tool.name: tool for tool in tools}
    
    async def execute(self, tool_name: str, args: dict) -> Any:
        """Execute a tool and return the result"""
        tool = self.tools.get(tool_name)
        if not tool:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        async with httpx.AsyncClient() as client:
            if tool.http_method == "GET":
                response = await client.get(tool.url)
                return response.json()
            
            elif tool.http_method == "PUT":
                # For property setters, send just the value
                value = args.get("value")
                response = await client.put(
                    tool.url,
                    json=value,
                    headers={"Content-Type": "application/json"}
                )
                return {"status": "success", "value": value}
            
            elif tool.http_method == "POST":
                # For actions, send the full args object (or None if empty)
                body = args if args else None
                response = await client.post(
                    tool.url,
                    json=body,
                    headers={"Content-Type": "application/json"}
                )
                try:
                    return response.json()
                except:
                    return {"status": "success"}
        
        raise ValueError(f"Unsupported HTTP method: {tool.http_method}")


# =============================================================================
# Smart Home Agent with LLM
# =============================================================================

class SmartHomeAgent:
    """
    An LLM agent that uses WoT tools to interact with IoT devices.
    """
    
    def __init__(self, tools: list[WoTTool], executor: WoTToolExecutor):
        self.tools = tools
        self.executor = executor
        self.openai = OpenAI()
        self.messages = []
    
    def _tools_to_openai_format(self) -> list[dict]:
        """Convert WoT tools to OpenAI function calling format"""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters
                }
            }
            for tool in self.tools
        ]
    
    async def chat(self, user_message: str) -> str:
        """Process a user message with tool calling"""
        self.messages.append({"role": "user", "content": user_message})
        
        # Call LLM with tools
        response = self.openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=self.messages,
            tools=self._tools_to_openai_format(),
            tool_choice="auto"
        )
        
        assistant_message = response.choices[0].message
        self.messages.append(assistant_message)
        
        # Handle tool calls
        if assistant_message.tool_calls:
            print(f"\n🔧 LLM requested {len(assistant_message.tool_calls)} tool call(s)")
            
            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}
                
                print(f"   → {tool_name}({tool_args})")
                
                try:
                    result = await self.executor.execute(tool_name, tool_args)
                    print(f"   ✓ Result: {result}")
                    result_str = json.dumps(result) if not isinstance(result, str) else result
                except Exception as e:
                    print(f"   ✗ Error: {e}")
                    result_str = json.dumps({"error": str(e)})
                
                self.messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result_str
                })
            
            # Get final response
            final_response = self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=self.messages
            )
            final_message = final_response.choices[0].message
            self.messages.append(final_message)
            return final_message.content
        
        return assistant_message.content


# =============================================================================
# Main - Interactive REPL
# =============================================================================

async def main():
    print("\n" + "="*60)
    print("🔧 UTCP-Style Smart Home Client")
    print("="*60)
    print("""
This client converts WoT Thing Descriptions to tool definitions
and uses them with an LLM agent.

Note: WoT devices don't natively speak UTCP, so we manually
define tools from TDs and execute via direct HTTP calls.

Architecture:
  WoT Thing Directory → Tool Definitions → HTTP Executor → LLM Agent
""")
    
    try:
        # Step 1: Discover things from WoT Thing Directory
        print("📡 Discovering IoT devices...")
        things = await fetch_thing_descriptions()
        print(f"   Found {len(things)} devices")
        
        for td in things:
            print(f"   • {td.get('title')}")
        
        # Step 2: Convert Thing Descriptions to tools
        tools = convert_td_to_tools(things)
        print(f"\n🔧 Created {len(tools)} tools")
        
        # Step 3: Create executor and agent
        executor = WoTToolExecutor(tools)
        agent = SmartHomeAgent(tools, executor)
        
        print("\n📋 Available Tools:")
        for tool in tools:
            print(f"   • {tool.name}: {tool.description}")
        
        print("\n" + "-"*60)
        print("🏠 Smart Home Client - Interactive Mode")
        print("Commands: 'exit' to quit, 'tools' to list tools\n")
        
        while True:
            try:
                question = input("You: ").strip()
                
                if question.lower() == 'exit':
                    print("Goodbye!")
                    break
                
                if question.lower() == 'tools':
                    print("\n📋 Tools:")
                    for tool in tools:
                        print(f"   • {tool.name}")
                        if tool.parameters.get("properties"):
                            for p, v in tool.parameters["properties"].items():
                                print(f"      - {p}: {v.get('type', 'any')}")
                    print()
                    continue
                
                if not question:
                    continue
                
                response = await agent.chat(question)
                print(f"\nAgent: {response}\n")
                
            except EOFError:
                break
            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
            except Exception as e:
                print(f"Error: {e}\n")
                import traceback
                traceback.print_exc()
    
    except httpx.ConnectError:
        print("\n❌ Could not connect to Thing Directory at http://localhost:8080/things")
        print("   Make sure your devices are running:")
        print("   1. node thingDirectory.js")
        print("   2. node devices/light.js")
        print("   3. node devices/thermostat.js")


if __name__ == "__main__":
    asyncio.run(main())