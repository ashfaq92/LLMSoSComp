# Code snippets



# System message
Use this with your provider’s structured JSON or “JSON mode”. It assumes your retriever has already fetched only the relevant TDs for the goal (selective RAG). It also lets you pass a map of “protected node IDs”—everything else is allowed to change.


```
You are an expert Node-RED flow synthesizer for the W3C Web of Things (WoT).
Generate a Node-RED flow JSON that uses ONLY the Thingweb WoT nodes
from the package @thingweb/node-red-node-wot:

- wot-subscribe-event
- wot-invoke-action
- wot-read-property
- wot-write-property
- (optionally) "delay", "change", "function", "switch" for glue logic

Rules:
1) Use ONLY affordances that exist in the provided Thing Descriptions (TDs).
2) For each WoT node, set a "thingRef" that contains either:
   { "tdUrl": "<URL>" }   OR   { "tdJson": <inline TD JSON> }
3) For actions/properties/events, set "actionName" / "propertyName" / "eventName" exactly
   as defined in the TD; for "params" follow the TD's input schema (types/units).
4) Do not hardcode protocol details; the WoT nodes will infer bindings from the TD.
5) Wires must form a valid DAG; ensure all referenced node IDs exist.
6) If a list of protectedNodeIds is provided, PRESERVE those nodes unchanged
   (same "id" and same wiring endpoints). Create new nodes for replacements only.
7) Output ONLY a JSON array of nodes (Node-RED v1 flow array).

Return VALID JSON that conforms to the provided JSON Schema for Node-RED flows.

```


# User message (data payload)
```
"goal": "When the doorbell rings, pause the TV, set speaker volume to 20%, announce a visitor, wait 30s, then restore volume and resume TV."
```
# RAG
```
{
  "relevantTDs": [
    { "thingId": "doorbell", "tdUrl": "http://td-registry/doorbell.td.json" },
    { "thingId": "tv",       "tdUrl": "http://td-registry/tv01.td.json" },
    { "thingId": "speaker",  "tdUrl": "http://td-registry/speaker01.td.json" },
    { "thingId": "assistant","tdUrl": "http://td-registry/assistant01.td.json" }
  ],
  "protectedNodeIds": ["evt_1","glue_1","announce_1"],   // optional for bounded-change patches
  "hints": {
    "event": {"thingId": "doorbell", "eventName": "rung"},
    "actions": [
      {"thingId":"tv", "actionName":"pause"},
      {"thingId":"speaker", "actionName":"setVolume", "params":{"volume":20}},
      {"thingId":"assistant", "actionName":"announce", "params":{"text":"Visitor at door"}},
      {"delayMs": 30000},
      {"thingId":"speaker", "actionName":"setVolume", "params":{"volume":"{{flow.prevVolume}}"}},
      {"thingId":"tv", "actionName":"resume"}
    ],
    "stateVars": [
      "flow.prevVolume" // capture original volume before setting it to 20
    ]
  }
}
```

# JSON Schema (subset) for flow validation
Save as schemas/node_red_flow.schema.json. Keep it narrow—only the nodes you let the LLM use. (You can expand over time.)


```
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Node-RED Flow (subset for WoT composition)",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id","type","wires"],
    "properties": {
      "id":   { "type": "string", "pattern": "^[A-Za-z0-9_\\-]{3,}$" },
      "type": { "type": "string", "enum": [
        "wot-subscribe-event", "wot-invoke-action",
        "wot-read-property", "wot-write-property",
        "delay", "change", "function", "switch", "link in", "link out"
      ]},
      "name": { "type": "string" },
      "wires": {
        "type": "array",
        "items": { "type": "array", "items": { "type": "string" } }
      },
      "thingRef": {
        "type": "object",
        "oneOf": [
          { "required": ["tdUrl"], "properties": { "tdUrl": {"type":"string","minLength":1 }}, "additionalProperties": true },
          { "required": ["tdJson"],"properties": { "tdJson":{"type":"object"}}, "additionalProperties": true }
        ]
      },
      "eventName":   { "type": "string" },
      "actionName":  { "type": "string" },
      "propertyName":{ "type": "string" },
      "params":      { "type": "object" },
      "x":           { "type": "integer" },
      "y":           { "type": "integer" }
    },
    "additionalProperties": true
  }
}

```


