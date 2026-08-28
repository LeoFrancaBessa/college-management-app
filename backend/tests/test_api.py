"""End-to-end tests for the CRUD API, covering the wiring between routers,
services and models — not just unit-level model behavior (see test_models.py).
"""

API = "/api/v1"


def _create_period(client, name="2026.2"):
    return client.post(f"{API}/periods", json={"name": name}).json()


def _create_course(client, name="Calculus 3"):
    period = _create_period(client)
    return client.post(
        f"{API}/courses", json={"name": name, "period_id": period["id"]}
    ).json()


def _create_item_type(client, name="Exam"):
    return client.post(f"{API}/item-types", json={"name": name}).json()


def test_create_period(client):
    resp = client.post(f"{API}/periods", json={"name": "2026.2"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "2026.2"
    assert body["status"] == "active"


def test_create_course_generates_default_board(client):
    period = _create_period(client)
    resp = client.post(
        f"{API}/courses", json={"name": "Calculus 3", "period_id": period["id"]}
    )
    assert resp.status_code == 201
    course = resp.json()
    assert course["board"]["layout"] == "kanban"
    assert [c["name"] for c in course["board"]["columns"]] == [
        "Sem Definição",
        "A fazer",
        "Em andamento",
        "Concluído",
    ]
    assert course["board"]["columns"][0]["is_system"] is True


def test_create_course_for_missing_period_returns_404(client):
    resp = client.post(f"{API}/courses", json={"name": "Calculus 3", "period_id": 999})
    assert resp.status_code == 404


def test_create_item_requires_course_id_for_top_level(client):
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items", json={"title": "Exam", "item_type_id": item_type["id"]}
    )
    assert resp.status_code == 400


def test_create_top_level_item(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    resp = client.post(
        f"{API}/items",
        json={
            "title": "Derivatives exam",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
        },
    )
    assert resp.status_code == 201
    item = resp.json()
    assert item["course_id"] == course["id"]
    assert item["item_type"]["name"] == "Exam"
    assert item["status"] == "active"


def test_child_item_inherits_course_from_parent(client):
    course = _create_course(client)
    item_type = _create_item_type(client, "Project")
    parent = client.post(
        f"{API}/items",
        json={
            "title": "Final paper",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
        },
    ).json()

    child = client.post(
        f"{API}/items",
        json={
            "title": "Literature review",
            "item_type_id": item_type["id"],
            "parent_id": parent["id"],
        },
    ).json()

    assert child["course_id"] == course["id"]
    assert child["parent_id"] == parent["id"]


def test_cannot_move_item_under_its_own_descendant(client):
    course = _create_course(client)
    item_type = _create_item_type(client, "Project")
    parent = client.post(
        f"{API}/items",
        json={
            "title": "Final paper",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
        },
    ).json()
    child = client.post(
        f"{API}/items",
        json={
            "title": "Literature review",
            "item_type_id": item_type["id"],
            "parent_id": parent["id"],
        },
    ).json()

    resp = client.post(f"{API}/items/{parent['id']}/move", json={"parent_id": child["id"]})
    assert resp.status_code == 400


def test_moving_item_to_another_course_cascades_to_children(client):
    course_a = _create_course(client, "Calculus 3")
    course_b = _create_course(client, "Physics 2")
    item_type = _create_item_type(client, "Project")

    other_top_level = client.post(
        f"{API}/items",
        json={
            "title": "Physics project",
            "item_type_id": item_type["id"],
            "course_id": course_b["id"],
        },
    ).json()
    project = client.post(
        f"{API}/items",
        json={
            "title": "Final paper",
            "item_type_id": item_type["id"],
            "course_id": course_a["id"],
        },
    ).json()
    stage = client.post(
        f"{API}/items",
        json={
            "title": "Literature review",
            "item_type_id": item_type["id"],
            "parent_id": project["id"],
        },
    ).json()

    resp = client.post(
        f"{API}/items/{project['id']}/move", json={"parent_id": other_top_level["id"]}
    )
    assert resp.status_code == 200
    assert resp.json()["course_id"] == course_b["id"]

    stage_after = client.get(f"{API}/items/{stage['id']}").json()
    assert stage_after["course_id"] == course_b["id"]


def test_tag_lifecycle_on_item(client):
    course = _create_course(client)
    item_type = _create_item_type(client)
    tag = client.post(f"{API}/tags", json={"name": "Urgent"}).json()
    item = client.post(
        f"{API}/items",
        json={
            "title": "Exam",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
        },
    ).json()

    resp = client.put(f"{API}/items/{item['id']}/tags", json={"tag_ids": [tag["id"]]})
    assert resp.status_code == 200
    assert [t["name"] for t in resp.json()["tags"]] == ["Urgent"]

    resp = client.delete(f"{API}/items/{item['id']}/tags/{tag['id']}")
    assert resp.status_code == 200
    assert resp.json()["tags"] == []


def test_enable_board_on_item_and_move_item_into_column(client):
    course = _create_course(client)
    item_type = _create_item_type(client, "Project")
    project = client.post(
        f"{API}/items",
        json={
            "title": "Final paper",
            "item_type_id": item_type["id"],
            "course_id": course["id"],
        },
    ).json()

    resp = client.post(f"{API}/items/{project['id']}/board")
    assert resp.status_code == 201
    board = resp.json()
    assert len(board["columns"]) == 4
    column_id = board["columns"][1]["id"]

    stage = client.post(
        f"{API}/items",
        json={
            "title": "Write introduction",
            "item_type_id": item_type["id"],
            "parent_id": project["id"],
        },
    ).json()

    resp = client.put(f"{API}/items/{stage['id']}/board-column", json={"board_column_id": column_id})
    assert resp.status_code == 200
    assert resp.json()["board_column_id"] == column_id


def test_board_column_from_unrelated_board_is_rejected(client):
    course_a = _create_course(client, "Calculus 3")
    course_b = _create_course(client, "Physics 2")
    item_type = _create_item_type(client)

    item_a = client.post(
        f"{API}/items",
        json={
            "title": "Exam",
            "item_type_id": item_type["id"],
            "course_id": course_a["id"],
        },
    ).json()
    column_from_course_b = course_b["board"]["columns"][1]["id"]

    resp = client.put(
        f"{API}/items/{item_a['id']}/board-column",
        json={"board_column_id": column_from_course_b},
    )
    assert resp.status_code == 400


def test_delete_period_cascades_to_courses(client):
    course = _create_course(client)
    period_id = course["period_id"]

    resp = client.delete(f"{API}/periods/{period_id}")
    assert resp.status_code == 204

    resp = client.get(f"{API}/courses/{course['id']}")
    assert resp.status_code == 404


def test_archive_then_get_course(client):
    course = _create_course(client)
    resp = client.post(f"{API}/courses/{course['id']}/archive")
    assert resp.status_code == 200
    assert resp.json()["status"] == "archived"


def test_duplicate_tag_name_returns_409(client):
    client.post(f"{API}/tags", json={"name": "Urgent"})
    resp = client.post(f"{API}/tags", json={"name": "Urgent"})
    assert resp.status_code == 409
