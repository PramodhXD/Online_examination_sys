import os
import smtplib
from email.message import EmailMessage

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_FROM = os.getenv("SMTP_FROM")


def send_otp_email(to_email: str, otp: str):
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM]):
        raise Exception("SMTP environment variables not configured")

    msg = EmailMessage()
    msg["Subject"] = "Password Reset OTP"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    msg.set_content(f"""
Your OTP for password reset is: {otp}

This OTP is valid for 10 minutes.
If you did not request this, please ignore this email.
""")

    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    server.starttls()
    server.login(SMTP_USER, SMTP_PASS)
    server.send_message(msg)
    server.quit()