# Python Flow‑Patcher (validation + bounded‑change deploy)
This script:

- validates the LLM output against the flow schema,
- (optionally) validates affordance params against the TD’s JSON schema,
- computes a small node‑level patch, and
- deploys via Node‑RED Admin API using Deployment‑Type: nodes (or flows).



```
#!/usr/bin/env python3
import os, json, requests, copy
from jsonschema import validate, ValidationError

NR_BASE   = os.getenv("NR_BASE", "http://localhost:1880")
API_TOKEN = os.getenv("NR_TOKEN")  # if admin auth enabled

FLOW_SCHEMA = json.load(open("schemas/node_red_flow.schema.json"))

def _headers(deploy_type="nodes", rev=None):
    h = {
        "Content-Type": "application/json",
        "Node-RED-Deployment-Type": deploy_type
    }
    if API_TOKEN:
        h["Authorization"] = f"Bearer {API_TOKEN}"
    return h

def get_current_flows_v2():
    r = requests.get(f"{NR_BASE}/flows", headers=_headers())
    r.raise_for_status()
    return r.json()   # {"rev": "...","flows":[...]}  (API v2)

def validate_flow(flow_nodes):
    try:
        validate(instance=flow_nodes, schema=FLOW_SCHEMA)
        return True, None
    except ValidationError as e:
        return False, f"Flow JSON validation failed: {e.message} @ path {list(e.path)}"

def index_by_id(nodes):
    return {n["id"]: n for n in nodes}

def minimal_patch(cur_flows, new_nodes, protected_ids=None):
    """
    Compute a minimal patch at node granularity:
      - keep all current nodes unless:
         * same id appears in new_nodes (replace), or
         * id is not protected and belongs to the impacted subflow we’re updating
      - add all new_nodes that are new or replacing
    If you want stricter control, pass explicit impacted ids to remove.
    """
    protected_ids = set(protected_ids or [])
    cur = copy.deepcopy(cur_flows["flows"])
    cur_idx = index_by_id(cur)
    new_idx = index_by_id(new_nodes)

    # Decide replacement set = ids that appear in new flow OR explicitly not protected
    replace_ids = set(new_idx.keys())

    # Filter out nodes to be replaced (but always keep protected)
    kept = [n for n in cur if (n["id"] not in replace_ids)]

    # Add/replace with new nodes
    patched = kept + new_nodes
    return {"rev": cur_flows.get("rev"), "flows": patched}

def deploy_patch(patch_obj, deploy_type="nodes"):
    r = requests.post(f"{NR_BASE}/flows",
                      headers=_headers(deploy_type=deploy_type),
                      json=patch_obj)
    # 200 v2 -> returns new rev
    if r.status_code not in (200, 204):
        raise RuntimeError(f"Deploy failed: {r.status_code} {r.text}")
    return r.json() if r.status_code == 200 else {}

def main():
    # 1) Load candidate nodes produced by LLM (JSON array)
    candidate = json.load(open("out/flow_candidate.json"))

    # 2) Validate flow structure
    ok, err = validate_flow(candidate)
    if not ok:
        raise SystemExit(err)

    # 3) (Optional) Validate each WoT node’s params against its TD schema
    #    (Pseudo: fetch tdUrl / tdJson and check the input schema for actionName/propertyName)
    #    validate_wot_params(candidate)  # implement later with TD parsing

    # 4) Compute minimal patch and deploy
    cur = get_current_flows_v2()
    protected = json.load(open("out/protected_ids.json")) if os.path.exists("out/protected_ids.json") else []
    patch = minimal_patch(cur, candidate, protected_ids=protected)

    result = deploy_patch(patch, deploy_type="nodes")  # or "flows"
    print("Deployed. New rev:", result.get("rev"))

if __name__ == "__main__":
    main()

```




# Expected Output from LLM


## WoT-first composition

