from flask import Flask, request
import requests
import os

app = Flask(__name__)

# =============================
# CONFIG (PUT YOUR TOKENS HERE)
# =============================
BOT_TOKEN = os.getenv("BOT_TOKEN")  # Telegram bot token
TWILIO_SID = os.getenv("TWILIO_SID")
TWILIO_AUTH = os.getenv("TWILIO_AUTH")
TWILIO_NUMBER = os.getenv("TWILIO_NUMBER")

# =============================
# TELEGRAM SEND FUNCTION
# =============================
def send_message(chat_id, text):
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    data = {
        "chat_id": chat_id,
        "text": text
    }
    requests.post(url, json=data)

# =============================
# WEBHOOK ROUTE
# =============================
@app.route(f"/{BOT_TOKEN}", methods=["POST"])
def webhook():
    data = request.get_json()

    if "message" in data:
        chat_id = data["message"]["chat"]["id"]
        text = data["message"].get("text", "")

        # COMMANDS
        if text == "/start":
            send_message(chat_id, "Bot is working ✅")

        elif text == "/balance":
            send_message(chat_id, "Your balance is 100 ETB 💰")

        elif text.startswith("/sms"):
            try:
                number = text.split(" ")[1]
                send_sms(number, "Hello from your bot 📲")
                send_message(chat_id, "SMS sent ✅")
            except:
                send_message(chat_id, "Use like: /sms 0912345678")

        else:
            send_message(chat_id, "Unknown command ❌")

    return "ok"

# =============================
# TWILIO SMS FUNCTION
# =============================
def send_sms(to, message):
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"

    data = {
        "From": TWILIO_NUMBER,
        "To": to,
        "Body": message
    }

    requests.post(url, data=data, auth=(TWILIO_SID, TWILIO_AUTH))

# =============================
# ROOT ROUTE (IMPORTANT)
# =============================
@app.route("/")
def home():
    return "Bot is running! 🚀"

# =============================
# RUN APP
# =============================
if __name__ == "__main__":
    app.run()