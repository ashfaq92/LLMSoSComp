import json
from node_red_api import NodeRedAPI

smart_home_workflow = None
with open('smart_home_test_workflow.json') as f:
    smart_home_workflow = json.load(f)



api = NodeRedAPI(port=1881)

result = api.deploy_flows(smart_home_workflow)
print("Deployment result:", result)