#!/usr/bin/env python3
"""Claimcheck demo runner v2 (walletless OS path per desktop-demo skill).

v2: every scene = prepare() (navigate, settle, park cursor) THEN record() THEN
act() (choreography inside the recording). Frame 1 of every segment is the
loaded page: no gray head. Scene durations come from his VO beat windows
(vo/beats.json) so the video adapts to his narration. No GitHub on camera.
"""
import subprocess, time, os, sys, json

SEG_DIR = os.path.join(os.path.dirname(__file__), "segs")
DEV = "2"  # Capture screen 0
FPS = 30
PREROLL = 3  # seconds captured before act(); trimmed at mux
DEMO_WINDOW_FLAG = "/tmp/claimcheck-demo-window"
BASE = "https://claimcheck-three-snowy.vercel.app"

def sh(cmd, timeout=120):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)

def osa(script):
    return sh(f"osascript -e {json.dumps(script)}")

def cliclick(cmd):
    sh(f"cliclick {cmd}")

def move(x, y):
    cliclick(f"m:{x},{y}")
    time.sleep(0.2)

def click(x, y):
    move(x, y)
    time.sleep(0.25)
    cliclick(f"c:{x},{y}")

def scroll(clicks):
    # proof-gated scroll: Page Down/Up glides, verified the page moved
    pre, post = "/tmp/cc-pre.png", "/tmp/cc-post.png"
    sh(f"screencapture -x {pre}")
    code = 121 if clicks > 0 else 116  # Page Down / Page Up
    for _ in range(max(1, abs(clicks))):
        osa(f'tell application "System Events" to key code {code}')
        time.sleep(0.15)
    sh(f"screencapture -x {post}")
    if sh(f"cmp -s {pre} {post}").returncode == 0:
        # page did not move: arrow-key fallback, then hard proof again
        code = 125 if clicks > 0 else 126
        for _ in range(14):
            osa(f'tell application "System Events" to key code {code}')
            time.sleep(0.04)
        sh(f"screencapture -x {post}")
        if sh(f"cmp -s {pre} {post}").returncode == 0:
            print(f"  SCROLL PROOF FAILED ({clicks})")

def demo_window():
    """Chrome frontmost, ONE dedicated demo window, filled to the frame."""
    osa('tell application "Google Chrome" to activate')
    time.sleep(0.8)
    osa('tell application "System Events" to set frontmost of process "Google Chrome" to true')
    time.sleep(0.4)
    if not os.path.exists(DEMO_WINDOW_FLAG):
        osa('tell application "Google Chrome" to make new window')
        time.sleep(1.0)
        open(DEMO_WINDOW_FLAG, "w").write("demo window")
    osa('tell application "Google Chrome" to set bounds of front window to {0, 24, 1710, 1104}')
    time.sleep(0.5)

def goto(url):
    demo_window()
    osa(f'tell application "Google Chrome" to set URL of active tab of front window to "{url}"')
    time.sleep(2.2)

def record_start(name, seconds):
    """Start capture in the background; the scene's act() runs INSIDE it."""
    os.makedirs(SEG_DIR, exist_ok=True)
    out = os.path.join(SEG_DIR, f"{name}.mov")
    if os.path.exists(out):
        os.remove(out)
    proc = subprocess.Popen(
        f"ffmpeg -f avfoundation -framerate {FPS} -capture_cursor 1 -i \"{DEV}\" -t {seconds} "
        f"-c:v libx264 -preset ultrafast -b:v 6000k -pix_fmt yuv420p {out} -y",
        shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.6)  # capture warmup
    return proc

def record_wait(proc, name):
    proc.wait()
    d = sh(f"ffprobe -v error -show_entries format=duration -of csv=p=0 {os.path.join(SEG_DIR, name + '.mov')}").stdout.strip()
    print(f"[{name}] recorded {d}s")
    return d

def last_frame(name):
    out = os.path.join(SEG_DIR, f"{name}-last.png")
    sh(f"ffmpeg -y -sseof -0.4 -i {os.path.join(SEG_DIR, name + '.mov')} -frames:v 1 {out}")
    return out

# ---------------- prepares (before recorder starts) ----------------

def prep_landing():
    goto(BASE + "/")
    move(855, 400)

