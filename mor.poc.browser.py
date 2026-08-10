from pathlib import Path

from playwright.sync_api import sync_playwright


OUTPUT = Path(r"C:\Users\ASUS\AppData\Local\Temp\opencode")


def compact(text):
    return " ".join((text or "").split())


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    console_messages = []
    page_errors = []
    failed_requests = []
    bad_responses = []

    page.on("console", lambda message: console_messages.append(
        f"{message.type}: {message.text}"
    ))
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("requestfailed", lambda request: failed_requests.append(
        f"{request.method} {request.url}: {request.failure}"
    ))
    page.on("response", lambda response: bad_responses.append(
        f"{response.status} {response.url}"
    ) if response.status >= 400 else None)

    def report(label):
        page.wait_for_timeout(800)
        text = compact(page.locator("body").inner_text())
        print(f"[{label}] url={page.url}")
        print(f"[{label}] text={text[:1200]}")
        print(f"[{label}] buttons={page.get_by_role('button').count()}")
        page.screenshot(path=OUTPUT / f"mor-poc-{label}.png", full_page=True)

    page.goto("http://127.0.0.1:8877/", wait_until="networkidle")
    report("home")
    api_names = [
        "canvasToTempFilePath",
        "chooseMedia",
        "createSelectorQuery",
        "createVideoContext",
        "getStorageSync",
        "getSystemInfoSync",
        "getWindowInfo",
        "loadFontFace",
        "navigateBack",
        "navigateTo",
        "nextTick",
        "openSetting",
        "previewImage",
        "redirectTo",
        "reLaunch",
        "removeSavedFile",
        "removeStorageSync",
        "saveFile",
        "saveImageToPhotosAlbum",
        "setStorageSync",
        "showToast",
        "vibrateShort",
    ]
    api_matrix = page.evaluate(
        "names => Object.fromEntries(names.map(name => "
        "[name, typeof (window.myPro || {})[name]]))",
        api_names,
    )
    print(f"[api-matrix] {api_matrix}")

    page.get_by_text("进入", exact=True).click()
    page.wait_for_load_state("networkidle")
    report("cover")

    start = page.get_by_text("开 始 考 察", exact=True)
    start.wait_for(state="visible")
    start.click()
    page.wait_for_load_state("networkidle")
    report("prologue")

    page.locator(".next-control").click()
    report("envelope")

    open_envelope = page.get_by_text("我已拆开并读完", exact=True)
    if open_envelope.count():
        open_envelope.click()
        page.wait_for_timeout(1200)
        report("letter")

    page.goto(
        "http://127.0.0.1:8877/#/plate21/module/pages/s1-decode/s1-decode",
        wait_until="networkidle",
    )
    report("decode")

    page.get_by_role("textbox").fill("黄花阵")
    page.get_by_text("核 对 地 点", exact=True).click()
    report("decode-solved")

    page.goto(
        "http://127.0.0.1:8877/#/plate21/module/pages/s2-blend/s2-blend",
        wait_until="networkidle",
    )
    report("photos")
    page.get_by_text("相册补录", exact=True).first.click()
    report("photos-after-click")

    page.goto(
        "http://127.0.0.1:8877/#/plate21/module/pages/report/report",
        wait_until="networkidle",
    )
    report("report")
    page.get_by_text("保存到相册", exact=True).click()
    report("report-after-save")

    print("[console]")
    for item in console_messages:
        print(item)
    print("[page-errors]")
    for item in page_errors:
        print(item)
    print("[failed-requests]")
    for item in failed_requests:
        print(item)
    print("[bad-responses]")
    for item in bad_responses:
        print(item)

    browser.close()
