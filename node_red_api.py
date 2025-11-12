import requests
import json


class NodeRedAPI:
    def __init__(self, host="http://localhost", port=1881, token=None, auth=None):
        """
        Node-RED API client for managing flows.

        Args:
            host (str): Node-RED host (default: "http://localhost")
            port (int): Node-RED port (default: 1881)
            token (str): Bearer token for auth (optional)
            auth (tuple): (username, password) for basic auth (optional)
        """
        self.base_url = f"{host}:{port}"
        self.headers = {"Content-Type": "application/json"}
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
        self.auth = auth

    # ---------- FULL DEPLOY ----------
    def deploy_flows(self, flows):
        """
        Deploy a full set of flows (replaces everything!).
        Expects an array of flow objects (tabs + nodes).
        """
        url = f"{self.base_url}/flows"
        r = requests.post(
            url, headers=self.headers, auth=self.auth, data=json.dumps(flows)
        )
        r.raise_for_status()
        
        # Node-RED may return empty response on success
        if r.text:
            return r.json()
        return {"status": "success", "message": "Flows deployed successfully"}


    # ---------- CRUD METHODS ----------

    def create_flow(self, label, nodes):
        """Create a new flow."""
        url = f"{self.base_url}/flow"
        payload = {"label": label, "nodes": nodes}
        r = requests.post(url, headers=self.headers, auth=self.auth, data=json.dumps(payload))
        r.raise_for_status()
        return r.json()

    def read_flows(self):
        """Get all flows."""
        url = f"{self.base_url}/flows"
        r = requests.get(url, headers=self.headers, auth=self.auth)
        r.raise_for_status()
        return r.json()

    def read_flow(self, flow_id):
        """Get a specific flow by ID."""
        url = f"{self.base_url}/flow/{flow_id}"
        r = requests.get(url, headers=self.headers, auth=self.auth)
        r.raise_for_status()
        return r.json()

    def update_flow(self, flow_id, flow):
        """Update an existing flow (pass modified flow dict)."""
        url = f"{self.base_url}/flow/{flow_id}"
        r = requests.put(url, headers=self.headers, auth=self.auth, data=json.dumps(flow))
        r.raise_for_status()
        return r.json()

    def delete_flow(self, flow_id):
        """Delete a flow by ID."""
        url = f"{self.base_url}/flow/{flow_id}"
        r = requests.delete(url, headers=self.headers, auth=self.auth)
        r.raise_for_status()
        return {"status": "deleted", "flow_id": flow_id}


# ---------- Example Usage ----------

if __name__ == "__main__":
    api = NodeRedAPI(port=1881)


    # 1. Create an empty flow (tab)
    tab = api.create_flow("Test Flow", [])
    tab_id = tab["id"]

    # 2. Add nodes into that tab
    nodes = [
        {
            "id": "inject1",
            "type": "inject",
            "z": tab_id,  # must match the flow tab id
            "name": "Inject timestamp",
            "props": [{"p": "payload"}],
            "payload": "",
            "payloadType": "date",
            "x": 100,
            "y": 100,
            "wires": [["debug1"]]
        },
        {
            "id": "debug1",
            "type": "debug",
            "z": tab_id,
            "name": "Debug output",
            "active": True,
            "tosidebar": True,
            "complete": "true",
            "targetType": "msg",
            "x": 300,
            "y": 100,
            "wires": []
        }
    ]

    # 3. Update the flow with nodes
    flow_data = api.read_flow(tab_id)
    flow_data["nodes"] = nodes
    api.update_flow(tab_id, flow_data)

    # 4. Read back
    print(api.read_flow(tab_id))


    # Update
    print("\nUpdating flow...")
    flow_data = api.read_flow(tab_id)
    flow_data["label"] = "Updated Test Flow"
    updated = api.update_flow(tab_id, flow_data)
    print(updated)

    # Delete
    print("\nDeleting flow...")
    deleted = api.delete_flow(tab_id)
    print(deleted)
