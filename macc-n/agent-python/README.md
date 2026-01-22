# Python WoT-MCP Agent

This example demonstrates how to build an AI agent using Python, LangChain, and the Model Context Protocol (MCP) to control Web of Things devices via the [`wot-mcp`](https://github.com/macc-n/wot-mcp) server. It also shows how to handle real-time events from physical or simulated devices, enabling the agent to react to changes in the environment.

## Prerequisites

- Python 3.10+
- A running instance of [`wot-mcp`](https://github.com/macc-n/wot-mcp).
- A Google Gemini API Key.

## Installation

0. (Optional) Create and activate a Python virtual environment:

   - On Linux/macOS:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

   - On Windows (PowerShell):
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     
     (.venv\Scripts\activate)
     ```

1. Navigate to project directory:
   ```bash
   cd agent-python
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file and add your API key::
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```

## Usage

1. Start the simulated HTTP thermostat device:
   ```bash
   cd ../simulated-devices
   npm install && npm run build
   npm run start:http
   ```

2. Ensure your [`wot-mcp`](https://github.com/macc-n/wot-mcp) server is running in `streamable-http` mode on port `3000` and with the correct config file.

3. Run the agent:
   ```bash
   python3 wot-mcp-agent.py
   ```

4. The agent will connect to the MCP server, discover available tools (representing your WoT devices), and you can interact with it via the console.