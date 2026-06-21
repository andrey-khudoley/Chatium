#!/usr/bin/env python3
"""
Пересборка gc-required-fields-by-op.json из gc-op-http-mapping.json и локальных OpenAPI.

Запуск из каталога gateway:
  python3 extract-gc-required-fields.py

Требования: Python 3.9+, без внешних пакетов.
"""

from __future__ import annotations

import json
from pathlib import Path


def resolve_ref(root: dict, ref: str) -> dict:
    parts = ref.strip("#/").split("/")
    obj: dict = root
    for p in parts:
        obj = obj[p]
    return obj


def merge_schema(root: dict, obj: dict, depth: int = 0, max_depth: int = 15) -> dict:
    if depth > max_depth:
        return {"required": [], "properties": {}}
    if "$ref" in obj:
        return merge_schema(root, resolve_ref(root, obj["$ref"]), depth + 1, max_depth)
    req = list(obj.get("required") or [])
    props = dict(obj.get("properties") or {})
    if "allOf" in obj:
        for sub in obj["allOf"]:
            m = merge_schema(root, sub, depth + 1, max_depth)
            req.extend(m["required"])
            props.update(m["properties"])
        req = list(dict.fromkeys(req))
    return {"required": req, "properties": props}


def collect_body_required(root: dict, schema_obj: dict | None):
    if not schema_obj:
        return None
    if "$ref" in schema_obj:
        return collect_body_required(root, resolve_ref(root, schema_obj["$ref"]))
    if "oneOf" in schema_obj:
        branches = [collect_body_required(root, br) for br in schema_obj["oneOf"]]
        uniq: list = []
        for b in branches:
            if b not in uniq:
                uniq.append(b)
        return uniq[0] if len(uniq) == 1 else {"oneOf": uniq}
    if "anyOf" in schema_obj:
        return {"anyOf": [collect_body_required(root, br) for br in schema_obj["anyOf"]]}
    m = merge_schema(root, schema_obj)
    return sorted(set(m["required"]))


def main() -> None:
    base = Path(__file__).resolve().parent
    with open(base / "gc-op-http-mapping.json", encoding="utf-8") as f:
        mapping = json.load(f)
    with open(base / "new_api_schema.json", encoding="utf-8") as f:
        new_api = json.load(f)
    with open(base / "legacy_api_schema.json", encoding="utf-8") as f:
        leg_api = json.load(f)

    paths_new = new_api["paths"]
    paths_leg = leg_api["paths"]

    entries_out: list[dict] = []

    for ent in mapping["entries"]:
        op = ent["op"]
        contour = ent["contour"]
        if contour == "new":
            pt = ent["pathTemplate"]
            method = ent["httpMethod"].lower()
            op_obj = paths_new[pt][method]
            wire = {"path": [], "query": [], "header": []}
            for p in op_obj.get("parameters") or []:
                if p.get("required"):
                    wire[p["in"]].append(p["name"])
            for k in wire:
                wire[k] = sorted(wire[k])
            rb = op_obj.get("requestBody") or {}
            body = None
            if "application/json" in (rb.get("content") or {}):
                body = collect_body_required(new_api, rb["content"]["application/json"].get("schema"))
            entries_out.append(
                {
                    "op": op,
                    "contour": "new",
                    "openApiPath": pt,
                    "httpMethod": method.upper(),
                    "transportRequired": {"authorizationBearer": True},
                    "requiredPathParameters": wire["path"],
                    "requiredQueryParameters": wire["query"],
                    "requiredHeaderParameters": wire["header"],
                    "requiredJsonBodyTopLevel": body,
                }
            )
        else:
            pt = ent["pathTemplate"]
            method = ent["httpMethod"].lower()
            op_obj = paths_leg[pt][method]
            wire_form: list[str] = []
            wire_query: list[str] = []
            wire_path: list[str] = []
            rb = op_obj.get("requestBody") or {}
            if "application/x-www-form-urlencoded" in (rb.get("content") or {}):
                sch = rb["content"]["application/x-www-form-urlencoded"].get("schema", {})
                m = merge_schema(leg_api, sch)
                wire_form = sorted(set(m["required"]))
            for p in op_obj.get("parameters") or []:
                if not p.get("required"):
                    continue
                if p["in"] == "query":
                    wire_query.append(p["name"])
                elif p["in"] == "path":
                    wire_path.append(p["name"])
            inner_note = None
            if op == "addUser":
                inner_note = (
                    "Внутри Base64(JSON) params структура по официальному help "
                    "(https://getcourse.ru/help/api), раздел «Импорт пользователей»: для action=add минимально объект "
                    "user с полем email (сопоставление/создание пользователя); объекты system/session по необходимости сценария."
                )
            elif op == "createDeal":
                inner_note = (
                    "Внутри Base64(JSON) params структура по help (https://getcourse.ru/help/api), раздел «Импорт заказов»: "
                    "блоки user (как в импорте пользователя), deal (типично offer_code и/или offer_id, quantity и др.), "
                    "при необходимости system/session."
                )
            entries_out.append(
                {
                    "op": op,
                    "contour": "legacy",
                    "openApiPath": pt,
                    "httpMethod": method.upper(),
                    "transportRequired": {
                        "postFormFieldsIfPost": wire_form if method == "post" else [],
                        "queryParametersIfGet": sorted(set(wire_query)),
                        "pathParameters": sorted(ent.get("pathParameters") or wire_path),
                    },
                    "schoolApiKeyOnWire": "form_or_query_key_not_in_heap_fixture",
                    "innerParamsJsonNotes": inner_note,
                }
            )

    doc = {
        "schemaVersion": 1,
        "title": "Обязательные поля исходящего запроса GetCourse по op gateway",
        "generatedFrom": {
            "mapping": "gc-op-http-mapping.json",
            "newOpenApi": "new_api_schema.json",
            "legacyOpenApi": "legacy_api_schema.json",
            "legacyHelpSupplement": "https://getcourse.ru/help/api",
        },
        "heapBeforeIntegrationTesting": {
            "alwaysRequiredKeys": [
                "gc_developer_api_key",
                "gc_test_school_api_key",
                "gc_test_school_host",
            ],
            "description": "Три ключа обязательны до любого интеграционного вызова gateway→GC через /v1/{op}. Идентификаторы для args по возможности из цепочек в памяти прогона (gateway-testing-strategy.md §2); gc_itest_* — исключения (gateway-operation-manual §5.8 уровень B).",
        },
        "entries": sorted(entries_out, key=lambda x: (x["contour"], x["op"])),
    }

    out_path = base / "gc-required-fields-by-op.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Wrote {out_path} ({len(entries_out)} entries)")


if __name__ == "__main__":
    main()
