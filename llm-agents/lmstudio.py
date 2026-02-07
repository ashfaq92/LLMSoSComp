from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage, HumanMessage

# Initialize LM Studio
model = init_chat_model(
    model="google/gemma-3-1b:2",
    model_provider="openai",
    base_url="http://localhost:1234/v1",
    api_key="not-needed",
    temperature=0.7
)

# Messages as LangChain Message objects
messages = [
    SystemMessage(content="Always answer in rhymes. You are a helpful assistant that loves poetry."),
    HumanMessage(content="What rhymes to orange?")
]

# Use invoke() to get the response
response = model.invoke(messages)

# Extract text
print(response.content)
