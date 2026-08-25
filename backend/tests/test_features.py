import pytest

"""Tests for RF-16 Nota / RF-17 Checklist / RF-18 Anotações.

Validates `services/features.py` via the API layer (POST/PATCH /items)
using the same in-memory TestClient pattern as test_api.py.

Keep `-- backend holes.txt` in sync: this file is the "test_features.py"
mentioned there.
"""

API = "/api/v1"


def _create_period(client, name="2026.2"):
    return client.post(f"{API}/periods", json={"name": name}).json()


def _create_course(client, name="Calculus 3"):
    period = _create_period(client)
    return client.post(f"{API}/courses", json={"name": name, "period_id": period["id"]}).json()


def _create_item_type(client, name="Exam"):
    return client.post(f"{API}/item-types", json={"name": name}).json()


# ---------- RF-16 Nota ----------


def test_grade_ok(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "Exam 1",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"grade": {"score": 8.5, "max_score": 10, "weight": 2}},
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["features"]["grade"] == {"score": 8.5, "max_score": 10.0, "weight": 2.0}
    assert "nota" not in body["features"]


def test_grade_alias_nota_normalized(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "Prova",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"nota": {"nota_obtida": 7, "nota_max": 10, "peso": 1}},
        },
    )
    assert resp.status_code == 201, resp.text
    f = resp.json()["features"]
    assert f["grade"] == {"score": 7.0, "max_score": 10.0, "weight": 1.0}
    assert "nota" not in f


def test_grade_score_greater_than_max_returns_400(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "Bad grade",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"grade": {"score": 11, "max_score": 10}},
        },
    )
    assert resp.status_code == 400


def test_grade_weight_zero_normalizes_to_one(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "Weight zero",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"grade": {"score": 6, "max_score": 10, "weight": 0}},
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["features"]["grade"]["weight"] == 1.0
    # também com alias peso=0
    resp2 = client.post(
        f"{API}/items",
        json={
            "title": "Peso zero",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"nota": {"nota_obtida": 6, "nota_max": 10, "peso": 0}},
        },
    )
    assert resp2.status_code == 201, resp2.text
    assert resp2.json()["features"]["grade"]["weight"] == 1.0


def test_grade_missing_score_returns_400(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "No score",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"grade": {"max_score": 10}},
        },
    )
    assert resp.status_code == 400


# ---------- RF-17 Checklist ----------


def test_checklist_ok_trims_and_defaults_done(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "With checklist",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {
                "checklist": [
                    {"text": "  buy milk  ", "done": True},
                    {"texto": "revisar cap 3"},  # alias, done defaults false
                ]
            },
        },
    )
    assert resp.status_code == 201, resp.text
    cl = resp.json()["features"]["checklist"]
    assert cl[0] == {"text": "buy milk", "done": True}
    assert cl[1] == {"text": "revisar cap 3", "done": False}


def test_checklist_alias_check_list_normalized(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "Alias check_list",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"check_list": [{"text": "a", "done": False}]},
        },
    )
    assert resp.status_code == 201, resp.text
    f = resp.json()["features"]
    assert "checklist" in f
    assert "check_list" not in f


def test_checklist_empty_text_returns_400(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "Bad checklist",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"checklist": [{"text": "   ", "done": False}]},
        },
    )
    assert resp.status_code == 400


def test_checklist_not_list_returns_400(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "Bad checklist type",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"checklist": "not a list"},
        },
    )
    assert resp.status_code == 400


# ---------- RF-18 Anotações ----------


def test_notes_ok_and_alias_anotacoes_normalized(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "With notes",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"anotacoes": "# hello\nsome **markdown**"},
        },
    )
    assert resp.status_code == 201, resp.text
    f = resp.json()["features"]
    assert f["notes"] == "# hello\nsome **markdown**"
    assert "anotacoes" not in f


def test_notes_not_string_returns_400(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "Bad notes",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"notes": 123},
        },
    )
    assert resp.status_code == 400


def test_notes_too_long_returns_400(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "Long notes",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"notes": "x" * 50001},
        },
    )
    assert resp.status_code == 400


# ---------- PATCH parcial + average ----------


def test_patch_grade_partial(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    item = client.post(
        f"{API}/items",
        json={
            "title": "Patch me",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"grade": {"score": 5, "max_score": 10, "weight": 1}},
        },
    ).json()
    # PATCH só grade — deve validar e persistir normalizado
    resp = client.patch(
        f"{API}/items/{item['id']}",
        json={"features": {"grade": {"score": 9, "max_score": 10, "weight": 2}}},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["features"]["grade"] == {"score": 9.0, "max_score": 10.0, "weight": 2.0}


def test_average_reflects_normalized_grades(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    # 8*2 + 7*1 / 3 = 7.666... -> use simple 8*2 + 6*1 = 22/3 ≈ 7.333
    for score, weight in [(8, 2), (6, 1)]:
        resp = client.post(
            f"{API}/items",
            json={
                "title": f"Grade {score}",
                "item_type_id": item_type["id"],
                "course_id": course["id"],
                "features": {"grade": {"score": score, "max_score": 10, "weight": weight}},
            },
        )
        assert resp.status_code == 201, resp.text
    avg = client.get(f"{API}/courses/{course['id']}/average").json()
    assert avg["count"] == 2
    assert avg["average"] == pytest.approx((8 * 2 + 6 * 1) / 3)


def test_notes_markdown_preserved(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    md = "# Title\n- a\n- b\n\n```python\nx=1\n```"
    resp = client.post(
        f"{API}/items",
        json={
            "title": "MD",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
            "features": {"notes": md},
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["features"]["notes"] == md
