import os

# GLOBAL CONFIGURATION FOR LLM AGENTS
LLM_VERSION="gpt-4.1"
# LLM_VERSION="gpt-5-nano"
# LLM_VERSION="claude-sonnet-4-5"
LLM_TEMPERATURE=0




def configure_langsmith_tracing():
    langsmith_api_key = os.getenv("LANGSMITH_API_KEY")
    if langsmith_api_key:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_PROJECT"] = "workflow-generator"
        os.environ["LANGSMITH_API_KEY"] = langsmith_api_key
        print("✓ LangSmith tracing enabled")
    else:
        print("⚠️  LANGSMITH_API_KEY not set - tracing disabled. Add it to .env to enable LangSmith")