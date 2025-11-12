from pydantic import BaseModel, Field
from typing import Any, List

class NodeGeneric(BaseModel):
    id: str
    type: str
    z: str | None = None
    name: str | None = None
    wires: List[List[str]] = Field(default_factory=list)
    x: int | None = None
    y: int | None = None
    # Allow any other Node-RED specific fields dynamically
    extra: dict[str, Any] = Field(default_factory=dict)

    class Config:
        extra = "allow"  # Ignore/allow arbitrary extra fields


class Flow(BaseModel):
    nodes: List[NodeGeneric]
