# Smart Home MCP Client with LangChain - Interactive REPL
import asyncio
from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from langchain_mcp_adapters.tools import load_mcp_tools
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage

# Load environment variables from .env file
load_dotenv()

async def main():
    server_params = StdioServerParameters(
        command="node",
        args=["td2mcp.js"],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()

            # Get tools
            tools = await load_mcp_tools(session)
            
            print(f"\n✓ Loaded {len(tools)} tools from MCP server")

            # Create the agent
            agent = create_agent("openai:gpt-4.1", tools)
            
            print("\n🏠 Smart Home MCP Client - Interactive Mode")
            print("Type 'exit' to quit\n")
            
            # Interactive loop
            while True:
                try:
                    question = input("You: ").strip()
                    
                    if question.lower() == 'exit':
                        print("Goodbye!")
                        break
                    
                    if not question:
                        continue
                    
                    # Run the agent with HumanMessage to trigger tool use
                    agent_response = await agent.ainvoke({"messages": [HumanMessage(content=question)]})
                    
                    # Extract and print the final message
                    messages = agent_response.get("messages", [])
                    if messages:
                        final_message = messages[-1].content
                        print(f"\nAgent: {final_message}\n")
                
                except EOFError:
                    break
                except Exception as e:
                    print(f"Error: {e}\n")

if __name__ == "__main__":
    asyncio.run(main())
