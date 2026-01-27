import json
import uuid

def generate_node_id():
    return str(uuid.uuid4()).replace('-', '')[:8]

def sd_to_nodered_flow(sd):
    # Assumes SD orchestration as per previous example
    orchestration = sd["system"]["orchestrations"][0]
    trigger = orchestration["trigger"]
    action = orchestration["actions"][0]

    # Node-RED node IDs
    event_id = generate_node_id()
    action_id = generate_node_id()

    # Event node (simulate with inject for demo; in real use, use MQTT or HTTP-in)
    event_node = {
        "id": event_id,
        "type": "inject",
        "name": f"{trigger['thing']} {trigger['event']} event",
        "props": [{"p": "payload"}],
        "repeat": "",
        "crontab": "",
        "once": True,
        "onceDelay": 0.1,
        "topic": "",
        "payload": True,  # Simulated event
        "payloadType": "bool",
        "wires": [[action_id]]
    }

    # Action node (replace with real device node in production)
    action_node = {
        "id": action_id,
        "type": "debug",
        "name": f"{action['action']} {action['thing']}",
        "active": True,
        "tosidebar": True,
        "console": False,
        "tostatus": False,
        "complete": "true",
        "wires": []
    }

    return [event_node, action_node]

if __name__ == "__main__":
    # Example SD input
    sd = {
        "system": {
            "things": [
                {"name": "mainRoomLight", "td": "https://example.com/tds/mainRoomLight.json"},
                {"name": "motionSensor", "td": "https://example.com/tds/motionSensor.json"}
            ],
            "orchestrations": [
                {
                    "name": "TurnOnLightOnMotion",
                    "trigger": {
                        "thing": "motionSensor",
                        "event": "motionDetected"
                    },
                    "actions": [
                        {
                            "thing": "mainRoomLight",
                            "action": "turnOn"
                        }
                    ]
                }
            ]
        }
    }
    flow = sd_to_nodered_flow(sd)
    print(json.dumps(flow, indent=2))