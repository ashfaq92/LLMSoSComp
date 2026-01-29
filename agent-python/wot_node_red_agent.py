import asyncio
import os
import sys
import json
from typing import Any, Dict, Type, List
import mcp.types as types
from langchain.agents import create_agent
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import AIMessage
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

# WOT_MCP_SERVER_URL = "http://localhost:3000/mcp"

model = ChatOpenAI(
    model=os.getenv("LLM_MODEL"),
    temperature=0.7,
    openai_api_key=os.getenv("OPENAI_API_KEY")
)


def print_section(message: str):
    """Print section header."""
    print(f"\n{'='*60}")
    print(f"  {message}")
    print(f"{'='*60}\n")


async def main():
    """Main agent function for Node-RED workflow generation."""
    
    # Initialize MCP clients for both servers
    client = MultiServerMCPClient(
        {
            "wot": {
                "transport": "stdio",
                "command": "node",
                "args": [
                    "C:\\code_repos\\LLMSoSComp\\wot-mcp\\dist\\main.js",
                    "--tool-strategy",
                    "explicit",
                    "--config",
                    "C:\\code_repos\\LLMSoSComp\\smart-home\\things-config.json"
                ]
            },
            "node-red": {
                "transport": "stdio",
                "command": "node",
                "args": ["C:\\code_repos\\LLMSoSComp\\node-red-mcp\\index.js"]
            }
        }
    )

    print_section("🤖 IoT Workflow Generator - Node-RED MCP Agent Starting")
    print("This agent generates Node-RED workflows based on automation descriptions.\n")
    
    async with client.session("wot") as wot_session, \
               client.session("node-red") as nr_session:
        
        print("📡 Loading tools from WoT MCP server...")
        wot_tools = await load_mcp_tools(wot_session)
        print(f"✅ Loaded {len(wot_tools)} WoT tools")
        
        print("📡 Loading tools from Node-RED MCP server...")
        nr_tools = await load_mcp_tools(nr_session)
        print(f"✅ Loaded {len(nr_tools)} Node-RED tools")
        
        # Combine all tools
        all_tools = wot_tools + nr_tools
        for tool in all_tools:
            tool.handle_tool_error = True
        
        print("\n📋 Discovering available devices and resources...")
        try:
            resources_result = await wot_session.list_resources()
            if resources_result.resources:
                print(f"Found {len(resources_result.resources)} resources:")
                for resource in resources_result.resources:
                    print(f"  📌 {resource.name} ({resource.uri})")
        except Exception as e:
            print(f"⚠️  Could not list resources: {e}")
        
        print("\n📋 Checking existing Node-RED flows...")
        try:
            # Try to list existing flows
            nr_tools_dict = {tool.name: tool for tool in nr_tools}
            if "get-flows-formatted" in nr_tools_dict:
                existing_flows = nr_tools_dict["get-flows-formatted"]
                # We would need to invoke this, but for now just note the tool exists
                print("✅ Node-RED flow management tools available")
        except Exception as e:
            print(f"⚠️  Could not check flows: {e}")
        
        system_prompt = (
            "You are an expert IoT workflow automation agent. "
            "You generate Node-RED workflows to automate smart home tasks. "
            "\n\nYour responsibilities:\n"
            "1. Understand the user's automation request (e.g., 'Blink LEDs when washing machine finishes')\n"
            "2. Design the workflow logic:\n"
            "   - Identify trigger events from available devices\n"
            "   - Map them to actions on other devices\n"
            "3. Create Node-RED flows using the 'create-flow' tool with:\n"
            "   - A clear flow name describing the automation\n"
            "   - Appropriate nodes (inject, function, debug, etc.)\n"
            "   - Proper node connections (wires array)\n"
            "\n\nBe technical and precise when creating flows. Always verify the flow is created successfully.\n"
            "Focus on Node-RED workflow generation, not direct device control."
        )
        
        agent = create_agent(
            model=model,
            tools=all_tools,
            system_prompt=system_prompt,
            checkpointer=InMemorySaver(),
        )
        
        print_section("🚀 Agent Ready for Workflow Generation")
        print("Examples of automation requests:")
        print("  - 'Blink LEDs when washing machine cycle has finished'")
        print("  - 'Turn on the main room light when motion is detected'")
        print("  - 'When doorbell is pressed, reduce speaker volume and alert homeowner'")
        print("  - 'Trigger an alert when temperature exceeds 25°C'")
        print("\nType 'bye' to exit, 'flows' to see current flows, 'help' for more info.\n")
        
        try:
            while True:
                user_input = await asyncio.to_thread(input, "You: ")
                
                if user_input.lower() == "bye":
                    print("\n👋 Goodbye!")
                    break
                
                if user_input.lower() == "help":
                    print_section("Help")
                    print("This agent generates Node-RED workflows for home automation.")
                    print("\nCommands:")
                    print("  'flows'    - Show current Node-RED flows")
                    print("  'help'     - Show this help message")
                    print("  'bye'      - Exit the agent")
                    print("\nAutomation Requests:")
                    print("Describe what you want to automate in natural language.")
                    print("Example: 'When the doorbell rings, turn on the entrance lights'")
                    print()
                    continue
                
                if user_input.lower() == "flows":
                    try:
                        # List existing flows
                        nr_tools_dict = {tool.name: tool for tool in nr_tools}
                        if "get-flows-formatted" in nr_tools_dict:
                            print("\n📋 Calling get-flows-formatted...\n")
                            response = await agent.ainvoke(
                                {"messages": [{"role": "user", "content": "Show me all current Node-RED flows using the get-flows-formatted tool"}]},
                                {"configurable": {"thread_id": "flows_list"}}
                            )
                            
                            if "messages" in response:
                                messages = response["messages"]
                                if messages:
                                    last_msg = messages[-1]
                                    if isinstance(last_msg, AIMessage) and last_msg.content:
                                        if isinstance(last_msg.content, list):
                                            for part in last_msg.content:
                                                if isinstance(part, dict) and part.get("type") == "text":
                                                    print(part.get('text', '').strip())
                                        else:
                                            print(last_msg.content)
                        print()
                    except Exception as e:
                        print(f"❌ Error: {e}\n")
                    continue
                
                if not user_input.strip():
                    continue
                
                # Process automation request
                try:
                    print("\n🔄 Generating Node-RED workflow...\n")
                    
                    workflow_prompt = f"""
The user wants to automate the following in their smart home:
"{user_input}"

Please:
1. Analyze the automation requirement
2. Design a Node-RED workflow that implements this automation
3. Create the flow using the 'create-flow' tool with:
   - label: A descriptive name for the automation
   - nodes: An array of Node-RED node objects with proper configuration
4. Explain what the workflow does and how it works

Make sure the workflow is complete and properly connected with wires.
Use common Node-RED node types like: inject, function, switch, debug, etc.
"""
                    
                    response = await agent.ainvoke(
                        {"messages": [{"role": "user", "content": workflow_prompt}]},
                        {"configurable": {"thread_id": "workflow_gen"}}
                    )
                    
                    if "messages" in response:
                        messages = response["messages"]
                        if messages:
                            last_msg = messages[-1]
                            if isinstance(last_msg, AIMessage) and last_msg.content:
                                if isinstance(last_msg.content, list):
                                    for part in last_msg.content:
                                        if isinstance(part, dict) and part.get("type") == "text":
                                            output = part.get('text', '').strip()
                                            if output:
                                                print(f"🤖 {output}")
                                else:
                                    print(f"🤖 {last_msg.content}")
                    print()
                    
                except Exception as e:
                    print(f"❌ Error: {e}\n")
        
        except KeyboardInterrupt:
            print("\n\n👋 Agent stopped by user")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass