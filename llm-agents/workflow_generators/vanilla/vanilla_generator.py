import asyncio
import os
import sys
import json
import requests
from typing import List
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.messages import AIMessage
from langchain_openai import ChatOpenAI
from prompts_with_node_wot import SYSTEM_PROMPT     # change this file for a different system prompt
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import utils


# LangSmith Configuration
utils.configure_langsmith_tracing()

VERBOSE = True

model = ChatOpenAI(
    model=utils.LLM_VERSION,
    temperature=utils.LLM_TEMPERATURE,
    openai_api_key=utils.API_KEY
)

def load_all_tds_from_config(config_path: str) -> List[dict]:
    tds = []
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
    for thing in config.get("things", []):
        url = thing.get("url")
        if url:
            try:
                resp = requests.get(url)
                resp.raise_for_status()
                tds.append(resp.json())
            except Exception as e:
                print(f"❌ Failed to fetch TD from {url}: {e}")
    return tds




async def main():
    # Load all TDs from things-config.json
    config_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', '..', '..', 'simulated-systems/system-of-systems', 'things-config.json')
    )
    all_tds = load_all_tds_from_config(config_path)
    print(f"✓ Loaded {len(all_tds)} Thing Descriptions from {config_path}")

    # Compose system prompt with all TDs
    system_prompt = SYSTEM_PROMPT.replace("{ALL_TDS}", json.dumps(all_tds, indent=2))

    agent = create_agent(
        model=model,
        tools=[],  # No tools needed
        system_prompt=system_prompt,
    )

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
                                text_parts = [part.get('text') if isinstance(part, dict) else str(part)
                                             for part in response_text if part]
                                response_text = '\n'.join(text_parts)
                            try:
                                flow_json = json.loads(response_text)
                                print(f"\n📝 Generated Node-RED Workflow:\n")
                                print(json.dumps(flow_json, indent=2))
                            except json.JSONDecodeError:
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