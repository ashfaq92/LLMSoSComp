import asyncio
import os
import mcp.types as types
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import AIMessage, ToolMessage
from langchain_openai import ChatOpenAI
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import utils

load_dotenv()

MCP_SERVER_URL = "http://localhost:3000/mcp"
VERBOSE = False

# model = ChatGoogleGenerativeAI(
#     model="gemini-2.5-flash",
#     temperature=0,
# )

model = ChatOpenAI(
    model=utils.LLM_VERSION,   
    temperature=utils.LLM_TEMPERATURE,
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

async def main():
    client = MultiServerMCPClient(
        {
            "wot": {
                "transport": "streamable_http",
                "url": MCP_SERVER_URL,
            }
        }
    )

    print("Connecting to MCP server...")
    # Create a persistent session
    async with client.session("wot") as session:
        # --- Notification Handling Setup ---
        original_handler = session._message_handler
        
        # Queue to communicate between notification handler and main loop
        event_queue = asyncio.Queue()
        
        # Dictionary to track which resources are events
        event_resources = {}

        async def notification_handler(message):
            # Call the original handler first (to handle responses etc.)
            if original_handler:
                await original_handler(message)
            
            # Check for notifications - handle as Pydantic model
            if hasattr(message, 'root') and isinstance(message.root, types.ResourceUpdatedNotification):
                notification = message.root
                uri = str(notification.params.uri)
                await handle_resource_update(uri)
            elif hasattr(message, 'root') and isinstance(message.root, types.ResourceListChangedNotification):
                print(f"\n🔔 RESOURCE LIST CHANGED")
            elif isinstance(message, types.ResourceUpdatedNotification):
                uri = str(message.params.uri)
                await handle_resource_update(uri)
            elif isinstance(message, types.ResourceListChangedNotification):
                print(f"\n🔔 RESOURCE LIST CHANGED")

        async def handle_resource_update(uri: str):
            """Handle resource updates dynamically based on resource type."""
            # Check if this is an event resource (URI contains /events/)
            if "/events/" in uri:
                resource_name = event_resources.get(uri, uri)
                await event_queue.put({
                    "uri": uri,
                    "name": resource_name,
                    "message": f"Event triggered: {resource_name}"
                })
            else:
                # For property updates, just log them
                print(f"\n📊 PROPERTY UPDATED: {uri}")

        # Inject our handler
        session._message_handler = notification_handler
        # -----------------------------------

        print("Loading tools...")
        # Load tools using the active session
        tools = await load_mcp_tools(session)

        # Enable error handling to allow the agent to recover from tool errors
        for tool in tools:
            tool.handle_tool_error = True

        print(f"Tools loaded: {[tool.name for tool in tools]}")
        print(f"Number of tools loaded: {len(tools)}")

        # --- Auto-subscribe to all resources ---
        print("Checking for resources to subscribe...")
        try:
            resources_result = await session.list_resources()
            if resources_result.resources:
                print(f"Found {len(resources_result.resources)} resources. Subscribing...")
                for resource in resources_result.resources:
                    await session.subscribe_resource(resource.uri)
                    
                    # Track event resources for easy identification
                    if "/events/" in resource.uri:
                        event_resources[resource.uri] = resource.name
                        print(f"  - Subscribed to event: {resource.name} ({resource.uri})")
                    else:
                        print(f"  - Subscribed to: {resource.name} ({resource.uri})")
            else:
                print("No resources found.")
        except Exception as e:
            print(f"Error subscribing to resources: {e}")
        # -----------------------------------

        system_prompt = (
            "You are an intelligent manager of IoT devices. "
            "You can read properties, write properties, and invoke actions on devices. "
            "Always verify the device status before performing critical actions. "
            "If a tool fails, explain the error to the user."
        )
        
        agent = create_agent(
            model=model,
            tools=tools,
            system_prompt=system_prompt,
            checkpointer=InMemorySaver(),
        )

        print("\n🏠 Agent ready! Type 'bye' to exit.")
        print("Listening for device events...\n")

        # Background task to monitor and display events (passive listening)
        async def event_monitor():
            while True:
                try:
                    event = await event_queue.get()
                    print(f"\n🔔 EVENT: {event['message']}")
                    # Passively display the event - do NOT auto-act on it
                    # User can then ask the agent to perform actions based on this event
                except asyncio.CancelledError:
                    break

        async def process_with_agent(prompt):
            """Process user request through the agent."""
            try:
                agent_response = await agent.ainvoke(
                    {"messages": [{"role": "user", "content": prompt}]},
                    {"configurable": {"thread_id": "1"}}
                )
                
                # Extract and print the response
                if "messages" in agent_response:
                    messages = agent_response["messages"]
                    if messages:
                        last_msg = messages[-1]
                        if isinstance(last_msg, AIMessage):
                            if last_msg.content:
                                if isinstance(last_msg.content, list):
                                    for part in last_msg.content:
                                        if isinstance(part, dict) and part.get("type") == "text":
                                            print(f"🤖 Agent: {part.get('text')}")
                                else:
                                    print(f"🤖 Agent: {last_msg.content}")
            except Exception as e:
                print(f"❌ Error processing: {e}")

        # Start the event monitor task
        monitor_task = asyncio.create_task(event_monitor())

        # Interactive loop - simple and clean
        try:
            while True:
                try:
                    user_prompt = await asyncio.to_thread(input, "You: ")
                    
                    if user_prompt.lower() == "bye":
                        print("Goodbye!")
                        break
                    
                    if not user_prompt.strip():
                        continue
                    
                    await process_with_agent(user_prompt)
                
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