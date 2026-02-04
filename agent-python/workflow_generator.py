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
import json
import uuid

load_dotenv()

VERBOSE = True

WOT_MCP_SERVER_URL = "http://localhost:3000/mcp"

model = ChatOpenAI(
    model=utils.LLM_VERSION,
    temperature=utils.LLM_TEMPERATURE,
    openai_api_key=os.getenv("OPENAI_API_KEY")
)

# Node-RED template that the LLM should understand
NODE_RED_TEMPLATE = """
# Node-RED Workflow Structure

When generating Node-RED flows, use these node types:

## Core WoT Nodes
- **consumed-thing**: References a Thing Description (TD)
  - Properties: tdLink or td (JSON string), http, coap, mqtt flags
  
- **read-property**: Read a property from a consumed thing
  - Properties: thing (node id), property (name), observe (boolean), uriVariables
  
- **write-property**: Write to a property
  - Properties: thing (node id), property (name), uriVariables
  
- **invoke-action**: Call an action
  - Properties: thing (node id), action (name), uriVariables
  
- **subscribe-event**: Listen to events
  - Properties: thing (node id), event (name)

## Flow Control & Debugging
- **inject**: Trigger the flow (payload, repeat, crontab)
- **debug**: Output to debug sidebar
- **function**: JavaScript function node (optional for custom logic)
- **comment**: Document sections

## Structure
1. Tab node (type: "tab") - defines the flow container
2. Consumed-thing nodes - one per device
3. Interaction nodes (read/write/invoke/subscribe) - connected to things
4. Trigger nodes (inject) - start the flow
5. Output nodes (debug) - show results

## Example Wiring
Inject -> Read-Property -> Debug
Inject -> Invoke-Action -> Debug
Subscribe-Event -> Debug

All nodes must have:
- id: unique identifier (16 char hex)
- z: tab id (for grouping)
- x, y: coordinates
- wires: array of connections to next nodes
"""

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

        # Enhanced system prompt that includes Node-RED knowledge and workflow strategy
        system_prompt = f"""{utils.SYSTEM_PROMPT}

{NODE_RED_TEMPLATE}

## Workflow Generation Strategy

For any user request:
1. Use list_devices to discover all available devices
2. Determine which devices are relevant to the request
3. For each relevant device, use get_thing_description to fetch complete TD
4. Generate a Node-RED flow JSON that:
   - Has one tab node with a unique ID
   - Creates one consumed-thing node per relevant device
   - Connects read-property, write-property, invoke-action, and subscribe-event nodes based on the task
   - Includes inject nodes to trigger the flow
   - Includes debug nodes to show outputs
   - Properly wires all nodes (wires arrays connect to next node IDs)

Return ONLY valid JSON array representing the Node-RED flow. No explanations.
"""

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