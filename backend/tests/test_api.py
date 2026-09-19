import copy

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.services import llm

SAMPLE = {
    "v": 1,
    "profile": {"name": "林小舟", "exps": [{"id": "x1", "org": "示例公司", "bullets": [{"id": "b1", "t": "做了一件事"}]}]},
    "apps": [
        {"id": "a1", "company": "字节跳动", "role": "产品运营", "stage": "已投递", "phase": "秋招", "date": "2026-09-17", "note": "内推"},
        {"id": "a2", "company": "美团", "role": "商业分析", "stage": "想投/收藏", "phase": "秋招", "deadline": "2026-09-30"},
    ],
    "resumeHist": [{"id": "h1", "company": "字节跳动", "role": "产品运营", "appId": "a1", "at": "2026-09-17T10:00:00Z", "model": {"name": "林小舟"}}],
    "autopilot": {
        "sources": [{"id": "s1", "name": "字节跳动校招", "company": "字节跳动", "url": "https://jobs.bytedance.com/campus/position", "on": True}],
        "f": {"minScore": 60},
        "queue": [
            {"id": "q1", "company": "字节跳动", "role": "平台活动运营", "city": "上海", "score": 78, "status": "ready", "found": "2026-09-18T01:00:00Z"},
            {"id": "q2", "company": "字节跳动", "role": "原画实习生", "city": "上海", "score": 22, "status": "skip", "found": "2026-09-18T01:01:00Z"},
        ],
        "hours": 0.5,
    },
    "onboarded": True,
}


@pytest.fixture
def client(tmp_path):
    app = create_app(Settings(_env_file=None, data_dir=tmp_path, web_root=tmp_path))
    (tmp_path / "index.html").write_text("<html>ok</html>", encoding="utf-8")
    (tmp_path / "sites.json").write_text('{"updated":"2026-09-18","sites":[{"co":"腾讯","cat":"互联网大厂","url":"https://join.qq.com"}]}', encoding="utf-8")
    with TestClient(app) as c:
        yield c