> If a better Speaker02 joins (new TD URL), Holon Watcher marks only `setvol_1` and `restore_1` as impacted. Re‑plan just those nodes (keep their IDs, change the `thingRef.tdUrl`), then deploy with Deployment‑Type: nodes—only those two nodes restart.



```
[
  {
    "id": "tab_visitor",
    "type": "tab",
    "label": "Visitor Workflow",
    "disabled": false,
    "info": ""
  },

  {
    "id": "evt_1",
    "type": "subscribe-event",
    "z": "tab_visitor",
    "name": "Doorbell.rung",
    "topic": "",
    "thing": "",
    "event": "",
    "x": 140,
    "y": 120,
    "wires": [["tv_pause"]]
  },

  {
    "id": "tv_pause",
    "type": "invoke-action",
    "z": "tab_visitor",
    "name": "TV.pause",
    "topic": "",
    "thing": "",
    "action": "",
    "uriVariables": "",
    "x": 340,
    "y": 120,
    "wires": [["spk_get_vol"]]
  },

  {
    "id": "spk_get_vol",
    "type": "read-property",
    "z": "tab_visitor",
    "name": "Speaker.getVolume",
    "topic": "",
    "thing": "",
    "property": "",
    "uriVariables": "",
    "observe": false,
    "x": 540,
    "y": 120,
    "wires": [["store_prev"]]
  },

  {
    "id": "store_prev",
    "type": "change",
    "z": "tab_visitor",
    "name": "store prev volume",
    "rules": [
      { "t": "set", "p": "prevVolume", "pt": "flow", "to": "payload", "tot": "msg" }
    ],
    "x": 760,
    "y": 120,
    "wires": [["payload_20"]]
  },

  {
    "id": "payload_20",
    "type": "function",
    "z": "tab_visitor",
    "name": "payload {volume:20}",
    "func": "msg.payload = { volume: 20 };\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "x": 980,
    "y": 120,
    "wires": [["spk_set_20"]]
  },

  {
    "id": "spk_set_20",
    "type": "invoke-action",
    "z": "tab_visitor",
    "name": "Speaker.setVolume(20)",
    "topic": "",
    "thing": "",
    "action": "",
    "uriVariables": "",
    "x": 1200,
    "y": 120,
    "wires": [["payload_announce"]]
  },

  {
    "id": "payload_announce",
    "type": "function",
    "z": "tab_visitor",
    "name": "payload {text:\"Visitor at the door\"}",
    "func": "msg.payload = { text: \"Visitor at the door\" };\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "x": 1470,
    "y": 120,
    "wires": [["assistant_say"]]
  },

  {
    "id": "assistant_say",
    "type": "invoke-action",
    "z": "tab_visitor",
    "name": "Assistant.announce",
    "topic": "",
    "thing": "",
    "action": "",
    "uriVariables": "",
    "x": 1730,
    "y": 120,
    "wires": [["delay_30s"]]
  },

  {
    "id": "delay_30s",
    "type": "delay",
    "z": "tab_visitor",
    "name": "wait 30s",
    "pauseType": "delay",
    "timeout": "30",
    "timeoutUnits": "seconds",
    "rate": "1",
    "nbRateUnits": "1",
    "rateUnits": "second",
    "randomFirst": "1",
    "randomLast": "5",
    "randomUnits": "seconds",
    "drop": false,
    "x": 1950,
    "y": 120,
    "wires": [["payload_restore"]]
  },

  {
    "id": "payload_restore",
    "type": "function",
    "z": "tab_visitor",
    "name": "payload {volume: prev}",
    "func": "const v = flow.get('prevVolume');\nmsg.payload = { volume: v };\nreturn msg;",
    "outputs": 1,
    "noerr": 0,
    "x": 2170,
    "y": 120,
    "wires": [["spk_restore"]]
  },

  {
    "id": "spk_restore",
    "type": "invoke-action",
    "z": "tab_visitor",
    "name": "Speaker.setVolume(prev)",
    "topic": "",
    "thing": "",
    "action": "",
    "uriVariables": "",
    "x": 2410,
    "y": 120,
    "wires": [["tv_resume"]]
  },

  {
    "id": "tv_resume",
    "type": "invoke-action",
    "z": "tab_visitor",
    "name": "TV.resume",
    "topic": "",
    "thing": "",
    "action": "",
    "uriVariables": "",
    "x": 2620,
    "y": 120,
    "wires": [[]]
  }
]

```
## Warburton et al. style workflow
Below is an **illustrative** fragment for your scenario (node type strings are indicative of their “system‑*” concept from the paper; exact strings can differ across codebases). Notice how payloads must be assembled manually:

