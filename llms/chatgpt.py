import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # loads .env into environment
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def chatgpt_call(model, system_prompt, user_prompt, td, use_structured_output):


    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }

    # Only include response_format if structured_output is True
    if use_structured_output:
        payload["response_format"] = {"type": "json_object"}
    if td:
        payload["messages"].append({"role": "system", "content": system_prompt})

    response = client.chat.completions.create(**payload)
    if response:
        return response.choices[0].message.content
    raise ValueError("invalid response")


if __name__ == "__main__":
    user_prompt = "Tell me about a popular battle royale game."
    system_prompt = "You are a gaming bot. Respond in JSON format."
    model = "gpt-4o"
    response = chatgpt_call(model=model, system_prompt=system_prompt, user_prompt=user_prompt, td=None, use_structured_output= True)
    print(response)