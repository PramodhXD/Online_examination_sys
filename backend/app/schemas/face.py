from pydantic import BaseModel, EmailStr
from typing import List

class FaceUploadRequest(BaseModel):
    email: EmailStr
    images: List[str]  # base64 images
