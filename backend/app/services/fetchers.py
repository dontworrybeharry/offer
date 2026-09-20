"""直接读取招聘系统的公开岗位接口（不打开网页、不需要浏览器插件）。

每种招聘系统一个读取器，输入公司的招聘页网址，输出统一格式的岗位列表：
    {"id", "title", "url", "city", "jd", "category", "published"}

只使用这些网站给浏览器页面用的公开接口，和普通访客打开页面时看到的内容一致；
不登录、不绕过验证码或加密。加了加密 / 签名保护的系统（如 Moka、字节跳动）不在这里处理，
继续由浏览器插件像人一样打开页面读取。

已实测（2026-09-19）：
    飞书招聘  *.jobs.feishu.cn、*.jobs.f.mioffice.cn（小米）   列表接口直接带 JD
    北森      *.zhiye.com                                      列表接口直接带 JD，Category 2=校招 3=实习 1=社招
    腾讯      join.qq.com                                      列表 + 详情接口
    快手      campus.kuaishou.cn                               列表接口直接带 JD
    网易      campus.163.com / campus.game.163.com             按校招导航里的项目读取，列表带 JD
    网易雷火  leihuo.163.com                                   自己的招聘系统，列表带 JD
    米哈游    jobs.mihoyo.com                                  列表 + 详情接口
    蚂蚁      talent.antgroup.com、ant-intl.com（国际事业群）   列表带 JD（每页最多 20）；岗位没有独立链接，链接到列表页
    TikTok    lifeattiktok.com                                 字节海外门户的公开搜索接口，列表带 JD
    白标站点  campus.dewu.com（飞书）、hr-campus.vivo.com（北森）
"""
from __future__ import annotations

import asyncio
import html
import re
from collections.abc import Awaitable, Callable
from dataclasses import asdict, dataclass
from typing import Any
from urllib.parse import unquote, urlparse

import httpx

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"


class FetchError(Exception):
    pass


@dataclass
class Job:
    id: str
    title: str
    url: str
    city: str = ""
    jd: str = ""
    category: str = ""
    published: str = ""