```
[
  {
    "id": "evt_1",
    "type": "system-event",
    "name": "Doorbell.rung",
    "thing": "doorbell",
    "event": "rung",
    "wires": [["tv_pause"]]
  },
  {
    "id": "tv_pause",
    "type": "system-action",
    "name": "TV.pause",
    "thing": "tv01",
    "action": "pause",
    "wires": [["get_vol"]]
  },
  {
    "id": "get_vol",
    "type": "system-property",
    "name": "Speaker.volume (read)",
    "thing": "speaker01",
    "property": "volume",
    "mode": "read",
    "wires": [["store_1"]]
  },
  {
    "id": "store_1",
    "type": "change",
    "name": "flow.prevVolume = msg.payload",
    "rules": [
      { "t": "set", "p": "flow.prevVolume", "pt": "flow", "to": "payload", "tot": "msg" }
    ],
    "wires": [["payload_20"]]
  },
  {
    "id": "payload_20",
    "type": "change",
    "name": "msg.payload = {\"volume\":20}",
    "rules": [
      { "t": "set", "p": "payload", "pt": "msg", "to": "{\"volume\":20}", "tot": "json" }
    ],
    "wires": [["spk_set"]]
  },
  {
    "id": "spk_set",
    "type": "system-action",
    "name": "Speaker.setVolume",
    "thing": "speaker01",
    "action": "setVolume",
    "wires": [["payload_announce"]]
  },
  {
    "id": "payload_announce",
    "type": "change",
    "name": "msg.payload = {\"text\":\"Visitor at the door\"}",
    "rules": [
      { "t": "set", "p": "payload", "pt": "msg", "to": "{\"text\":\"Visitor at the door\"}", "tot": "json" }
    ],
    "wires": [["assistant_say"]]
  },
  {
    "id": "assistant_say",
    "type": "system-action",
    "name": "Assistant.announce",
    "thing": "assistant01",
    "action": "announce",
    "wires": [["delay_30"]]
  },
  {
    "id": "delay_30",
    "type": "delay",
    "name": "wait 30s",
    "pauseType": "delay",
    "timeout": "30",
    "timeoutUnits": "seconds",
    "wires": [["payload_restore"]]
  },
  {
    "id": "payload_restore",
    "type": "function",
    "name": "msg.payload = {volume: flow.prevVolume}",
    "func": "msg.payload = { volume: flow.get('prevVolume') }; return msg;",
    "wires": [["spk_restore"]]
  },
  {
    "id": "spk_restore",
    "type": "system-action",
    "name": "Speaker.setVolume",
    "thing": "speaker01",
    "action": "setVolume",
    "wires": [["tv_resume"]]
  },
  {
    "id": "tv_resume",
    "type": "system-action",
    "name": "TV.resume",
    "thing": "tv01",
    "action": "resume",
    "wires": []
  }
]

```




# Param-shape validation from TDs
You can add a check that each wot-invoke-action.params or wot-write-property.value matches the JSON Schema declared in the TD (under the affordance’s input/schema). The WoT TD spec ships validation artifacts (JSON‑Schema & SHACL) in the official.

Sketch:


```
def validate_wot_params(flow_nodes):
    for n in flow_nodes:
        if n["type"] == "wot-invoke-action":
            td = fetch_td(n["thingRef"])   # resolve tdUrl or tdJson
            schema = find_action_input_schema(td, n["actionName"])
            if schema:
                jsonschema.validate(n.get("params", {}), schema)
        # similarly for write-property, read-property (outputs), subscribe-event (event data)
```




