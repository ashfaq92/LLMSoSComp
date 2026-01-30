#!/usr/bin/env python3
"""
Simple MCP vs Vanilla Test for Node-RED Workflow Generation
Tests: Blink LEDs when washing machine cycle finishes
"""

import os
import json
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

load_dotenv()
# Your Thing Descriptions
WASHING_MACHINE_TD = {
    "@context": ["https://www.w3.org/2022/wot/td/v1.1", {"@language": "en"}],
    "@type": ["Thing"],
    "title": "WashingMachine",
    "securityDefinitions": {"no_sec": {"scheme": "nosec"}},
    "security": ["no_sec"],
    "events": {
        "finishedCycle": {
            "title": "Wash cycle complete",
            "description": "Sends a notification at the end of a wash cycle",
            "data": {"type": "null"},
            "forms": [{
                "href": "http://localhost:8082/washingmachine/events/finishedCycle",
                "contentType": "application/json",
                "subprotocol": "longpoll",
                "op": ["subscribeevent", "unsubscribeevent"]
            }]
        }
    },
    "id": "urn:uuid:dea28ee1-3a71-4753-a29a-6ae793881c41",
    "description": "A simulated washing machine device"
}

LEDS_TD = {
    "@context": ["https://www.w3.org/2022/wot/td/v1.1", {"@language": "en"}],
    "@type": ["Thing"],
    "title": "LEDs",
    "securityDefinitions": {"no_sec": {"scheme": "nosec"}},
    "security": ["no_sec"],
    "actions": {
        "blink": {
            "title": "Blink LEDs",
            "description": "Blinks the LEDs",
            "forms": [{
                "href": "http://localhost:8083/leds/actions/blink",
                "contentType": "application/json",
                "op": ["invokeaction"],
                "htv:methodName": "POST"
            }],
            "safe": False,
            "idempotent": False
        }
    },
    "id": "urn:uuid:96285863-3bd8-4e4f-acf1-ab3dbbdf5ca9",
    "description": "A simulated LEDs device"
}

TASK = "Create a Node-RED flow that blinks the LEDs when the washing machine finishes its cycle"



def test_vanilla(client):
    """Test vanilla approach - TDs directly in prompt"""
    print("\n" + "="*60)
    print("VANILLA APPROACH (TDs in prompt)")
    print("="*60)
    
    prompt = f"""Create a Node-RED flow configuration in JSON format.

Task: {TASK}

Available devices (Thing Descriptions):

WashingMachine:
{json.dumps(WASHING_MACHINE_TD, indent=2)}

LEDs:
{json.dumps(LEDS_TD, indent=2)}

Requirements:
1. Subscribe to the washing machine's finishedCycle event
2. When the event fires, call the LEDs blink action
3. Use HTTP request nodes with proper endpoints from the TDs
4. Include error handling

Return ONLY the Node-RED flow JSON array. No explanations."""

    response = client.invoke([HumanMessage(content=prompt)])
    
    workflow = response.content.strip()
    
    # Extract JSON if wrapped
    if "```json" in workflow:
        workflow = workflow.split("```json")[1].split("```")[0].strip()
    elif "```" in workflow:
        workflow = workflow.split("```")[1].split("```")[0].strip()
    
    print("\nGenerated workflow:")
    print(workflow[:500] + "..." if len(workflow) > 500 else workflow)
    
    # Save
    with open('workflow_vanilla.json', 'w') as f:
        f.write(workflow)
    print("\nSaved to: workflow_vanilla.json")
    
    return workflow


def test_mcp(client, mcp_url="http://localhost:3000"):
    """Test MCP approach - using MCP server"""
    print("\n" + "="*60)
    print(f"MCP APPROACH (MCP server at {mcp_url})")
    print("="*60)
    
    prompt = f"""Create a Node-RED flow configuration in JSON format.

Task: {TASK}

You have access to an MCP server at {mcp_url} that exposes IoT device Thing Descriptions.
The MCP server has tools for the WashingMachine and LEDs devices.

Requirements:
1. Subscribe to the washing machine's finishedCycle event using HTTP polling
2. When the event fires, call the LEDs blink action via HTTP POST
3. Use HTTP request nodes with proper endpoints
4. Include error handling

Generate a Node-RED flow that accomplishes this task.
Return ONLY the Node-RED flow JSON array. No explanations."""

    response = client.invoke([HumanMessage(content=prompt)])
    
    workflow = response.content.strip()
    
    # Extract JSON if wrapped
    if "```json" in workflow:
        workflow = workflow.split("```json")[1].split("```")[0].strip()
    elif "```" in workflow:
        workflow = workflow.split("```")[1].split("```")[0].strip()
    
    print("\nGenerated workflow:")
    print(workflow[:500] + "..." if len(workflow) > 500 else workflow)
    
    # Save
    with open('workflow_mcp.json', 'w') as f:
        f.write(workflow)
    print("\nSaved to: workflow_mcp.json")
    
    return workflow


def compare_workflows(vanilla, mcp):
    """Simple comparison of the two workflows"""
    print("\n" + "="*60)
    print("COMPARISON")
    print("="*60)
    
    try:
        v_json = json.loads(vanilla)
        v_nodes = len(v_json) if isinstance(v_json, list) else len(v_json.get('nodes', []))
        print(f"\nVanilla: {v_nodes} nodes")
    except:
        print("\nVanilla: Invalid JSON")
        v_nodes = 0
    
    try:
        m_json = json.loads(mcp)
        m_nodes = len(m_json) if isinstance(m_json, list) else len(m_json.get('nodes', []))
        print(f"MCP: {m_nodes} nodes")
    except:
        print("MCP: Invalid JSON")
        m_nodes = 0
    
    print("\nManually review the files to compare:")
    print("- workflow_vanilla.json")
    print("- workflow_mcp.json")
    print("\nCheck for:")
    print("- Correct endpoints from TDs")
    print("- Proper event subscription method")
    print("- Correct action invocation")
    print("- Error handling")


def main():
    api_key = os.getenv('OPENAI_API_KEY')
    llm_version = os.getenv('LLM_VERSION')
    if not api_key:
        print("ERROR: Set OPENAI_API_KEY environment variable")
        return

    # Create the LLM client here, with temperature=0 for deterministic output
    client = ChatOpenAI(openai_api_key=api_key, model=llm_version, temperature=0)

    print("Simple Node-RED Workflow Generation Test")
    print("Task: Blink LEDs when washing machine cycle finishes")
    
    # Test vanilla approach
    vanilla = test_vanilla(client)
    
    # Test MCP approach
    print("\n\nNOTE: MCP approach requires your MCP server running on port 3000")
    print("Make sure it's running: npm start -- --mode streamable-http --port 3000")
    
    choice = input("\nProceed with MCP test? (y/n): ")
    if choice.lower() == 'y':
        mcp = test_mcp(client, "http://localhost:3000")
        compare_workflows(vanilla, mcp)
    else:
        print("\nSkipped MCP test. Only vanilla workflow generated.")


if __name__ == "__main__":
    main()