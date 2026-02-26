import cv2
import base64
import numpy as np
import os

TEMPLATE_DIR = "face_templates"

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

def verify_face(roll_number: str, base64_image: str) -> bool:
    model_path = os.path.join(TEMPLATE_DIR, f"{roll_number}.yml")

    if not os.path.exists(model_path):
        raise Exception("Face model not found")

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.read(model_path)

    img_bytes = base64.b64decode(base64_image)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE)

    if img is None:
        raise Exception("Invalid image")

    faces = face_cascade.detectMultiScale(img, 1.3, 5)
    if len(faces) == 0:
        return False

    x, y, w, h = faces[0]
    face = img[y:y+h, x:x+w]
    face = cv2.resize(face, (200, 200))

    label, confidence = recognizer.predict(face)

    # 🔥 Lower confidence = better match
    return confidence < 70
