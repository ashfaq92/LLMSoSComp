import asyncio
import os
import sys
from typing import Any, Dict, Type
import mcp.types as types
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import AIMessage, ToolMessage
from langchain_openai import ChatOpenAI

load_dotenv()

MCP_SERVER_URL = "http://localhost:3000/mcp"
VERBOSE = False

# model = ChatGoogleGenerativeAI(
#     model="gemini-2.5-flash",
#     temperature=0,
# )

model = ChatOpenAI(
    # model="gpt-4",  
    model="gpt-3.5-turbo",  
    temperature=0,
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
        notification_queue = asyncio.Queue()

        async def notification_handler(message):
            # Call the original handler first (to handle responses etc.)
            if original_handler:
                await original_handler(message)
            
            # Check for notifications - handle as Pydantic model
            if hasattr(message, 'root') and isinstance(message.root, types.ResourceUpdatedNotification):
                notification = message.root
                uri = str(notification.params.uri)  # Convert AnyUrl to string
                print(f"\n🔔 RESOURCE UPDATED: {uri}")
                if uri and "overheating" in uri:
                    await notification_queue.put(
                        f"ALERT: The device at {uri} is overheating! Please investigate and fix it immediately."
                    )
            elif hasattr(message, 'root') and isinstance(message.root, types.ResourceListChangedNotification):
                print(f"\n🔔 RESOURCE LIST CHANGED")
            elif isinstance(message, types.ResourceUpdatedNotification):
                uri = str(message.params.uri)  # Convert AnyUrl to string
                print(f"\n🔔 RESOURCE UPDATED: {uri}")
                if uri and "overheating" in uri:
                    await notification_queue.put(
                        f"ALERT: The device at {uri} is overheating! Please investigate and fix it immediately."
                    )
            elif isinstance(message, types.ResourceListChangedNotification):
                print(f"\n🔔 RESOURCE LIST CHANGED")

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

        # --- Auto-subscribe to resources ---
        print("Checking for resources to subscribe...")
        try:
            resources_result = await session.list_resources()
            if resources_result.resources:
                print(f"Found {len(resources_result.resources)} resources. Subscribing...")
                for resource in resources_result.resources:
                    await session.subscribe_resource(resource.uri)
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
        print("Listening for temperature alerts...\n")

        # Background task to monitor notifications
        async def notification_monitor():
            while True:
                try:
                    alert = await notification_queue.get()
                    print(f"\n🚨 {alert}")
                    # Process the alert through the agent
                    await process_with_agent(alert)
                except asyncio.CancelledError:
                    break

        async def process_with_agent(prompt):
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

        # Start the notification monitor task
        monitor_task = asyncio.create_task(notification_monitor())

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
