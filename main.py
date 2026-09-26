import os

from flask import Flask, jsonify

app = Flask(__name__)


def soma(a, b):
    return a + b


@app.get("/")
def hello_world():
    return jsonify({"message": "Hello Azure"})


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        debug=os.getenv("FLASK_DEBUG") == "1",
    )
