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
import utils

load_dotenv()

VERBOSE = True

WOT_MCP_SERVER_URL = "http://localhost:3000/mcp"

model = ChatOpenAI(
    model=utils.LLM_VERSION,
    temperature=utils.LLM_TEMPERATURE,
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

async def main():
    # Only connect to WoT MCP server
    wot_client = MultiServerMCPClient(
        {
            "wot": {
                "transport": "streamable_http",
                "url": WOT_MCP_SERVER_URL,
            }
        }
    )

    print("Connecting to WoT MCP server...")

    # Load all tools from WoT MCP server
    async with wot_client.session("wot") as wot_session:
        wot_tools = await load_mcp_tools(wot_session)
        print(f"✓ Loaded {len(wot_tools)} tools from WoT MCP server")

        # Fetch all available resources (devices)
        resources_result = await wot_session.list_resources()
        resources = resources_result.resources if resources_result and hasattr(resources_result, "resources") else []
        print(f"✓ Found {len(resources)} resources/devices")

        # Build a mapping of device names/URIs for lookup
        device_map = {r.name: r for r in resources}

        agent = create_agent(
            model=model,
            tools=wot_tools,
            system_prompt=utils.SYSTEM_PROMPT,
            checkpointer=InMemorySaver(),
        )

        print("\n🤖 Node-RED Workflow Generator ready!")
        print("Describe the workflow you want (e.g., 'Blink LEDs when washing machine finishes')")
        print("Type 'bye' or 'exit' to exit.\n")

        async def process_with_agent(prompt, thread_id="user_query"):
            try:
                agent_response = await agent.ainvoke(
                    {"messages": [{"role": "user", "content": prompt}]},
                    {"configurable": {"thread_id": thread_id}}
                )
                if "messages" in agent_response:
                    messages = agent_response["messages"]
                    if VERBOSE:
                        print("\n--- Agent Messages ---")
                        for msg in messages:
                            if isinstance(msg, HumanMessage):
                                pass
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

        while True:
            try:
                user_prompt = await asyncio.to_thread(input, "You: ")
                if user_prompt.lower() in ["bye", "exit"]:
                    print("Goodbye!")
                    break
                if not user_prompt.strip():
                    continue
                response = await process_with_agent(user_prompt)
                if response:
                    print(f"\n📝 Node-RED Workflow JSON:\n{response}\n")
            except EOFError:
                break

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass