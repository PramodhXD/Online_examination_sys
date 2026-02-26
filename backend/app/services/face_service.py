import os
import base64
import uuid

BASE_DIR = "faces"

def save_face_images(roll_number: str, images: list[str]):
    user_dir = os.path.join(BASE_DIR, roll_number)

    os.makedirs(user_dir, exist_ok=True)

    saved_files = []

    for img in images:
        # Remove base64 header
        img_data = img.split(",")[1]

        file_name = f"{uuid.uuid4()}.png"
        file_path = os.path.join(user_dir, file_name)

        with open(file_path, "wb") as f:
            f.write(base64.b64decode(img_data))

        saved_files.append(file_path)

    return saved_files
