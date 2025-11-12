from idlelib.pyshell import use_subprocess

import gradio as gr
import json
import requests

from smart_home import utils
from llms import chatgpt, gemini
from llms.workflow_generator import NodeRedWorkflowGenerator
from node_red_api import NodeRedAPI

# devices_json_str = json.dumps(utils.devices, indent=2)
devices_json_str = json.dumps(utils.smart_home_devices, indent=2)

with open("style.css", "r") as f:
    css = f.read()



def get_tds(devices_json_str_arg):
    try:
        devices_dict = json.loads(devices_json_str_arg)
    except json.JSONDecodeError:
        return "❌ Error: Invalid JSON", "{}"

    tds = []
    for device in devices_dict:
        device_td = device['td']
        resp = requests.get(device_td)
        td = resp.json()
        tds.append(td)
    pretty_tds = json.dumps(tds, indent=2, ensure_ascii=False)
    return "✅ TDs extracted successfully", pretty_tds



def generate_flow(user_prompt, system_prompt, td, llm_choice, use_structured_output):
    # print('SYSTEM PROMPT:\t', context_arg)
    # print('USER PROMPT:\t', goal_arg)
    # print('TD:\t', td)

    nrwg = NodeRedWorkflowGenerator(
        llm_choice=llm_choice,
        use_structured_output=use_structured_output,
        user_prompt=user_prompt,
        system_prompt=system_prompt,
        td=td
    )
    generated_flow = nrwg.generate_workflow()
    status_resp = "Error!"
    if generated_flow:
        print('Generated Flow:', generated_flow)
        status_resp = "✅ Flow generated successfully"


    return status_resp, generated_flow

def deploy_flow(flow_json):
    print('flow to be deployed:', flow_json)

    api = NodeRedAPI(port=8080)
    # 1. Create an empty flow (tab)
    tab = api.create_flow("Test Flow", [])
    tab_id = tab["id"]
    # 3. Update the flow with nodes
    flow_data = api.read_flow(tab_id)
    flow_data["nodes"] = json.loads(flow_json)
    print(flow_data)
    resp =  api.update_flow(tab_id, flow_data)
    return "🚀 Flow deployed to Node-RED successfully!", resp

def clear_fields():
    # Using gr.update is more robust across Gradio versions
    return gr.update(value=""), gr.update(value=""), gr.update(value="")

with gr.Blocks(theme=gr.themes.Soft(), css=css) as demo:
    gr.Markdown("## 🤖 Node-RED Flow Generator & Deployer")
    with gr.Row():
        with gr.Column(scale=1):
            goal = gr.Textbox(
                label="User Goal",
                placeholder="user prompt goal for flow",
                value=utils.SMART_HOME_USER_PROMPT
            )
            context = gr.Textbox(
                label="System Context",
                placeholder="System level instructions (context etc.)",
                value=utils.SMART_HOME_SYSTEM_PROMPT
            )
            devices_list = gr.Textbox(
                label="Devices (JSON)",
                # value=  '[\n  { "name": "KukaController", "td": "http://localhost:9090/kukacontroller" }\n]'
                value=devices_json_str
            )
            clear_btn = gr.Button(value="Clear", variant="huggingface")
            status = gr.Textbox(lines=1, max_lines=1, label="Status", interactive=False)

        with gr.Column(scale=1):
            extract_td_btn = gr.Button(value="Extract TDs", variant="primary")
            td_output = gr.Textbox(show_label=False, lines=15, interactive=True, placeholder="Extracted TDs")
            with gr.Row():
                llm_choice = gr.Radio(
                    choices=["gpt-3.5-turbo", "gpt-4o", "gpt-4.1", "gemini-2.5-flash", "gemini-2.5-pro"],
                    label="LLM",
                    interactive=True,
                    elem_classes="horizontal-label"
                )
                use_structured_output = gr.Checkbox(
                    label="Use Structured Output",
                    value=True,
                    interactive=True,
                    elem_classes="horizontal-label"
                )

            generate_flow_btn = gr.Button(value="Generate Flow", variant="primary")
            flow_output = gr.Textbox(lines=15, interactive=True, show_label=False, placeholder="Generated Flow")
            deploy_btn = gr.Button(value="Deploy to Node-RED", variant="primary")

    extract_td_btn.click(get_tds, inputs=[devices_list], outputs=[status, td_output])
    generate_flow_btn.click(generate_flow, inputs=[goal, context, td_output, llm_choice, use_structured_output], outputs=[status, flow_output])
    deploy_btn.click(deploy_flow, inputs=[flow_output], outputs=[status])
    clear_btn.click(clear_fields, inputs=[], outputs=[goal, context, devices_list])

demo.launch()
