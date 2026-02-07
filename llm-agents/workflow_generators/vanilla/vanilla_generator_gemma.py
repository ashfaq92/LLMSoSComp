import asyncio
import os
import sys
import json
import requests
from typing import List
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage, HumanMessage
from prompts_with_node_wot import SYSTEM_PROMPT     # change this file for a different system prompt
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import utils

load_dotenv()

VERBOSE = True

# Initialize LM Studio (Gemma2) model as in lmstudio.py
model = init_chat_model(
    model="google/gemma-3-1b:2",
    model_provider="openai",
    base_url="http://localhost:1234/v1",
    api_key="not-needed",
    temperature=utils.LLM_TEMPERATURE,
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
        os.path.join(os.path.dirname(__file__), '..', '..', '..', 'smart-home', 'things-config.json')
    )

    all_tds = load_all_tds_from_config(config_path)
    print(f"✓ Loaded {len(all_tds)} Thing Descriptions from {config_path}")

    # Limit to first 3 TDs and use compact JSON to save tokens
    limited_tds = all_tds[:3]
    system_prompt = SYSTEM_PROMPT.replace("{ALL_TDS}", json.dumps(limited_tds, separators=(",", ":")))

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