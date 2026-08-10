import functools
import http.server
import os
import re
import tempfile
import threading
from contextlib import contextmanager
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


EXTERNAL_BASE_URL = os.environ.get("H5_BASE_URL")
PROJECT_ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        pass


@contextmanager
def serve_h5():
    if EXTERNAL_BASE_URL:
        yield EXTERNAL_BASE_URL
        return

    handler = functools.partial(QuietHandler, directory=str(PROJECT_ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/h5/"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def assert_route(page, title):
    expect(page.locator("#routeTitle")).to_have_text(title)
    expect(page.locator("#screen .screen-page")).to_have_count(1)


def click(page, action):
    page.locator(f"[data-action='{action}']:visible").last.click()


def run_full_flow(browser, artifacts, base_url):
    context = browser.new_context(
        accept_downloads=True,
        viewport={"width": 1440, "height": 1000},
        device_scale_factor=1,
    )
    page = context.new_page()
    console_errors = []
    page_errors = []
    failed_requests = []
    bad_responses = []

    page.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("requestfailed", lambda request: failed_requests.append(request.url))
    page.on(
        "response",
        lambda response: bad_responses.append(f"{response.status} {response.url}")
        if response.status >= 400
        else None,
    )

    page.goto(base_url, wait_until="networkidle")
    expect(page).to_have_title("西洋楼铜版图·第二十一图")
    assert_route(page, "西洋楼铜版图")
    expect(page.locator(".cover-page")).to_be_visible()

    click(page, "start")
    assert_route(page, "序章")
    while page.locator("[data-action='novel-next']").count():
        click(page, "novel-next")
    click(page, "novel-finish")

    assert_route(page, "实体信封")
    click(page, "envelope-open")
    expect(page.get_by_text("信中内容")).to_be_visible()
    click(page, "go-s1")

    assert_route(page, "信封上的半字")
    page.locator("#s1Answer").fill("黄花阵")
    click(page, "s1-submit")
    expect(page.get_by_text("第一站的去处很明确了：黄花阵")).to_be_visible()
    click(page, "s1-next")

    assert_route(page, "前往黄花阵")
    click(page, "transit-next")
    assert_route(page, "黄花阵的用途")
    page.locator("[data-action='select-purpose'][data-value='C']").click()
    click(page, "confirm-purpose")
    expect(page.locator(".history-overlay")).to_be_visible()
    click(page, "history-next")

    assert_route(page, "黄花阵名字由来")
    page.locator("#s2NameAnswer").fill("黄色彩绸扎成的莲花灯")
    click(page, "s2name-submit")
    click(page, "history-next")

    assert_route(page, "中西结合的观察")
    for index, slot in enumerate(("dome", "beast", "lotus", "swan"), start=1):
        with page.expect_file_chooser() as chooser_info:
            page.locator(
                f"[data-action='pick-photo'][data-slot='{slot}']"
            ).click()
        chooser_info.value.set_files(
            str(PROJECT_ROOT / "test" / "fixtures" / f"player-photo-0{index}.svg")
        )
        expect(
            page.locator(
                f"[data-action='preview-photo'][data-slot='{slot}'] img"
            )
        ).to_have_attribute("src", re.compile(r"^data:image/jpeg;base64,"))
    expect(page.locator(".photo-slot .photo-stage img:not(.is-guide)")).to_have_count(4)
    click(page, "photos-complete")
    assert_route(page, "四图考察卡")
    click(page, "record-history")
    click(page, "history-next")

    assert_route(page, "墙体的花纹")
    page.locator("[data-action='select-pattern'][data-value='wanzi']").click()
    click(page, "confirm-pattern")
    click(page, "history-next")
    assert_route(page, "查看手绘路线图")
    click(page, "s2route-next")

    assert_route(page, "前往海晏堂")
    click(page, "transit-next")
    assert_route(page, "十二时辰漫画")
    page.locator("[data-action='comic1-answer'][data-value='马']").click()
    page.locator("[data-action='comic2-answer'][data-value='午时']").click()
    click(page, "history-next")

    assert_route(page, "七纹样转盘")
    page.locator("#wheelAnswer").fill("鼠、牛、虎、兔、马、猴、猪")
    click(page, "wheel-submit")
    click(page, "history-next")
    assert_route(page, "收好转盘")
    click(page, "wheel-handoff-next")

    assert_route(page, "实体水显纸")
    page.locator("#waterAnswer").fill("马首")
    click(page, "water-submit")
    click(page, "history-next")
    assert_route(page, "晾干水显纸")
    click(page, "water-handoff-next")

    assert_route(page, "寻找雨果雕像")
    click(page, "transit-next")
    assert_route(page, "第四站 · 雨果雕像")
    click(page, "s4intro-next")
    assert_route(page, "时间轴排序")
    for card_id, year in (
        ("c1747", "1747"),
        ("c1760", "1760"),
        ("c1860", "1860"),
        ("c1861", "1861"),
        ("c2010", "2010"),
    ):
        page.locator(f"[data-action='timeline-card'][data-id='{card_id}']").click()
        page.locator(f"[data-action='timeline-slot'][data-year='{year}']").click()
    expect(page.locator(".timeline-slot.is-filled")).to_have_count(5)
    click(page, "timeline-next")
    click(page, "history-next")

    assert_route(page, "最后一道锁")
    password = "".join(page.locator(".date-digit").all_text_contents())
    assert password.isdigit() and len(password) == 8, password
    page.locator("#passwordAnswer").fill(password)
    click(page, "password-submit")
    expect(page.get_by_text("日期密码成立")).to_be_visible()
    click(page, "password-next")

    assert_route(page, "第二十一图")
    click(page, "finale-reveal")
    expect(page.locator(".plate-reveal img")).to_be_visible()
    click(page, "finale-story")
    assert_route(page, "尾声 · 第二十一图")
    click(page, "finale-sign")
    assert_route(page, "署名")
    page.locator("#signName").fill("浏览器考察员")
    click(page, "sign-submit")

    assert_route(page, "考察报告")
    expect(page.locator(".record-grid .record-photo img")).to_have_count(4)
    page.wait_for_function(
        "Array.from(document.images).every(image => image.complete && image.naturalWidth > 0)"
    )
    page.screenshot(path=os.path.join(artifacts, "h5-report-desktop.png"), full_page=True)
    with page.expect_download(timeout=30000) as download_info:
        click(page, "export-report")
    download = download_info.value
    assert download.suggested_filename.startswith("第二十一图-考察报告-")
    assert os.path.getsize(download.path()) > 100_000

    click(page, "collect-report")
    expect(page.get_by_role("button", name="已收入考察手册")).to_be_disabled()
    click(page, "report-next")
    assert_route(page, "考察完结")
    click(page, "open-handbook")

    assert_route(page, "考察手册")
    expect(page.locator(".handbook-slot i", has_text="已录")).to_have_count(4)
    expect(page.locator(".history-item:not(:disabled)")).to_have_count(8)
    state = page.evaluate("JSON.parse(localStorage.getItem('plate21_h5_session_v1'))")
    assert len(state["cards"]) == 8
    assert len(state["photos"]) == 4
    assert all(state["stations"].values())
    assert state["reportCollected"] is True

    page.reload(wait_until="networkidle")
    assert_route(page, "考察手册")
    click(page, "back")
    assert_route(page, "考察完结")
    click(page, "ending-home")
    assert_route(page, "西洋楼铜版图")
    click(page, "continue")
    assert_route(page, "考察报告")
    click(page, "ask-reset")
    expect(page.locator(".modal-title")).to_have_text("确认重新考察？")
    click(page, "confirm-reset")
    assert_route(page, "西洋楼铜版图")
    reset_state = page.evaluate(
        "JSON.parse(localStorage.getItem('plate21_h5_session_v1'))"
    )
    assert reset_state["puzzles"] == {}
    assert reset_state["photos"] == {}

    assert console_errors == [], console_errors
    assert page_errors == [], page_errors
    assert failed_requests == [], failed_requests
    assert bad_responses == [], bad_responses
    context.close()


def run_mobile_smoke(browser, artifacts, base_url):
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    page.goto(base_url, wait_until="networkidle")
    assert_route(page, "西洋楼铜版图")
    expect(page.locator(".archive-nav")).to_be_hidden()
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    page.screenshot(path=os.path.join(artifacts, "h5-cover-mobile.png"), full_page=True)
    click(page, "open-directory")
    expect(page.locator(".directory-link")).to_have_count(18)
    expect(page.locator(".modal-card")).to_be_visible()
    context.close()


def main():
    with tempfile.TemporaryDirectory(prefix="plate21-h5-") as artifacts:
        with serve_h5() as base_url:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(
                    headless=True, args=["--no-proxy-server"]
                )
                run_full_flow(browser, artifacts, base_url)
                run_mobile_smoke(browser, artifacts, base_url)
                browser.close()
        print("OK h5 full-flow=1 mobile=390x844 report-download=1 resources=clean")


if __name__ == "__main__":
    main()
