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

def drift(x1, y1, x2, y2, seconds):
    # human-like travel: cliclick's animated dm: moves along a slight arc with
    # overshoot + settle. Velocity bell: slow leave, fast middle, slow arrive.
    dx, dy = x2 - x1, y2 - y1
    dist = max(1.0, (dx * dx + dy * dy) ** 0.5)
    px, py = -dy / dist, dx / dist  # perpendicular
    arc = min(18.0, dist * 0.12)    # gentle arc offset
    budget = max(0.3, seconds - 0.25)
    seg = budget / 3.0
    cliclick(f"m:{x1},{y1}")
    time.sleep(0.06)
    cliclick(f"dm:{int(x1 + dx * 0.4 + px * arc)},{int(y1 + dy * 0.4 + py * arc)}")
    time.sleep(seg)
    cliclick(f"dm:{int(x1 + dx * 0.85 + px * arc * 0.4)},{int(y1 + dy * 0.85 + py * arc * 0.4)}")
    time.sleep(seg)
    cliclick(f"dm:{int(x2 + dx * 0.03)},{int(y2 + dy * 0.03)}")  # overshoot
    time.sleep(seg * 0.5)
    cliclick(f"m:{x2},{y2}")  # settle back
    time.sleep(seg * 0.5)

def click(x, y):
    move(x, y)
    time.sleep(0.25)
    cliclick(f"c:{x},{y}")

_drift_n = [0]

def drift(x1, y1, x2, y2, seconds):
    # human travel: animated arc moves, velocity bell, overshoot-settle.
    # every call lands somewhere slightly different and arcs the other way.
    _drift_n[0] += 1
    side = 1 if _drift_n[0] % 2 else -1
    jx = ((_drift_n[0] * 37) % 19) - 9   # deterministic jitter, +-9px
    jy = ((_drift_n[0] * 53) % 17) - 8
    x2, y2 = x2 + jx, y2 + jy
    dx, dy = x2 - x1, y2 - y1
    dist = max(1.0, (dx * dx + dy * dy) ** 0.5)
    px, py = -dy / dist, dx / dist
    arc = side * min(20.0, dist * 0.14)
    budget = max(0.3, seconds - 0.2)
    seg = budget / 3.0
    cliclick(f"m:{x1},{y1}")
    time.sleep(0.05)
    cliclick(f"dm:{int(x1 + dx * 0.4 + px * arc)},{int(y1 + dy * 0.4 + py * arc)}")
    time.sleep(seg)
    cliclick(f"dm:{int(x1 + dx * 0.85 + px * arc * 0.4)},{int(y1 + dy * 0.85 + py * arc * 0.4)}")
    time.sleep(seg)
    cliclick(f"dm:{int(x2 + dx * 0.04)},{int(y2 + dy * 0.04)}")  # overshoot
    time.sleep(seg * 0.45)
    cliclick(f"m:{x2},{y2}")  # settle
    time.sleep(seg * 0.55)

def wiggle(x, y, seconds):
    # micro-drift so the cursor never freezes during narration holds
    t_end = time.time() + seconds
    i = 0
    while time.time() < t_end:
        dx = ((i * 13) % 9) - 4
        dy = ((i * 7) % 7) - 3
        cliclick(f"m:{x + dx},{y + dy}")
        time.sleep(0.22)
        i += 1

def glide_scroll(clicks):
    # arrow-key glide: 14 small steps, smooth on camera
    code = 125 if clicks > 0 else 126
    for _ in range(abs(clicks) * 7):
        osa(f'tell application "System Events" to key code {code}')
        time.sleep(0.045)

def scroll(clicks):
    # Page Down for big jumps; small click counts use arrow glide
    if abs(clicks) <= 2:
        glide_scroll(clicks)
        return
    for _ in range(2 if clicks > 0 else 2):
        code = 121 if clicks > 0 else 116
        osa(f'tell application "System Events" to key code {code}')
        time.sleep(0.3)



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
    drift(500, 430, 855, 480, 1.4)     # into the headline as VO opens
    time.sleep(0.5)
    drift(855, 480, 520, 1000, 1.5)    # travel down the claims
    scroll(4)                          # glide: hero -> idea panels
    drift(420, 480, 1300, 520, 1.6)    # sweep the idea panels
    scroll(4)                          # glide: idea -> stats
    drift(450, 480, 855, 430, 1.6)     # sweep the stat cards
    scroll(3)
    wiggle(855, 500, 1.0)
    scroll(-12)                        # glide back to hero
    drift(700, 500, 497, 890, 1.4)     # travel to the CTA
    click(497, 890)                    # CLICK through to the planner (segues into S2)
    time.sleep(1.6)


def act_try():
    drift(400, 400, 855, 565, 1.2)     # travel to the textarea
    click(855, 565)
    time.sleep(0.3)
    lines = ["All tests pass after this change.",
             "The bounded cache reduces memory usage by 30 percent."]
    for i, line in enumerate(lines):
        if i > 0:
            osa('tell application "System Events" to key code 36')
            time.sleep(0.25)
        osa(f'tell application "System Events" to keystroke {json.dumps(line)}')
        time.sleep(0.35)
    time.sleep(0.4)
    drift(855, 640, 497, 709, 1.0)     # travel to the button
    click(497, 709)                    # Plan the evidence
    time.sleep(3.0)                    # results animate in
    drift(500, 900, 560, 640, 1.2)     # onto C1
    time.sleep(0.7)
    drift(560, 640, 700, 900, 1.4)     # onto C2 settle row
    wiggle(700, 900, 1.4)
    scroll(2)
    drift(500, 1050, 900, 1050, 1.2)
    time.sleep(1.6)


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
    move(300, 380)
    while time.time() - t0 < 26:
        time.sleep(3.5)
        osa('tell application "System Events" to set frontmost of process "Terminal" to true')
        y = 380 + int((time.time() - t0) * 9) % 260
        drift(300, y, 700, y + 30, 0.8)
    time.sleep(max(0.5, 35.6 - (time.time() - t0)))


def act_report():
    time.sleep(2.4)                    # hold: receipt + diff open
    drift(500, 430, 855, 620, 1.2)     # cursor onto the diff
    scroll(4)                          # glide through the tinted diff
    time.sleep(0.8)
    drift(855, 540, 500, 620, 1.0)
    scroll(4)                          # glide diff -> cards
    time.sleep(1.4)
    drift(430, 620, 700, 700, 1.4)     # sweep the verdict cards
    scroll(3)                          # cards -> settle line + ledger
    drift(700, 800, 855, 700, 1.0)
    scroll(-14)                        # glide back to the verdicts
    wiggle(500, 400, 1.2)


def act_close():
    drift(500, 480, 900, 620, 1.6)     # sweep the self-audit verdicts
    time.sleep(0.8)
    goto(BASE + "/")                   # nav to the landing
    drift(400, 430, 855, 500, 1.4)     # sweep the hero
    time.sleep(0.6)


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
