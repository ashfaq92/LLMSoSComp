import asyncio
import mcp.types as types
import os
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import AIMessage, ToolMessage

load_dotenv()

MCP_SERVER_URL = "http://localhost:3000/mcp"
VERBOSE = False

model = ChatOpenAI(
    model="gpt-4",  # or "gpt-3.5-turbo"
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
            # print(f"\n[DEBUG] Incoming notification: {message}")

            if original_handler:
                await original_handler(message)
            
            # Check for notifications
            if isinstance(message, types.ServerNotification):
                method = getattr(message, 'method', None)
                params = getattr(message, 'params', {})
                
                if method == "notifications/resources/updated":
                    uri = params.get('uri') if isinstance(params, dict) else getattr(params, 'uri', None)
                    print(f"\n🔔 RESOURCE UPDATED: {uri}")
                    # Check if it's an overheating event
                    if uri and "overheating" in uri:
                        await notification_queue.put(
                            f"ALERT: The device at {uri} is overheating! Please investigate and fix it immediately."
                        )
                elif method == "notifications/resources/list_changed":
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

        print("\nAgent ready! Type 'bye' to exit.")

        while True:
            try:
                # Wait for either user input or a notification
                input_task = asyncio.create_task(asyncio.to_thread(input, "User prompt: "))
                notification_task = asyncio.create_task(notification_queue.get())
                
                done, pending = await asyncio.wait(
                    [input_task, notification_task], 
                    return_when=asyncio.FIRST_COMPLETED
                )

                # Cancel pending tasks
                for task in pending:
                    task.cancel()

                if input_task in done:
                    try:
                        user_prompt = input_task.result()
                    except EOFError:
                        break
                else:
                    # It was a notification
                    user_prompt = notification_task.result()
                    print(f"\n🚨 Processing Notification: {user_prompt}")

            except asyncio.CancelledError:
                break

            if user_prompt.lower() == "bye":
                break

            async for chunk in agent.astream(
                {"messages": [{"role": "user", "content": user_prompt}]},
                {"configurable": {"thread_id": "1"}},
                stream_mode="updates",
            ):
                for step, data in chunk.items():
                    if "messages" in data:
                        last_msg = data["messages"][-1]
                        if isinstance(last_msg, AIMessage):
                            if last_msg.tool_calls:
                                for tool_call in last_msg.tool_calls:
                                    print(f"🛠️  Calling tool: {tool_call['name']} with {tool_call['args']}")
                            elif last_msg.content:
                                if isinstance(last_msg.content, list):
                                    for part in last_msg.content:
                                        if isinstance(part, dict) and part.get("type") == "text":
                                            print(f"🤖 Agent: {part.get('text')}")
                                else:
                                    print(f"🤖 Agent: {last_msg.content}")
                        elif isinstance(last_msg, ToolMessage):
                            print(f"✅ Tool Output: {last_msg.content}")
                        
                    if VERBOSE:
                        print(f"--- Step: {step} ---")
                        print(data)
                        print("--------------------")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
