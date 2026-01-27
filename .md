# Getting Started

This repository consists of three main components:  
- **smart-home**: IoT device simulators  
- **wot-mcp**: WoT-MCP server  
- **agent-python**: Python agent to control the devices

1. Start the device simulators in `smart-home`  
2. Start the WoT-MCP server in `wot-mcp`  
3. Run the Python agent in `agent-python`  

Follow these steps to run the full system:

---

## 1. Start the Smart Home IoT Devices

```sh
cd smart-home
npm install
npm start
```
This will launch all the device simulators.  
See [smart-home/README.md](smart-home/README.md) for more details.

---

## 2. Start the WoT-MCP Server

Open a new terminal:

```sh
cd wot-mcp
npm install
npm run build      # if required
```
Then start the WoT-MCP server.  
See [wot-mcp/README.md](wot-mcp/README.md) for more details.

---

## 3. Run the Python Agent

Open another terminal:

```sh
cd agent-python
python -m venv venv
venv\Scripts\activate   # On Windows
# or
source venv/bin/activate  # On macOS/Linux

pip install -r requirements.txt

python wot_mcp_agent_simple.py
# or
python wot_mcp_agent_reactive.py
```
See [agent-python/README.md](agent-python/README.md) for more details and options.

---
