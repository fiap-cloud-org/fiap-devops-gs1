import pytest

import main
from main import app, format_uptime, soma


@pytest.fixture
def client():
    app.config.update({"TESTING": True})
    with app.test_client() as client:
        yield client


def test_homepage(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.content_type.startswith("text/html")
    assert b"Hello Azure" in response.data
    assert b"Pipeline desta vers" in response.data


def test_homepage_lista_etapas_do_pipeline(client):
    html = client.get("/").get_data(as_text=True)
    for stage in main.PIPELINE_STAGES:
        assert stage["name"] in html


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_hello_json(client):
    assert client.get("/api/hello").get_json() == {"message": "Hello Azure"}


def test_status_local(client, monkeypatch):
    for var in ("APP_VERSION", "GIT_COMMIT", "APP_ENV", "WEBSITE_SITE_NAME", "WEBSITE_HOSTNAME"):
        monkeypatch.delenv(var, raising=False)
    data = client.get("/api/status").get_json()
    assert data["app"] == "fiap-devops-gs1"
    assert data["environment"] == "local"
    assert data["version"] == "local"
    assert data["build"] is None
    assert data["commit"] is None
    assert data["platform"] == "Docker / local"
    assert data["uptime_seconds"] >= 0


def test_status_com_dados_do_pipeline(client, monkeypatch):
    monkeypatch.setenv("APP_VERSION", "42")
    monkeypatch.setenv("GIT_COMMIT", "0123456789abcdef")
    monkeypatch.setenv("APP_ENV", "prod")
    monkeypatch.setenv("WEBSITE_SITE_NAME", "fiap-devops-gs1")
    monkeypatch.setenv("WEBSITE_HOSTNAME", "fiap-devops-gs1.azurewebsites.net")
    data = client.get("/api/status").get_json()
    assert data["build"] == "#42"
    assert data["commit"] == "0123456"
    assert data["environment"] == "prod"
    assert data["platform"] == "Azure App Service"
    assert data["host"] == "fiap-devops-gs1.azurewebsites.net"
    html = client.get("/").get_data(as_text=True)
    assert "Jenkins #42" in html
    assert "0123456" in html


@pytest.mark.parametrize(
    "seconds, expected",
    [(5, "5s"), (65, "1min 5s"), (3700, "1h 1min"), (90061, "1d 1h 1min")],
)
def test_format_uptime(seconds, expected):
    assert format_uptime(seconds) == expected


def test_soma():
    assert soma(2, 3) == 5
    assert soma(-1, 1) == 0
    assert soma(0, 0) == 0
