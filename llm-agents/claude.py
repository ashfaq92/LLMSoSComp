import os
import sys
import asyncio
import json
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, AIMessage
import utils

# Add parent directory to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

load_dotenv()

# Configuration
VERBOSE = True
NODE_RED_URL = os.getenv("NODE_RED_URL", "http://localhost:1880")
WOT_MCP_SERVER_URL = os.getenv("WOT_MCP_SERVER_URL", "http://localhost:3000/mcp")

# Create Anthropic chat client
client = ChatAnthropic(
    model=utils.LLM_VERSION,
    temperature=utils.LLM_TEMPERATURE,
    max_tokens=utils.MAX_TOKENS,
)

class NodeRedWorkflowGenerator:
    """Generate Node-RED workflows using Claude and MCP"""
    
    def __init__(self, node_red_url=NODE_RED_URL):
        self.node_red_url = node_red_url
        self.client = client
        
    def create_simple_flow(self, flow_name: str, description: str) -> dict:
        """Create a simple Node-RED flow using Claude"""
        
        prompt = f"""Create a Node-RED flow definition in JSON format for the following:
        
Flow Name: {flow_name}
Description: {description}

Return a valid Node-RED flow JSON with:
- A flow object with id, label
- At least 2-3 nodes (inject, processing, output)
- Proper connections between nodes
- Do NOT include wires array structure, just the basic node definitions

Example structure:
{{
  "id": "flow_id",
  "label": "Flow Name",
  "nodes": [
    {{"id": "node1", "type": "inject", "name": "Input", ...}},
    {{"id": "node2", "type": "debug", "name": "Output", ...}}
  ]
}}

Return ONLY valid JSON, no markdown formatting."""

        if VERBOSE:
            print(f"\n📝 Generating flow: {flow_name}")
            print(f"   Description: {description}")
        
        try:
            response = self.client.invoke(prompt)
            response_text = response.content
            
            # Clean response (remove markdown code blocks if present)
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            flow_json = json.loads(response_text.strip())
            
            if VERBOSE:
                print(f"✓ Flow generated successfully")
                print(f"  Flow ID: {flow_json.get('id')}")
                print(f"  Nodes: {len(flow_json.get('nodes', []))}")
            
            return flow_json
        
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse flow JSON: {e}")
            print(f"   Response: {response_text[:200]}")
            return None
        except Exception as e:
            print(f"❌ Error generating flow: {e}")
            return None
    
    def describe_workflow(self, workflow_description: str) -> str:
        """Get Claude's recommendations for a Node-RED workflow"""
        
        prompt = f"""You are a Node-RED workflow expert. A user wants to create the following workflow:

{workflow_description}

Provide:
1. Step-by-step workflow design
2. Recommended Node-RED nodes and their purposes
3. Data flow between nodes
4. Any scheduling or triggering strategy
5. Error handling considerations

Be concise but thorough."""

        if VERBOSE:
            print(f"\n🔍 Analyzing workflow requirements...")
        
        try:
            response = self.client.invoke(prompt)
            result = response.content
            
            if VERBOSE:
                print(f"✓ Workflow analysis complete")
            
            return result
        
        except Exception as e:
            print(f"❌ Error analyzing workflow: {e}")
            return None

async def demonstrate_mcp_integration():
    """Demonstrate MCP integration (requires MCP server running)"""
    
    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient
        from langchain_mcp_adapters.tools import load_mcp_tools
        
        print("\n🔌 Attempting to connect to MCP servers...")
        
        mcp_client = MultiServerMCPClient({
            "wot": {
                "transport": "streamable_http",
                "url": WOT_MCP_SERVER_URL,
            }
        })
        
        async with mcp_client.session("wot") as session:
            tools = await load_mcp_tools(session)
            print(f"✓ Connected! Loaded {len(tools)} tools from WoT MCP")
            
            # List available tools
            for tool in tools[:5]:  # Show first 5
                print(f"   - {tool.name}")
            if len(tools) > 5:
                print(f"   ... and {len(tools) - 5} more tools")
            
            return True
    
    except Exception as e:
        print(f"⚠️  MCP integration not available: {str(e)[:100]}")
        print("   (This is optional - MCP server may not be running)")
        return False

def main():
    """Main execution"""
    
    print("=" * 60)
    print("🤖 Claude + Node-RED Workflow Generator")
    print("=" * 60)
    
    # Test basic Claude connection
    print("\n✓ Claude client initialized")
    print(f"  Model: {utils.LLM_VERSION}")
    print(f"  Temperature: {utils.LLM_TEMPERATURE}")
    print(f"  Max tokens: {utils.MAX_TOKENS}")
    
    # Initialize workflow generator
    generator = NodeRedWorkflowGenerator()
    
    # Example 1: Describe a workflow
    print("\n" + "=" * 60)
    print("1️⃣  Workflow Analysis")
    print("=" * 60)
    
    workflow_desc = "Monitor room temperature every 5 minutes via MQTT and trigger an alarm if it exceeds 30°C"
    analysis = generator.describe_workflow(workflow_desc)
    if analysis:
        print(analysis)
    
    # Example 2: Generate a flow definition
    print("\n" + "=" * 60)
    print("2️⃣  Generate Flow JSON")
    print("=" * 60)
    
    flow = generator.create_simple_flow(
        "Temperature Monitor",
        "Monitor room temperature and send alerts"
    )
    
    if flow:
        print(json.dumps(flow, indent=2))
    
    # Example 3: Try MCP integration
    print("\n" + "=" * 60)
    print("3️⃣  MCP Integration")
    print("=" * 60)
    
    try:
        asyncio.run(demonstrate_mcp_integration())
    except Exception as e:
        print(f"⚠️  Could not test async MCP: {e}")
    
    print("\n" + "=" * 60)
    print("✓ Demo complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()