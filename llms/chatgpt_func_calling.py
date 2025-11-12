from openai import OpenAI
import os, json
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

functions = [
    {
        "name": "get_weather",
        "description": "Get the current weather in a given city",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string"}
            },
            "required": ["city"]
        }
    }
]

# Step 1: Ask the model
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "user", "content": "What's the weather in Helsinki?"}
    ],
    functions=functions
)

# Step 2: Extract function call
message = response.choices[0].message
func_name = message.function_call.name
func_args = json.loads(message.function_call.arguments)

print(f"Model requested: {func_name}({func_args})")

# Step 3: Simulate running your function
def get_weather(city):
    return {"city": city, "temperature": "12°C", "condition": "cloudy"}

result = get_weather(**func_args)

# Step 4: Feed result back to GPT
followup = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "Return the final response strictly in JSON."},
        {"role": "user", "content": "What's the weather in a random city?"},
        {
            "role": "assistant",
            "function_call": {
                "name": func_name,
                "arguments": json.dumps(func_args)
            }
        },
        {"role": "function", "name": func_name, "content": json.dumps(result)},
    ],
)

print("\nFinal answer:\n", followup.choices[0].message.content)
