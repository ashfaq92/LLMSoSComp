import asyncio
import sys
from typing import Any, Dict, Type, List
import mcp.types as types
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import AIMessage
from langchain_ollama import ChatOllama


load_dotenv()

MCP_SERVER_URL = "http://localhost:3000/mcp"
    

model = ChatOllama(
    model="qwen2.5:7b",  # name of the model in Ollama
    temperature=0,
)

class EventBuffer:
    """Simple buffer to track recent events."""
    def __init__(self, max_events=100):
        self.events: List[Dict] = []
        self.max_events = max_events
        self.last_processed = 0
    
    def add_event(self, event_uri: str, event_name: str):
        """Add an event to the buffer."""
        self.events.append({
            "uri": event_uri,
            "name": event_name,
            "timestamp": asyncio.get_event_loop().time()
        })
        if len(self.events) > self.max_events:
            self.events.pop(0)
    
    def get_new_events(self) -> List[Dict]:
        """Get events that haven't been processed yet."""
        new_events = self.events[self.last_processed:]
        if new_events:
            self.last_processed = len(self.events)
        return new_events

def print_event(message: str):
    """Print event message with proper formatting."""
    # Use carriage return to clear current line and print event
    sys.stdout.write(f"\r{' ' * 100}\r")  # Clear the current input line
    sys.stdout.flush()
    # print(f"🔔 {message}")
    sys.stdout.write("You: ")  # Reprint the prompt
    sys.stdout.flush()

async def main():
    client = MultiServerMCPClient(
        {
            "wot": {
                "transport": "streamable_http",
                "url": MCP_SERVER_URL,
            }
        }
    )

    print("🏠 IoT Autonomous Agent Starting...")
    async with client.session("wot") as session:
        original_handler = session._message_handler
        event_buffer = EventBuffer()
        event_resources = {}
        automation_rules = []

        async def notification_handler(message):
            """Capture events into buffer."""
            if original_handler:
                await original_handler(message)
            
            try:
                if hasattr(message, 'root'):
                    actual_message = message.root
                else:
                    actual_message = message
                
                if isinstance(actual_message, types.ResourceUpdatedNotification):
                    uri = str(actual_message.params.uri)
                    if "/events/" in uri:
                        resource_name = event_resources.get(uri, uri)
                        event_buffer.add_event(uri, resource_name)
                        # Don't print here - let autonomous_loop handle it
            except Exception as e:
                print(f"Error in notification handler: {e}")

        session._message_handler = notification_handler

        print("📡 Loading tools from MCP server...")
        tools = await load_mcp_tools(session)
        for tool in tools:
            tool.handle_tool_error = True

        print(f"✅ Loaded {len(tools)} tools")

        print("📋 Subscribing to all resources...")
        try:
            resources_result = await session.list_resources()
            if resources_result.resources:
                for resource in resources_result.resources:
                    resource_uri = str(resource.uri)
                    await session.subscribe_resource(resource_uri)
                    
                    if "/events/" in resource_uri:
                        event_resources[resource_uri] = resource.name
                        print(f"  📌 {resource.name}")
        except Exception as e:
            print(f"Error subscribing: {e}")

        system_prompt = (
            "You are an intelligent IoT home automation agent. "
            "You manage smart devices autonomously based on automation rules. "
            "When you detect relevant events, execute the corresponding automations. "
            "Always use available tools to control devices. "
            "Be concise and only report actions taken."
        )
        
        agent = create_agent(
            model=model,
            tools=tools,
            system_prompt=system_prompt,
            checkpointer=InMemorySaver(),
        )

        print("\n🤖 Agent ready!")
        print("Examples of automation rules:")
        print("  - 'Blink LEDs when washing machine cycle has finished'")
        print("  - 'Turn on the main room light when motion is detected in that room'")
        print("  - 'When doorbell is pressed, reduce speaker volume and alert homeowner'")
        print("\nType 'bye' to exit, 'rules' to see automation rules.\n")

        async def autonomous_loop():
            """Agent autonomously checks for new events and executes automations."""
            check_counter = 0
            while True:
                try:
                    await asyncio.sleep(2)
                    
                    new_events = event_buffer.get_new_events()
                    
                    if new_events and automation_rules:
                        check_counter += 1
                        # Print detected events
                        for event in new_events:
                            print_event(f"Event: {event['name']}")
                        
                        events_str = "\n".join(
                            [f"- {event['name']}" for event in new_events]
                        )
                        
                        automation_prompt = f"""The following events just occurred:
                                                {events_str}
                                                Active automation rules:
                                                {chr(10).join([f"- {rule}" for rule in automation_rules])}
                                                Check if any of these events should trigger any automations. Execute them if needed.
                                                Only report what actions you're taking now, not what was done before.
                                                """
                        
                        try:
                            response = await agent.ainvoke(
                                {"messages": [{"role": "user", "content": automation_prompt}]},
                                {"configurable": {"thread_id": f"automation_check_{check_counter}"}}
                            )
                            
                            if "messages" in response:
                                messages = response["messages"]
                                if messages:
                                    last_msg = messages[-1]
                                    if isinstance(last_msg, AIMessage) and last_msg.content:
                                        if isinstance(last_msg.content, list):
                                            for part in last_msg.content:
                                                if isinstance(part, dict) and part.get("type") == "text":
                                                    content = part.get('text', '').strip()
                                                    if content and content.lower() not in ["no actions needed.", "no actions needed"]:
                                                        print_event(f"Action: {content}")
                                        else:
                                            content = last_msg.content.strip()
                                            if content and content.lower() not in ["no actions needed.", "no actions needed"]:
                                                print_event(f"Action: {content}")
                        except Exception as e:
                            print(f"Error in automation loop: {e}")
                    
                except asyncio.CancelledError:
                    break

        loop_task = asyncio.create_task(autonomous_loop())

        try:
            while True:
                user_input = await asyncio.to_thread(input, "You: ")
                
                if user_input.lower() == "bye":
                    print("Goodbye!")
                    break
                
                if user_input.lower() == "rules":
                    if automation_rules:
                        print("\n📋 Active Automation Rules:")
                        for i, rule in enumerate(automation_rules, 1):
                            print(f"  {i}. {rule}")
                        print()
                    else:
                        print("No automation rules defined yet.\n")
                    continue
                
                if not user_input.strip():
                    continue
                
                # Check if this looks like an automation rule
                automation_keywords = ["when ", "if ", "trigger", "whenever", "every time", "automatically"]
                is_automation_rule = any(keyword in user_input.lower() for keyword in automation_keywords)
                
                if is_automation_rule:
                    # Store as automation rule
                    automation_rules.append(user_input)
                    print(f"✅ Automation rule added: {user_input}\n")
                else:
                    # Process as a direct query/command
                    try:
                        response = await agent.ainvoke(
                            {"messages": [{"role": "user", "content": user_input}]},
                            {"configurable": {"thread_id": "user_query"}}
                        )
                        
                        if "messages" in response:
                            messages = response["messages"]
                            if messages:
                                last_msg = messages[-1]
                                if isinstance(last_msg, AIMessage) and last_msg.content:
                                    if isinstance(last_msg.content, list):
                                        for part in last_msg.content:
                                            if isinstance(part, dict) and part.get("type") == "text":
                                                print(f"🤖 {part.get('text', '').strip()}")
                                    else:
                                        print(f"🤖 {last_msg.content}")
                        print()
                    except Exception as e:
                        print(f"❌ Error: {e}\n")
        
        finally:
            loop_task.cancel()
            try:
                await loop_task
            except asyncio.CancelledError:
                pass


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass