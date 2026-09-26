import os
import platform
import socket
import time
from datetime import datetime, timezone

from flask import Flask, jsonify, render_template

APP_NAME = "fiap-devops-gs1"
STARTED_AT = time.time()

# Etapas do Jenkinsfile, na ordem em que levam o código até o Azure.
PIPELINE_STAGES = [
    {"name": "Testes", "detail": "pytest + cobertura"},
    {"name": "SonarQube", "detail": "análise estática"},
    {"name": "Docker build", "detail": "imagem da aplicação"},
    {"name": "Docker Hub", "detail": "push da imagem"},
    {"name": "Azure Web App", "detail": "deploy via zip"},
]

app = Flask(__name__)


def soma(a, b):
    return a + b


def format_uptime(seconds):
    seconds = int(seconds)
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)
    if days:
        return f"{days}d {hours}h {minutes}min"
    if hours:
        return f"{hours}h {minutes}min"
    if minutes:
        return f"{minutes}min {seconds}s"
    return f"{seconds}s"


def build_status():
    version = os.getenv("APP_VERSION", "").strip()
    commit = os.getenv("GIT_COMMIT", "").strip()
    uptime = time.time() - STARTED_AT
    return {
        "app": APP_NAME,
        "message": "Hello Azure",
        "environment": os.getenv("APP_ENV", "local"),
        "version": version or "local",
        "build": f"#{version}" if version.isdigit() else None,
        "commit": commit[:7] if commit else None,
        "host": os.getenv("WEBSITE_HOSTNAME") or socket.gethostname(),
        "platform": "Azure App Service" if os.getenv("WEBSITE_SITE_NAME") else "Docker / local",
        "python": platform.python_version(),
        "started_at": datetime.fromtimestamp(STARTED_AT, timezone.utc).isoformat(timespec="seconds"),
        "uptime_seconds": int(uptime),
        "uptime": format_uptime(uptime),
    }


@app.get("/")
def index():
    return render_template("index.html", status=build_status(), stages=PIPELINE_STAGES)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/status")
def api_status():
    return jsonify(build_status())


@app.get("/api/hello")
def hello_world():
    return jsonify({"message": "Hello Azure"})


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        debug=os.getenv("FLASK_DEBUG") == "1",
    )
