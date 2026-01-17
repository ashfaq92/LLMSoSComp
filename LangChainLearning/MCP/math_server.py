# math_server.py
import nest_asyncio
from mcp.server.fastmcp import FastMCP

# Allow nested event loops in Jupyter
nest_asyncio.apply()

mcp = FastMCP("Math")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.tool()
def multiply(a: int, b: int) -> int:
    """Multiply two numbers"""
    return a * b

if __name__ == "__main__":
    print("Starting Math MCP server with stdio transport...")
    mcp.run(transport="stdio")