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
import json
from prompts_with_node_wot import SYSTEM_PROMPT    # change this file if you want to use a different system prompt
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
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
    wot_client = MultiServerMCPClient(
        {
            "wot": {
                "transport": "streamable_http",
                "url": WOT_MCP_SERVER_URL,
            }
        }
    )

    print("Connecting to WoT MCP server...")

    async with wot_client.session("wot") as wot_session:
        wot_tools = await load_mcp_tools(wot_session)
        print(f"✓ Loaded {len(wot_tools)} tools from WoT MCP server")

        system_prompt = SYSTEM_PROMPT


        agent = create_agent(
            model=model,
            tools=wot_tools,
            system_prompt=system_prompt,
            checkpointer=InMemorySaver(),
        )

        print("\n🤖 Node-RED Workflow Generator ready!")
        print("Describe the workflow you want (e.g., 'Blink LEDs when washing machine finishes')")
        print("Type 'bye' or 'exit' to exit.\n")

        while True:
            try:
                user_prompt = await asyncio.to_thread(input, "You: ")
                if user_prompt.lower() in ["bye", "exit"]:
                    print("Goodbye!")
                    break
                if not user_prompt.strip():
                    continue

                print("\n🔄 Processing your request...\n")
                
                # Let the agent handle everything - discovering devices, fetching TDs, generating flow
                try:
                    agent_response = await agent.ainvoke(
                        {"messages": [{"role": "user", "content": user_prompt}]},
                        {"configurable": {"thread_id": "workflow_generator"}}
                    )
                    
                    if "messages" in agent_response:
                        messages = agent_response["messages"]
                        if messages:
                            last_msg = messages[-1]
                            if isinstance(last_msg, AIMessage):
                                response_text = last_msg.content
                                if isinstance(response_text, list):
                                    # Extract text content
                                    text_parts = [part.get('text') if isinstance(part, dict) else str(part) 
                                                 for part in response_text if part]
                                    response_text = '\n'.join(text_parts)
                                
                                # Try to parse and validate the JSON
                                try:
                                    flow_json = json.loads(response_text)
                                    print(f"\n📝 Generated Node-RED Workflow:\n")
                                    print(json.dumps(flow_json, indent=2))
                                except json.JSONDecodeError:
                                    # If not valid JSON, show the raw response
                                    print(f"\n🤖 Agent Response:\n{response_text}")
                            else:
                                print(f"🤖 Agent: {last_msg.content}")
                except Exception as e:
                    print(f"❌ Error: {e}")
                    import traceback
                    traceback.print_exc()
                    
            except EOFError:
                break

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass