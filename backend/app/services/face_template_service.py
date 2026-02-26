import cv2
import os
import numpy as np

FACES_DIR = "faces"
TEMPLATE_DIR = "face_templates"

os.makedirs(TEMPLATE_DIR, exist_ok=True)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

def create_face_template(roll_number: str):
    user_dir = os.path.join(FACES_DIR, roll_number)

    if not os.path.exists(user_dir):
        raise Exception("No face images found")

    recognizer = cv2.face.LBPHFaceRecognizer_create()

    faces = []
    labels = []

    label = 0

    for file in os.listdir(user_dir):
        img_path = os.path.join(user_dir, file)
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)

        if img is None:
            continue

        detected = face_cascade.detectMultiScale(img, 1.3, 5)
        for (x, y, w, h) in detected:
            face = img[y:y+h, x:x+w]
            face = cv2.resize(face, (200, 200))
            faces.append(face)
            labels.append(label)

    if not faces:
        raise Exception("No valid faces detected")

    recognizer.train(faces, np.array(labels))

    model_path = os.path.join(TEMPLATE_DIR, f"{roll_number}.yml")
    recognizer.save(model_path)

    return model_path