def test_health_and_pages(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["ok"] is True
    assert client.get("/").text == "<html>ok</html>"
    assert client.get("/api/sites").json()["sites"][0]["co"] == "腾讯"


def test_state_roundtrip_is_lossless(client):
    assert client.get("/api/state", params={"ws": "t"}).json() == {"ws": "t", "version": 0, "state": None}
    r = client.put("/api/state", params={"ws": "t"}, json={"state": SAMPLE, "base_version": 0})
    assert r.status_code == 200 and r.json()["version"] == 1
    got = client.get("/api/state", params={"ws": "t"}).json()
    assert got["version"] == 1
    assert got["state"] == SAMPLE  # 拆表再拼回，逐字段一致（含顺序）
    assert list(got["state"].keys()) == list(SAMPLE.keys())
    assert list(got["state"]["autopilot"].keys()) == list(SAMPLE["autopilot"].keys())


def test_workspaces_are_isolated(client):
    client.put("/api/state", params={"ws": "a"}, json={"state": SAMPLE, "base_version": 0})
    assert client.get("/api/state", params={"ws": "b"}).json()["state"] is None
    assert client.get("/api/applications", params={"ws": "b"}).json()["total"] == 0


def test_version_conflict(client):
    client.put("/api/state", params={"ws": "t"}, json={"state": SAMPLE, "base_version": 0})
    stale = client.put("/api/state", params={"ws": "t"}, json={"state": SAMPLE, "base_version": 0})
    assert stale.status_code == 409 and stale.json()["version"] == 1
    forced = client.put("/api/state", params={"ws": "t"}, json={"state": SAMPLE, "base_version": None})
    assert forced.status_code == 200 and forced.json()["version"] == 2


def test_resources_filter_and_crud_bump_version(client):
    client.put("/api/state", params={"ws": "t"}, json={"state": SAMPLE, "base_version": 0})
    jobs = client.get("/api/jobs", params={"ws": "t", "status": "ready"}).json()
    assert jobs["total"] == 1 and jobs["items"][0]["data"]["role"] == "平台活动运营"
    assert client.get("/api/applications", params={"ws": "t", "q": "美团"}).json()["items"][0]["id"] == "a2"

    r = client.patch("/api/jobs/q1", params={"ws": "t"}, json={"data": {"status": "submitted"}})
    assert r.status_code == 200 and r.json()["data"]["status"] == "submitted" and r.json()["data"]["city"] == "上海"
    created = client.post("/api/applications", params={"ws": "t"}, json={"data": {"company": "腾讯", "role": "AI 产品经理", "stage": "想投/收藏"}})
    assert created.status_code == 201
    new_id = created.json()["id"]

    state = client.get("/api/state", params={"ws": "t"}).json()
    assert state["version"] == 3
    assert state["state"]["autopilot"]["queue"][0]["status"] == "submitted"
    assert state["state"]["apps"][0]["id"] == new_id  # 新条目排在最前
    assert client.delete(f"/api/applications/{new_id}", params={"ws": "t"}).status_code == 204
    assert client.get(f"/api/applications/{new_id}", params={"ws": "t"}).status_code == 404


def test_bad_workspace_rejected(client):
    assert client.get("/api/state", params={"ws": "../etc"}).status_code == 422


def test_untrusted_host_rejected(client):
    assert client.get("/api/health", headers={"host": "evil.example.com"}).status_code == 400


def test_cors_only_local_and_extension(client):
    ok = client.options("/api/state", headers={"origin": "http://127.0.0.1:8765", "access-control-request-method": "PUT"})
    assert ok.headers.get("access-control-allow-origin") == "http://127.0.0.1:8765"
    ext = client.options("/api/state", headers={"origin": "chrome-extension://abcdefghijklmnopabcdefghijklmnop", "access-control-request-method": "PUT"})
    assert ext.headers.get("access-control-allow-origin")
    bad = client.options("/api/state", headers={"origin": "https://evil.example.com", "access-control-request-method": "PUT"})
    assert "access-control-allow-origin" not in bad.headers
    nul = client.options("/api/state", headers={"origin": "null", "access-control-request-method": "PUT"})
    assert "access-control-allow-origin" not in nul.headers


def test_ai_keys_masked_and_chat(client, monkeypatch):
    r = client.put("/api/ai/providers", json={"provider": "zhipu", "api_key": "abcd1234.secretsecret"})
    assert r.status_code == 200 and r.json()["configured"] and "secretsecret" not in r.json()["key_hint"]
    assert "abcd1234.secretsecret" not in client.get("/api/ai/providers").text

    seen = {}

    def handler(req: httpx.Request) -> httpx.Response:
        seen["url"] = str(req.url)
        seen["auth"] = req.headers.get("authorization")
        return httpx.Response(200, json={"choices": [{"message": {"content": "值得投", "tool_calls": [
            {"id": "c1", "type": "function", "function": {"name": "analyze_jd", "arguments": '{"company":"字节跳动"}'}}]}, "finish_reason": "tool_calls"}]})

    real = llm.chat

    async def fake_chat(**kw):
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await real(client=c, **kw)

    monkeypatch.setattr(llm, "chat", fake_chat)
    out = client.post("/api/ai/chat", json={"system": "s", "messages": [{"role": "user", "content": "hi"}],
                                            "tools": [{"name": "analyze_jd", "parameters": {"type": "object", "properties": {"company": {"type": "string"}}}}]})
    assert out.status_code == 200, out.text
    body = out.json()
    assert body["provider"] == "zhipu" and body["text"] == "值得投"
    assert body["tool_calls"][0] == {"id": "c1", "name": "analyze_jd", "arguments": {"company": "字节跳动"}}
    assert seen["url"].startswith("https://open.bigmodel.cn/api/paas/v4/chat/completions")
    assert seen["auth"] == "Bearer abcd1234.secretsecret"


def test_ai_errors_are_readable(client):
    r = client.post("/api/ai/chat", json={"provider": "openai", "messages": [{"role": "user", "content": "hi"}]})
    assert r.status_code == 400 and "API Key" in r.json()["detail"]


def test_export(client):
    client.put("/api/state", params={"ws": "t"}, json={"state": SAMPLE, "base_version": 0})
    r = client.get("/api/state/export", params={"ws": "t"})
    assert r.status_code == 200 and r.json() == SAMPLE


def test_jobs_import_dedupes(client):
    client.put("/api/state", params={"ws": "t"}, json={"state": SAMPLE, "base_version": 0})
    r = client.post("/api/jobs/import", params={"ws": "t"}, json={"items": [
        {"company": "字节跳动", "role": "平台活动运营", "url": "x"},          # 与已有岗位同公司+岗位 → 跳过
        {"company": "美团", "role": "商业分析师", "url": "https://m/1"},
        {"company": "美团", "role": "商业分析师（重复 URL）", "url": "https://m/1"},  # 同 URL → 跳过
        {"company": "", "role": ""},                                          # 空 → 跳过
    ]})
    assert r.status_code == 201 and r.json()["total"] == 1
    queue = client.get("/api/state", params={"ws": "t"}).json()["state"]["autopilot"]["queue"]
    assert queue[0]["company"] == "美团" and len(queue) == 3


def test_home_html_override(tmp_path):
    home = tmp_path / "mine.html"; home.write_text("<html>mine</html>", encoding="utf-8")
    (tmp_path / "index.html").write_text("<html>share</html>", encoding="utf-8")
    app = create_app(Settings(_env_file=None, data_dir=tmp_path, web_root=tmp_path, home_html=home))
    with TestClient(app) as c:
        assert c.get("/").text == "<html>mine</html>"
        assert c.get("/share").text == "<html>share</html>"


def test_direct_fetch_detect_and_unsupported(client):
    from app.services import fetchers
    assert fetchers.detect("https://xiaopeng.jobs.feishu.cn/campus")[0] == "feishu"
    assert fetchers.detect("https://xiaomi.jobs.f.mioffice.cn/campus/")[0] == "feishu"
    assert fetchers.detect("https://cicc.zhiye.com/campus")[0] == "zhiye"
    assert fetchers.detect("https://join.qq.com/post.html?query=p_1")[0] == "tencent"
    assert fetchers.detect("https://campus.kuaishou.cn/#/campus/jobs")[0] == "kuaishou"
    assert fetchers.detect("https://jobs.bytedance.com/campus/position") is None
    assert fetchers._text("<p>负责<b>数据</b>分析</p><br>要求&amp;加分") == "负责数据分析\n\n要求&加分"
    kinds = {x["kind"] for x in client.get("/api/jobs/sources/direct").json()}
    assert {"feishu", "zhiye", "tencent", "kuaishou", "netease", "mihoyo", "antgroup", "tiktok"} <= kinds
    r = client.post("/api/jobs/fetch", json={"url": "https://example.com/jobs"})
    assert r.status_code == 422 and "不支持" in r.json()["detail"]


def test_direct_fetch_more_systems():
    from app.services import fetchers
    cases = {"https://campus.163.com/app/job/position?id=103": "netease", "https://campus.game.163.com/app/job/position?id=102": "netease",
             "https://jobs.mihoyo.com/#/campus/position": "mihoyo", "https://talent.antgroup.com/campus-full-list": "antgroup",
             "https://www.ant-intl.com/cn/job-search-campus/": "antgroup", "https://lifeattiktok.com/search?recruitment_id_list=202": "tiktok",
             "https://campus.dewu.com/578078": "feishu", "https://hr-campus.vivo.com/campus": "zhiye"}
    for url, kind in cases.items():
        assert fetchers.detect(url)[0] == kind, url
    for url in ("https://careers.trip.com/#/campus/job", "https://app.mokahr.com/campus_apply/high-flyer/4605", "https://career.huawei.com/"):
        assert fetchers.detect(url) is None, url
