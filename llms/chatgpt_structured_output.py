from openai import OpenAI
from pydantic import BaseModel, Field
from typing import Literal, Dict, Any
import os, json
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 1️⃣ Define the structured data model
class PirateCharacter(BaseModel):
    name: str
    role: Literal["Captain", "First Mate", "Navigator", "Gunner", "Quartermaster"]
    ship: str
    personality: str
    bounty: int
    extras: Dict[str, Any] = Field(
        default_factory=dict,
        description="Optional extra creative details like pet, favorite rum, or weapon"
    )


# 2️⃣ Create client
client = OpenAI()

schema = PirateCharacter.model_json_schema()
schema["additionalProperties"] = True  # force it

# 3️⃣ Generate structured completion
response = client.chat.completions.create(
    model="gpt-4.1",
    messages=[
        {
            "role": "user",
            "content": (
                "Invent a fictional Pirates of the Caribbean character. "
                "Feel free to include any extra creative attributes beyond the basic ones "
                "(like favorite rum, signature weapon, or pet)."
            ),
        }
    ],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "pirate_character",  # ✅ required
            "schema": schema,  # ✅ correct field name
        },
    },
)

# 4️⃣ Parse model output back into Python object
pirate = PirateCharacter.model_validate_json(response.choices[0].message.content)
print(pirate)
