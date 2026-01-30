import asyncio
import os
import sys
from typing import List, Dict
import mcp.types as types
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import AIMessage, ToolMessage, HumanMessage
from langchain_openai import ChatOpenAI

load_dotenv()

VERBOSE = True  # Changed to True to see what's happening

# WoT MCP server URL (must be running with streamable-http transport)
WOT_MCP_SERVER_URL = "http://localhost:3000/mcp"

model = ChatOpenAI(
    model=os.getenv("LLM_VERSION"),  
    temperature=0,
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

class EventBuffer:
    """Simple buffer to track recent events for display purposes."""
    def __init__(self, max_events=100):
        self.events: List[Dict] = []
        self.max_events = max_events
        self.last_processed = 0
    
    def add_event(self, event_uri: str, event_name: str):
        self.events.append({
            "uri": event_uri,
            "name": event_name,
            "timestamp": asyncio.get_event_loop().time()
        })
        if len(self.events) > self.max_events:
            self.events.pop(0)
    
    def get_new_events(self) -> List[Dict]:
        new_events = self.events[self.last_processed:]
        if new_events:
            self.last_processed = len(self.events)
        return new_events

def print_event(message: str):
    """Print event message with proper formatting."""
    sys.stdout.write(f"\r{' ' * 100}\r")
    sys.stdout.flush()
    print(f"🔔 {message}")
    sys.stdout.write("You: ")
    sys.stdout.flush()

async def main():
    # WoT client - use streamable_http for event subscriptions
    wot_client = MultiServerMCPClient(
        {
            "wot": {
                "transport": "streamable_http",
                "url": WOT_MCP_SERVER_URL,
            }
        }
    )
    
    # Node-RED client - use stdio
    node_red_client = MultiServerMCPClient(
        {
            "node-red": {
                "transport": "stdio",
                "command": "node",
                "args": ["C:\\code_repos\\LLMSoSComp\\node-red-mcp\\index.js"]
            }
        }
    )

    print("Connecting to MCP servers...")
    
    event_buffer = EventBuffer()
    event_resources = {}
    
    # First, get node-red tools
    print("  Connecting to node-red MCP server...")
    node_red_tools = await node_red_client.get_tools()
    print(f"  ✓ Loaded {len(node_red_tools)} tools from node-red")
    
    # Now connect to wot with session for subscriptions
    print("  Connecting to wot MCP server...")
    async with wot_client.session("wot") as wot_session:
        # Setup notification handler
        original_handler = wot_session._message_handler
        
        async def notification_handler(message):
            """Capture events into buffer for display only."""
            if original_handler:
                await original_handler(message)
            
            try:
                if hasattr(message, 'root'):
                    actual_message = message.root
                else:
                    actual_message = message
                
                if isinstance(actual_message, types.ResourceUpdatedNotification):
                    uri = str(actual_message.params.uri)
                    if "/events/" in uri:
                        resource_name = event_resources.get(uri, uri)
                        event_buffer.add_event(uri, resource_name)
                elif isinstance(actual_message, types.ResourceListChangedNotification):
                    print_event("Resource list changed")
            except Exception as e:
                if VERBOSE:
                    print(f"Error in notification handler: {e}")

        wot_session._message_handler = notification_handler
        
        # Load wot tools
        wot_tools = await load_mcp_tools(wot_session)
        print(f"  ✓ Loaded {len(wot_tools)} tools from wot")
        
        # Combine all tools
        all_tools = wot_tools + node_red_tools
        
        for tool in all_tools:
            tool.handle_tool_error = True

        print(f"\n✓ Total tools loaded: {len(all_tools)}")

        # Subscribe to wot resources/events (for display only)
        print("\n📋 Subscribing to WoT events...")
        try:
            resources_result = await wot_session.list_resources()
            if resources_result.resources:
                for resource in resources_result.resources:
                    resource_uri = str(resource.uri)
                    await wot_session.subscribe_resource(resource_uri)
                    
                    if "/events/" in resource_uri:
                        event_resources[resource_uri] = resource.name
                        print(f"  📌 Subscribed to event: {resource.name}")
            else:
                print("  No resources found.")
        except Exception as e:
            print(f"Error subscribing to resources: {e}")

        system_prompt = (
        "You are a Node-RED workflow manager for IoT automation.\n\n"
        "Your job is to CREATE and MANAGE Node-RED workflows that automate IoT devices.\n"
        "You do NOT control devices directly - you create workflows that do.\n\n"
        "TOOLS AVAILABLE:\n"
        "1. WoT tools (with UUIDs) - Use ONLY to get device info/capabilities\n"
        "2. Node-RED tools - Use to CREATE/READ/UPDATE/DELETE workflows\n\n"
        "WHEN CREATING A FLOW WITH 'create-flow', YOU MUST PROVIDE:\n"
        "- label: Name of the flow\n"
        "- nodes: Array of node objects. Each node needs: type, name, and wires (connections)\n\n"
        "EXAMPLE create-flow call:\n"
        "{\n"
        '  "label": "My Automation",\n'
        '  "nodes": [\n'
        '    {"type": "inject", "name": "Trigger", "wires": [["node2_id"]]},\n'
        '    {"type": "http request", "name": "Call Device", "method": "POST", "url": "http://device/action", "wires": [[]]}\n'
        "  ]\n"
        "}\n\n"
        "COMMON NODE TYPES:\n"
        "- inject: Manual or timed trigger\n"
        "- http request: Call HTTP endpoints\n"
        "- mqtt in/out: MQTT messaging\n"
        "- function: Custom JavaScript\n"
        "- debug: Log output\n\n"
        "WHEN USER ASKS ABOUT DEVICES: Use WoT tools\n"
        "WHEN USER ASKS ABOUT WORKFLOWS: Use Node-RED tools\n\n"
        "IMPORTANT: Always include the 'nodes' array when creating flows!"
        )
        
        agent = create_agent(
            model=model,
            tools=all_tools,
            system_prompt=system_prompt,
            checkpointer=InMemorySaver(),
        )

        print("\n🏠 Node-RED Workflow Manager ready!")
        print("Create automations by describing what you want (e.g., 'Blink LEDs when washing machine finishes')")
        print("Type 'bye' to exit.\n")

        async def process_with_agent(prompt, thread_id="user_query"):
            """Process user request through the agent."""
            try:
                agent_response = await agent.ainvoke(
                    {"messages": [{"role": "user", "content": prompt}]},
                    {"configurable": {"thread_id": thread_id}}
                )
                
                if "messages" in agent_response:
                    messages = agent_response["messages"]
                    
                    # Print all messages for debugging
                    if VERBOSE:
                        print("\n--- Agent Messages ---")
                        for msg in messages:
                            if isinstance(msg, HumanMessage):
                                pass  # Skip user message
                            elif isinstance(msg, AIMessage):
                                if msg.tool_calls:
                                    for tc in msg.tool_calls:
                                        print(f"  🔧 Tool Call: {tc['name']}")
                                        print(f"     Args: {tc['args']}")
                            elif isinstance(msg, ToolMessage):
                                content = msg.content
                                if len(content) > 500:
                                    content = content[:500] + "..."
                                print(f"  📤 Tool Result: {content}")
                        print("--- End Messages ---\n")
                    
                    if messages:
                        last_msg = messages[-1]
                        if isinstance(last_msg, AIMessage):
                            if last_msg.content:
                                if isinstance(last_msg.content, list):
                                    for part in last_msg.content:
                                        if isinstance(part, dict) and part.get("type") == "text":
                                            return part.get('text')
                                else:
                                    return last_msg.content
            except Exception as e:
                import traceback
                traceback.print_exc()
                return f"Error: {e}"
            return None

        # Background task to display events (informational only)
        async def event_monitor():
            """Display events as they occur (Node-RED handles the actual automation)."""
            while True:
                try:
                    await asyncio.sleep(2)
                    
                    new_events = event_buffer.get_new_events()
                    
                    if new_events:
                        for event in new_events:
                            print_event(f"Event: {event['name']} (Node-RED workflows will handle this)")
                    
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    if VERBOSE:
                        print(f"Error in event monitor: {e}")

        monitor_task = asyncio.create_task(event_monitor())

        try:
            while True:
                try:
                    user_prompt = await asyncio.to_thread(input, "You: ")
                    
                    if user_prompt.lower() == "bye":
                        print("Goodbye!")
                        break
                    
                    if not user_prompt.strip():
                        continue
                    
                    # All user input goes to the agent - let it decide what to do
                    response = await process_with_agent(user_prompt)
                    if response:
                        print(f"🤖 Agent: {response}\n")
                
                except EOFError:
                    break
        finally:
            monitor_task.cancel()
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass