from flask import Flask, request
import requests
import os
import random

app = Flask(__name__)

# ================== CONFIG ==================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE = os.environ.get("TWILIO_PHONE_NUMBER")

TELEGRAM_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

# Store OTP temporarily
otp_storage = {}

# ================== TELEGRAM SEND ==================
def send_message(chat_id, text):
    requests.post(TELEGRAM_URL, json={
        "chat_id": chat_id,
        "text": text
    })

# ================== SEND OTP ==================
def send_otp(phone):
    otp = str(random.randint(1000, 9999))
    otp_storage[phone] = otp

    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"

    data = {
        "From": TWILIO_PHONE,
        "To": phone,
        "Body": f"Your OTP is {otp}"
    }

    requests.post(url, data=data, auth=(TWILIO_SID, TWILIO_AUTH))

    return otp

# ================== WEBHOOK ==================
@app.route(f"/{BOT_TOKEN}", methods=["POST"])
def webhook():
    data = request.get_json()

    if data and "message" in data:
        chat_id = data["message"]["chat"]["id"]
        text = data["message"].get("text", "")

        # START COMMAND
        if text == "/start":
            send_message(chat_id, "Welcome!\nSend your phone number like:\n+2519XXXXXXXX")

        # PHONE NUMBER → SEND OTP
        elif text.startswith("+"):
            send_otp(text)
            send_message(chat_id, "OTP sent to your phone. Now send OTP code.")

        # OTP CHECK
        elif text.isdigit():
            found = False
            for phone, code in otp_storage.items():
                if text == code:
                    send_message(chat_id, "✅ OTP Verified! You can now play.")
                    found = True
                    break

            if not found:
                send_message(chat_id, "❌ Wrong OTP. Try again.")

        else:
            send_message(chat_id, "Send /start to begin")

    return "ok", 200

# ================== HOME ==================
@app.route("/")
def home():
    return "Bot is running!"