def _text(s: Any) -> str:
    """接口里的 JD 可能带 HTML 标签：转成纯文本，保留换行。"""
    s = str(s or "")
    s = re.sub(r"<\s*br\s*/?>|</\s*(p|div|li)\s*>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s).replace("\r", "")
    return re.sub(r"\n{3,}", "\n\n", s).strip()


def _jd(*parts: tuple[str, Any]) -> str:
    return "\n\n".join(f"{name}\n{_text(v)}" for name, v in parts if _text(v))


# ---------------------------------------------------------------- 飞书招聘
async def _feishu(client: httpx.AsyncClient, url: str, max_jobs: int, **_) -> list[Job]:
    u = urlparse(url)
    host = u.netloc
    path = (u.path.strip("/").split("/") or [""])[0] or "index"   # 网址没有路径时，飞书默认门户是 /index
    headers = {"content-type": "application/json", "website-path": path, "portal-channel": "saas-career",
               "portal-platform": "pc", "referer": f"https://{host}/{path}"}
    r = await client.post(f"https://{host}/api/v1/csrf/token", json={"portal_entrance": 1}, headers=headers)
    r.raise_for_status()
    token = next((c.value for c in client.cookies.jar if "csrf" in c.name.lower() and host.endswith(c.domain.lstrip("."))), "")
    if not token:
        token = (r.json().get("data") or {}).get("token", "")
    headers["x-csrf-token"] = unquote(token)
    jobs: list[Job] = []
    offset = 0
    while len(jobs) < max_jobs:
        body = {"keyword": "", "limit": min(100, max_jobs - len(jobs)), "offset": offset, "job_category_id_list": [],
                "tag_id_list": [], "location_code_list": [], "subject_id_list": [], "recruitment_id_list": [],
                "portal_type": 6, "job_function_id_list": [], "storefront_id_list": [], "portal_entrance": 1}
        r = await client.post(f"https://{host}/api/v1/search/job/posts", json=body, headers=headers)
        r.raise_for_status()
        data = r.json().get("data") or {}
        items = data.get("job_post_list") or []
        for j in items:
            cities = [c.get("name") for c in (j.get("city_list") or []) if c.get("name")] or \
                     ([j["city_info"].get("name")] if j.get("city_info") else [])
            jobs.append(Job(id=str(j["id"]), title=j.get("title", ""), url=f"https://{host}/{path}/position/{j['id']}/detail",
                            city="、".join(cities), jd=_jd(("职位描述", j.get("description")), ("职位要求", j.get("requirement"))),
                            category=((j.get("job_category") or {}).get("name") or ""),
                            published=str(j.get("publish_time") or "")))
        offset += len(items)
        if not items or offset >= int(data.get("count") or 0) or offset >= 2000:
            break
    return jobs


# ---------------------------------------------------------------- 北森（zhiye）
async def _zhiye(client: httpx.AsyncClient, url: str, max_jobs: int, categories: list[int] | None = None, **_) -> list[Job]:
    host = urlparse(url).netloc
    jobs: list[Job] = []
    for cat in categories or [2, 3]:          # 默认：校招 + 实习
        page = 0
        while len(jobs) < max_jobs:
            body = {"Category": [cat], "DisplayFields": ["Category", "Kind", "LocId", "Org", "PostDate"],
                    "PageIndex": page, "PageSize": 100, "PortalId": "", "activityGuid": ""}
            r = await client.post(f"https://{host}/api/Jobad/GetJobAdPageList", json=body,
                                  headers={"content-type": "application/json"})
            r.raise_for_status()
            d = r.json()
            items = d.get("Data") or []
            for j in items:
                jobs.append(Job(id=str(j.get("Id")), title=j.get("JobAdName", ""),
                                url=f"https://{host}/campus/detail?jobAdId={j.get('Id')}",
                                city="、".join(j.get("LocNames") or []),
                                jd=_jd(("工作职责", j.get("Duty")), ("任职要求", j.get("Require"))),
                                category={2: "校招", 3: "实习", 1: "社招"}.get(cat, ""), published=str(j.get("PostDate") or "")[:10]))
            page += 1
            if not items or page >= 20 or page * 100 >= int(d.get("Count") or 0):
                break
    return jobs[:max_jobs]


# ---------------------------------------------------------------- 腾讯
async def _tencent(client: httpx.AsyncClient, url: str, max_jobs: int, skip: set[str] | None = None, **_) -> list[Job]:
    skip = skip or set()
    items: list[dict] = []
    page = 1
    while len(items) < max_jobs:
        body = {"projectIdList": [], "projectMappingIdList": [], "keyword": "", "bgList": [], "workCountryType": 0,
                "workCityList": [], "recruitCityList": [], "positionFidList": [], "pageIndex": page, "pageSize": 100}
        r = await client.post("https://join.qq.com/api/v1/position/searchPosition", json=body)
        r.raise_for_status()
        data = r.json().get("data") or {}
        batch = data.get("positionList") or []
        items += batch
        page += 1
        if not batch or page > 20 or len(items) >= int(data.get("count") or 1 << 30):
            break
    items = items[:max_jobs]
    sem = asyncio.Semaphore(6)

    async def one(p: dict) -> Job:
        jurl = f"https://join.qq.com/post_detail.html?postid={p.get('postId')}"
        job = Job(id=str(p.get("postId")), title=p.get("positionTitle", ""), url=jurl,
                  city=" ".join((p.get("workCities") or "").split()).replace(" ", "、"),
                  category=p.get("recruitLabelName") or p.get("projectName") or "")
        if jurl in skip:                      # 读过的岗位不再拉详情
            return job
        async with sem:
            try:
                r = await client.get("https://join.qq.com/api/v1/jobDetails/getJobDetailsByPostId",
                                     params={"postId": p.get("postId")})
                d = r.json().get("data") or {}
                job.jd = _jd(("岗位职责", d.get("desc")), ("岗位要求", d.get("request"))) or \
                    _jd(("课题介绍", d.get("topicDetail")), ("课题要求", d.get("topicRequirement")))   # 青云计划课题用这两个字段
            except (httpx.HTTPError, ValueError):
                pass
        return job

    return list(await asyncio.gather(*(one(p) for p in items)))


# ---------------------------------------------------------------- 快手
async def _kuaishou(client: httpx.AsyncClient, url: str, max_jobs: int, grad_year: int | None = None, **_) -> list[Job]:
    base = "https://campus.kuaishou.cn/recruit/campus/e/api/v1"
    codes: list[str] = []
    if grad_year:
        try:
            r = await client.get(f"{base}/dictionary/batch", params={"types": "recruitSubProject"})
            subs = (r.json().get("result") or {}).get("recruitSubProject") or []
            codes = [s["code"] for s in subs if str(grad_year) in (s.get("name") or "") or str(grad_year) in (s.get("code") or "")]
        except (httpx.HTTPError, ValueError, KeyError):
            codes = []
    jobs: list[Job] = []
    page = 1
    while len(jobs) < max_jobs:
        body: dict[str, Any] = {"pageNum": page, "pageSize": 100}
        if codes:
            body["recruitSubProjectCodes"] = codes
        r = await client.post(f"{base}/open/positions/simple", json=body)
        r.raise_for_status()
        res = r.json().get("result") or {}
        items = res.get("list") or []
        for j in items:
            locs = j.get("workLocationDicts") or []
            jobs.append(Job(id=str(j.get("id")), title=j.get("name", ""), url=f"https://campus.kuaishou.cn/#/campus/job-info/{j.get('id')}",
                            city="、".join(x.get("name", "") for x in locs if isinstance(x, dict)),
                            jd=_jd(("职位描述", j.get("description")), ("职位要求", j.get("positionDemand"))),
                            category="实习" if "intern" in str(j.get("recruitSubProjectCode", "")).lower() else "校招",
                            published=str(j.get("releaseTime") or "")[:10]))
        page += 1
        if not items or page > 20 or len(jobs) >= int(res.get("total") or 0):
            break
    return jobs[:max_jobs]


# ---------------------------------------------------------------- 网易（互娱 / 互联网，校招门户导航里列出的项目）
async def _netease(client: httpx.AsyncClient, url: str, max_jobs: int, **_) -> list[Job]:
    projects: list[tuple[str, str]] = []
    m = re.search(r"https?://(campus(?:\.game)?\.163\.com)/app/job/position\?id=(\d+)", url)
    if m:
        projects.append((m.group(1), m.group(2)))
    else:
        r = await client.get("https://campus.163.com/api/campuspc/project/navigation/list")
        for g in (r.json().get("data") or []):
            for c in g.get("children") or []:
                mm = re.search(r"https?://(campus(?:\.game)?\.163\.com)/app/job/position\?id=(\d+)", c.get("link") or "")
                if mm:
                    projects.append((mm.group(1), mm.group(2)))
    jobs: list[Job] = []
    for host, pid in projects:
        page = 1
        while len(jobs) < max_jobs:
            r = await client.get(f"https://{host}/api/campuspc/position/getJobList",
                                 params={"pageSize": 100, "currentPage": page, "projectId": pid})
            d = r.json().get("data") or {}
            items = d.get("list") or []
            for j in items:
                jobs.append(Job(id=f"{host}:{j.get('id')}", title=j.get("positionName", ""),
                                url=f"https://{host}/app/detail/index?id={j.get('id')}&projectId={pid}",
                                city="、".join(x for x in str(j.get("workPlaceName") or "").split(",") if x),
                                jd=_jd(("职位描述", j.get("positionDescription")), ("职位要求", j.get("positionRequirement"))),
                                category=j.get("positionTypeName") or ""))
            page += 1
            if not items or page > int(d.get("pages") or 1) or page > 20:
                break
    return jobs[:max_jobs]


# ---------------------------------------------------------------- 米哈游（列表 + 详情）
async def _mihoyo(client: httpx.AsyncClient, url: str, max_jobs: int, skip: set[str] | None = None, **_) -> list[Job]:
    skip = skip or set()
    base = "https://ats.openout.mihoyo.com/ats-portal/v1"
    items: list[dict] = []
    page = 1
    while len(items) < max_jobs:
        r = await client.post(f"{base}/job/list", json={"pageNo": page, "pageSize": 100, "channelDetailIds": [1], "hireType": 1})
        d = r.json().get("data") or {}
        batch = d.get("list") or []
        items += batch
        page += 1
        if not batch or len(items) >= int(d.get("total") or 0) or page > 20:
            break
    items = items[:max_jobs]
    sem = asyncio.Semaphore(6)

    async def one(p: dict) -> Job:
        jurl = f"https://jobs.mihoyo.com/#/campus/position/{p.get('id')}"
        job = Job(id=str(p.get("id")), title=p.get("title", ""), url=jurl,
                  city="、".join(a.get("addressDetail", "") for a in (p.get("addressDetailList") or [])),
                  category=" ".join(x for x in (p.get("jobNature"), p.get("projectName")) if x))
        if jurl in skip:
            return job
        async with sem:
            try:
                r = await client.post(f"{base}/job/info", json={"id": str(p.get("id")), "channelDetailIds": [1], "hireType": 1})
                d = r.json().get("data") or {}
                job.jd = _jd(("职位描述", d.get("description")), ("职位要求", d.get("jobRequire")), ("加分项", d.get("addition")))
            except (httpx.HTTPError, ValueError):
                pass
        return job

    return list(await asyncio.gather(*(one(p) for p in items)))


# ---------------------------------------------------------------- 蚂蚁集团
async def _antgroup(client: httpx.AsyncClient, url: str, max_jobs: int, **_) -> list[Job]:
    bg = "M7892" if "ant-intl.com" in url else ""          # 蚂蚁国际官网只看国际事业群
    token = "bigfish_ctoken_offer"          # 页面自己生成的防跨站令牌：请求参数和 cookie 一致即可
    client.cookies.set("ctoken", token, domain="hrcareersweb.antgroup.com")
    jobs: list[Job] = []
    page = 1
    while len(jobs) < max_jobs:
        body = {"channel": "campus_group_official_site", "language": "zh", "regions": "", "subCategories": "", "bgCode": bg,
                "pageIndex": page, "pageSize": 20, "recruitType": [], "batchIds": []}   # 超过 20 会报「系统繁忙」
        r = await client.post(f"https://hrcareersweb.antgroup.com/api/campus/position/search?ctoken={token}", json=body)
        d = r.json()
        if not d.get("success"):
            raise FetchError(f"蚂蚁招聘接口返回失败：{d.get('errorMsg') or d.get('errorCode')}")
        items = d.get("content") or []
        for j in items:
            jobs.append(Job(id=str(j.get("id")), title=j.get("name", ""), url=url if "ant-intl.com" in url else "https://talent.antgroup.com/campus-full-list",
                            city="、".join(j.get("workLocations") or []),
                            jd=_jd(("岗位描述", j.get("description")), ("岗位要求", j.get("requirement"))),
                            category=" ".join(x for x in (j.get("batchTypeDesc"), j.get("batchName")) if x),
                            published=str(j.get("publishTime") or "")[:10]))
        page += 1
        if not items or len(jobs) >= int(d.get("totalCount") or 0) or page > 60:
            break
    return jobs[:max_jobs]


# ---------------------------------------------------------------- TikTok（lifeattiktok.com，字节海外招聘门户的公开接口）
async def _tiktok(client: httpx.AsyncClient, url: str, max_jobs: int, **_) -> list[Job]:
    q = dict(x.split("=", 1) for x in (urlparse(url).query or "").split("&") if "=" in x)
    rec = [v for v in unquote(q.get("recruitment_id_list", "")).split(",") if v]
    headers = {"content-type": "application/json", "website-path": "tiktok", "portal-channel": "tiktok"}
    jobs: list[Job] = []
    offset = 0
    while len(jobs) < max_jobs:
        body = {"keyword": "", "limit": min(100, max_jobs - len(jobs)), "offset": offset, "job_category_id_list": [], "tag_id_list": [],
                "location_code_list": [], "subject_id_list": [], "recruitment_id_list": rec, "portal_type": 3,
                "job_function_id_list": [], "storefront_id_list": [], "portal_entrance": 1}
        r = await client.post("https://api.lifeattiktok.com/api/v1/public/supplier/search/job/posts", json=body, headers=headers)
        r.raise_for_status()
        data = r.json().get("data") or {}
        items = data.get("job_post_list") or []
        for j in items:
            city = (j.get("city_info") or {}).get("en_name") or (j.get("city_info") or {}).get("name") or ""
            jobs.append(Job(id=str(j["id"]), title=j.get("title", ""), url=f"https://lifeattiktok.com/search/{j['id']}", city=city,
                            jd=_jd(("Responsibilities", j.get("description")), ("Qualifications", j.get("requirement"))),
                            category=((j.get("job_category") or {}).get("en_name") or ""), published=str(j.get("publish_time") or "")))
        offset += len(items)
        if not items or offset >= int(data.get("count") or 0) or offset >= 2000:
            break
    return jobs


# ---------------------------------------------------------------- 网易雷火（xiaozhao.leihuo.netease.com）
async def _leihuo(client: httpx.AsyncClient, url: str, max_jobs: int, **_) -> list[Job]:
    m = re.search(r"project_id=(\d+)", url)
    pid = m.group(1) if m else "77"          # 77 = 雷火 2027 届校园招聘（网址里带 project_id 时以网址为准）
    jobs: list[Job] = []
    page = 1
    while len(jobs) < max_jobs:
        r = await client.get("https://xiaozhao.leihuo.netease.com/api/apply/job/list/show",
                             params={"job_name": "", "page_size": 100, "page_number": page, "project_id": pid})
        r.raise_for_status()
        d = r.json().get("data") or {}
        items = d.get("apply_job_list") or []
        for j in items:
            jobs.append(Job(id=str(j.get("ehr_job_id") or j.get("job_code")), title=j.get("job_name", ""),
                            url=j.get("job_detail_url") or f"https://campus.163.com/app/detail/index?id={j.get('ehr_job_id')}&projectId={pid}",
                            city=str(j.get("work_place_name") or "").replace(",", "、"),
                            jd=_jd(("职位描述", j.get("job_description")), ("任职要求", j.get("job_requirement"))),
                            category=" ".join(x for x in (j.get("type_name"), j.get("category_name"), j.get("target")) if x)))
        page += 1
        if not items or d.get("last_page") or page > int(d.get("pages_count") or 1) or page > 20:
            break
    return jobs[:max_jobs]


# ---------------------------------------------------------------- 识别
ADAPTERS: list[tuple[str, str, re.Pattern[str], Callable[..., Awaitable[list[Job]]]]] = [
    ("feishu", "飞书招聘", re.compile(r"^https?://([^/]+\.(jobs\.feishu\.cn|jobs\.f\.mioffice\.cn)|campus\.dewu\.com)(/|$)", re.I), _feishu),
    ("zhiye", "北森", re.compile(r"^https?://([^/]+\.zhiye\.com|hr-campus\.vivo\.com)(/|$)", re.I), _zhiye),
    ("tencent", "腾讯招聘", re.compile(r"^https?://join\.qq\.com(/|$)", re.I), _tencent),
    ("kuaishou", "快手校招", re.compile(r"^https?://campus\.kuaishou\.cn(/|$)", re.I), _kuaishou),
    ("netease", "网易校招", re.compile(r"^https?://campus(\.game)?\.163\.com(/|$)", re.I), _netease),
    ("mihoyo", "米哈游招聘", re.compile(r"^https?://jobs\.mihoyo\.com(/|$)", re.I), _mihoyo),
    ("antgroup", "蚂蚁招聘", re.compile(r"^https?://(talent\.antgroup\.com|www\.ant-intl\.com)(/|$)", re.I), _antgroup),
    ("tiktok", "TikTok 招聘", re.compile(r"^https?://lifeattiktok\.com(/|$)", re.I), _tiktok),
    ("leihuo", "网易雷火", re.compile(r"^https?://(leihuo\.163\.com|xiaozhao\.leihuo\.netease\.com)(/|$)", re.I), _leihuo),
]


def detect(url: str) -> tuple[str, str] | None:
    for kind, name, pat, _ in ADAPTERS:
        if pat.search(url or ""):
            return kind, name
    return None


async def fetch(url: str, *, max_jobs: int = 300, skip: set[str] | None = None, grad_year: int | None = None,
                timeout: float = 30.0, client: httpx.AsyncClient | None = None) -> dict[str, Any]:
    hit = next(((k, n, f) for k, n, p, f in ADAPTERS if p.search(url or "")), None)
    if not hit:
        raise FetchError("这个网址还不支持直接读取，请用浏览器插件刷新")
    kind, name, fn = hit
    own = client is None
    client = client or httpx.AsyncClient(timeout=timeout, headers={"user-agent": UA}, follow_redirects=True)
    try:
        jobs = await fn(client, url, max(1, min(max_jobs, 1000)), skip=skip, grad_year=grad_year)
    except httpx.HTTPError as e:
        raise FetchError(f"{name}接口访问失败：{e.__class__.__name__}") from e
    except (ValueError, KeyError, TypeError) as e:
        raise FetchError(f"{name}接口返回格式变了，需要更新读取器（{e.__class__.__name__}）") from e
    finally:
        if own:
            await client.aclose()
    return {"kind": kind, "system": name, "total": len(jobs), "jobs": [asdict(j) for j in jobs]}
