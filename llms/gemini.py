import json

from google import genai
from google.genai import types
from dotenv import load_dotenv
import os
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
import utils

load_dotenv()  # loads .env into environment

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))



def gemini_call(model, system_prompt, user_prompt, td, use_structured_output):

    config_kwargs = {"system_instruction": system_prompt}
    if td:
        config_kwargs["system_instruction"] = td
    if use_structured_output:
        config_kwargs["response_mime_type"] = "application/json"
    # todo: try catch if the model is unavailable
    response = client.models.generate_content(
        model=model,
        contents=user_prompt,
        config=types.GenerateContentConfig(**config_kwargs)
    )
    if response:
        return response.text
    raise ValueError("invalid response")



if __name__ == "__main__":
    user_prompt = "Tell me about a popular battle royale game."
    system_prompt = "You are a gaming bot. Respond in JSON format."
    model = "gemini-2.5-flash"

    response = gemini_call(
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        td=None,
        use_structured_output=True
    )

    print(response)
