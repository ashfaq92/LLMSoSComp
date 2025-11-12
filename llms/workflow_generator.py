from llms.chatgpt import chatgpt_call
from llms.gemini import gemini_call


class NodeRedWorkflowGenerator:
    def __init__(self, llm_choice, use_structured_output=False, user_prompt=None, system_prompt=None, td=None):
        self.llm_choice = llm_choice
        self.use_structured_output = use_structured_output
        self.td = td
        self.user_prompt = user_prompt
        self.system_prompt = system_prompt

    def generate_workflow(self):
        print('Generating Node-RED workflow', 'llm:', self.llm_choice, 'use_structured_output:', self.use_structured_output)
        print('System prompt: \n', self.system_prompt)
        print('User prompt: \n', self.user_prompt)
        print('Thing Data: \n', self.td)

        response = None
        if self.llm_choice in ["gpt-3.5-turbo", "gpt-4o", "gpt-4.1"]:
            response =  chatgpt_call(
                model=self.llm_choice,
                system_prompt=self.system_prompt,
                user_prompt=self.user_prompt,
                td=self.td,
                use_structured_output=self.use_structured_output,
            )
        elif self.llm_choice in ["gemini-2.5-flash", "gemini-2.5-pro"]:
            response = gemini_call(
                model=self.llm_choice,
                system_prompt=self.system_prompt,
                user_prompt=self.user_prompt,
                td=self.td,
                use_structured_output=self.use_structured_output,
            )
        else:
            return "Error! Invalid LLM choice"
        return response





if __name__ == "__main__":
    user_prompt = "Tell me about a popular battle royale game."
    system_prompt = "You are a gaming bot. Respond in JSON format."
    model = "gemini-2.5-pro"

    nrwg = NodeRedWorkflowGenerator(
        llm_choice=model,
        use_structured_output=True,
        user_prompt=user_prompt,
        system_prompt=system_prompt,
        td=None
    )

    response = nrwg.generate_workflow()

    print(response)