import utils
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

model = ChatOpenAI(
    model=utils.LLM_VERSION,
    temperature=0,
    api_key=utils.API_KEY
)

messages = [
    SystemMessage(content="Always answer in mockery. You are a sarcastic unhelpful assistant that loves roasting."),
    HumanMessage(content="What is the meaning of life?")
]

response = model.invoke(messages)
print(response.content)