# Auto‑discover and feed TDs
For plug‑and‑play onboarding, add a separate Node‑RED tab with node-red-contrib-wot-discovery:

- wot-discovery (CoAP multicast / MQTT “wot/td” topics) → store or POST TDs to your registry,
- wot-fetch to pull TDs by URL,
- then your Orchestrator subscribes to “new TD” events and triggers selective retrieval → re‑plan.




# Call LLM with structured output + validate
```
from jsonschema import validate, ValidationError
from pydantic import BaseModel, Field
from typing import List, Literal
import requests, json

# 1) Pydantic model defines your JSON contract for generation
class NRNode(BaseModel):
    id: str
    type: Literal["inject","change","function","switch","http request",
                  "system-event","system-action","system-property"]
    name: str = ""
    wires: List[List[str]] = Field(default_factory=list)
    thing: str | None = None
    affordanceType: Literal["event","action","property"] | None = None
    affordanceName: str | None = None
    func: str | None = None
    set: list | None = None
    url: str | None = None
    method: Literal["GET","POST"] | None = None
    x: int | None = None
    y: int | None = None

Flow = List[NRNode]

# 2) Prepare schema for runtime validation
FLOW_SCHEMA = json.loads(open("node_red_flow.schema.json").read())

# 3) Retrieval: get only relevant TDs (omitted: vector search)
relevant_tds = [...]  # list of TD dicts

# 4) Prompt + structured output (pseudo: depends on provider)
system = "You generate Node-RED flows. Use only affordances from TDs. Preserve IDs if provided."
user = {
  "goal": "When the doorbell rings, pause TV and set speaker volume to 20%, then restore after 30s.",
  "tds": relevant_tds
}

# PSEUDO: provider with schema/JSON mode
flow_json = llm.generate_json(
    system=system,
    user=json.dumps(user),
    json_schema=FLOW_SCHEMA      # enforce structure
)

# 5) Validate and auto-repair if needed
def validate_or_repair(flow):
    try:
        validate(instance=flow, schema=FLOW_SCHEMA)
        return flow
    except ValidationError as e:
        # Minimal repair prompt with the error
        repair_tip = f"Validation error at {list(e.path)}: {e.message}"
        flow_fixed = llm.repair_json(flow, hint=repair_tip, schema=FLOW_SCHEMA)
        validate(instance=flow_fixed, schema=FLOW_SCHEMA)  # raise if still bad
        return flow_fixed

flow = validate_or_repair(flow_json)
```

# Deploy (or patch) to Node-RED via REST
```
NR_URL = "http://localhost:1880"
# Get current flows
cur = requests.get(f"{NR_URL}/flows").json()

# Strategy: replace/patch only affected nodes (bounded change)
def patch_flows(cur_flows, new_subflow_nodes):
    # Remove nodes by id and append new ones
    ids_to_replace = {n["id"] for n in new_subflow_nodes}
    kept = [n for n in cur_flows if n["id"] not in ids_to_replace]
    return kept + new_subflow_nodes

patched = patch_flows(cur, flow)

# Deploy (atomic)
resp = requests.post(f"{NR_URL}/flows", json=patched)
resp.raise_for_status()
```
Bounded‑change = compute the minimal edit set between current and candidate flows (by IDs + topology). You can instruct the LLM to preserve IDs for nodes that should remain, and only introduce new IDs for replacements. Then your patch is just (remove replaced IDs + add new nodes).

# Validate TDs (SHACL) + index for retrieval

```
from pyshacl import validate as shacl_validate
from rdflib import Graph

def validate_td_jsonld(td_jsonld: dict) -> None:
    g = Graph().parse(data=json.dumps(td_jsonld), format="json-ld")
    # Load WoT TD shapes + custom shapes
    shapes = Graph().parse("wot-td-shapes.ttl", format="turtle")
    conforms, report_graph, report_text = shacl_validate(
        data_graph=g, shacl_graph=shapes, inference='rdfs', advanced=True)
    if not conforms:
        raise ValueError(report_text)
```