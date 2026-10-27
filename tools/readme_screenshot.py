# The README picture (docs/overview-1.5.1.png): run from anywhere with Playwright installed (pip install playwright).
from playwright.sync_api import sync_playwright
import os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=2,color_scheme='light')
    pg.goto('file://'+os.path.join(ROOT,'index.html'));pg.wait_for_function('window.__rd',timeout=150000);pg.wait_for_timeout(800)
    pg.click('[data-act=tblIns]');pg.wait_for_timeout(500)
    pg.keyboard.press('Control+0');pg.wait_for_timeout(500)
    pg.mouse.move(5,5);pg.wait_for_timeout(4500)  # the message over the sheet goes after 4 s
    pg.screenshot(path=os.path.join(ROOT,'docs','overview-1.5.1.png'));b.close()
