from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TaskCreateIn(BaseModel):
    title: str = Field(min_length=1)
    description: Optional[str] = None
    due_at: Optional[str] = None  # ISO string
    remind_at: Optional[str] = None  # ISO string


class TaskUpdateIn(BaseModel):
    completed: Optional[bool] = None
    due_at: Optional[str] = None
    remind_at: Optional[str] = None

