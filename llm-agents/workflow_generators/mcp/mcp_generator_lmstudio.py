import asyncio
import os
import sys
from typing import List, Dict
import mcp.types as types
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
import json
from prompts_with_node_wot import SYSTEM_PROMPT    # change this file for a different system prompt
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import utils

load_dotenv()

# LangSmith Configuration
utils.configure_langsmith_tracing()

VERBOSE = True

WOT_MCP_SERVER_URL = "http://localhost:3000/mcp"

# Initialize LM Studio (Gemma2) model as in vanilla_generator_gemma2b.py
model = init_chat_model(
    model=utils.LLM_VERSION,
    model_provider="openai",
    base_url="http://localhost:1234/v1",
    api_key="not-needed",
    temperature=utils.LLM_TEMPERATURE,
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

        print("\n🤖 Node-RED Workflow Generator ready!")
        print("Describe the workflow you want (e.g., 'Blink LEDs when washing machine cycle has finished.')")
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
                try:
                    # Prepare messages for LM Studio
                    messages = [
                        SystemMessage(content=system_prompt),
                        HumanMessage(content=user_prompt)
                    ]
                    # Call LM Studio model (Gemma2)
                    response = await asyncio.to_thread(model.invoke, messages)
                    response_text = response.content
                    try:
                        flow_json = json.loads(response_text)
                        print(f"\n📝 Generated Node-RED Workflow:\n")
                        print(json.dumps(flow_json, indent=2))
                    except json.JSONDecodeError:
                        print(f"\n🤖 Agent Response:\n{response_text}")
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