def prep_try():
    goto(BASE + "/try")
    move(855, 300)

def prep_terminal():
    osa('tell application "Terminal" to activate')
    time.sleep(0.5)
    osa('tell application "System Events" to set frontmost of process "Terminal" to true')
    time.sleep(0.3)
    move(855, 500)

def prep_report():
    goto(BASE + "/report?open=evidence")

def prep_close():
    goto(BASE + "/selfaudit")

# ---------------- acts (inside the recording) ----------------

def act_landing():
    time.sleep(1.4)                # hero hold, VO opens
    scroll(3)                      # hero -> whole-idea panels
    time.sleep(1.8)
    move(700, 620)
    scroll(3)                      # idea -> problem stats
    time.sleep(1.8)
    scroll(2)                      # stats -> problem copy
    time.sleep(1.6)
    scroll(-9)                     # back to the hero
    time.sleep(1.2)
    move(497, 890)                 # hover the primary CTA
    time.sleep(2.2)

def act_try():
    time.sleep(1.4)                # page hold
    click(855, 565)                # focus textarea
    time.sleep(0.4)
    lines = ["All tests pass after this change.",
             "The bounded cache reduces memory usage by 30 percent."]
    for i, line in enumerate(lines):
        if i > 0:
            osa('tell application "System Events" to key code 36')
            time.sleep(0.3)
        osa(f'tell application "System Events" to keystroke {json.dumps(line)}')
        time.sleep(0.4)
    time.sleep(0.8)
    move(460, 709)
    time.sleep(0.4)
    click(497, 709)                # Plan the evidence
    time.sleep(3.0)                # results animate in
    scroll(2)                      # reveal C1 + C2 rows
    time.sleep(2.2)
    move(560, 640)                 # hover the PERFORMANCE settle row
    time.sleep(2.2)
    scroll(2)                      # claims.json handoff
    time.sleep(3.0)

def act_terminal():
    t0 = time.time()
    cmd = ('cd /Users/raphie/Documents/Hackathons/claimcheck && clear && '
           'node dist/cli.js verify --repo eval/cases/02-tests-pass-false/repo '
           '--claims-file demo-take/demo-claims.md && '
           'sleep 1 && head -14 eval-results/advanced-iter2/summary.md')
    osa(f'tell application "Terminal" to do script "{cmd}"')
    time.sleep(1.0)
    osa('tell application "System Events" to tell process "Terminal" to set size of front window to {1710, 1000}')
    osa('tell application "System Events" to tell process "Terminal" to set position of front window to {0, 25}')
    move(855, 400)
    while time.time() - t0 < 26:
        time.sleep(4)
        osa('tell application "System Events" to set frontmost of process "Terminal" to true')
    time.sleep(max(0.5, 35.6 - (time.time() - t0)))

def act_report():
    time.sleep(2.2)                # hold: receipt + tinted diff (already open)
    scroll(2)                      # through the diff
    time.sleep(1.4)
    scroll(3)                      # diff -> weighted cards
    time.sleep(2.0)
    scroll(3)                      # cards -> settle line + ledger
    time.sleep(2.2)
    scroll(-9)                     # back to the top verdicts
    time.sleep(2.0)

def act_close():
    time.sleep(2.4)                # self-audit report hold
    goto(BASE + "/")               # nav motion to the landing
    time.sleep(1.2)
    move(700, 430)
    time.sleep(1.2)

SCENES = [
    ("s1-landing", 16.2, prep_landing, act_landing),
    ("s2-try", 23.0, prep_try, act_try),
    ("s3-terminal", 35.6, prep_terminal, act_terminal),
    ("s4-report", 19.2, prep_report, act_report),
    ("s5-close", 9.9, prep_close, act_close),
]

if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for name, sec, prep, act in SCENES:
        if only and only not in name:
            continue
        print(f"=== {name}: prepare ===")
        prep()
        time.sleep(0.8)
        print(f"=== {name}: recording {sec + PREROLL}s (3s pre-roll, trimmed at mux) ===")
        rec = record_start(name, sec + PREROLL)
        time.sleep(PREROLL + 0.2)
        act_start = time.time()
        act()
        record_wait(rec, name)
        print(f"[{name}] last frame: {last_frame(name)}")
