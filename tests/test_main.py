import pytest

from main import app, soma


@pytest.fixture
def client():
    app.config.update({"TESTING": True})
    with app.test_client() as client:
        yield client


def test_homepage(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"Hello Azure" in response.data


def test_soma():
    assert soma(2, 3) == 5
    assert soma(-1, 1) == 0
    assert soma(0, 0) == 0
