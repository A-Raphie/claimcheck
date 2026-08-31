#!/usr/bin/env python3
"""Claimcheck per-scene demo runner (walletless OS path per desktop-demo skill).
Scenes are recorded as separate segments on the empty fullscreen space, driven by
cliclick + AppleScript, verified by extracted last-frame screenshots. Audio beats
are muxed per segment at join time (never played during capture).
"""
import subprocess, time, os, sys, json

SEG_DIR = os.path.join(os.path.dirname(__file__), "segs")
DEV = "2"  # Capture screen 0
FPS = 30

def sh(cmd, timeout=120):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)

def osa(script):
    return sh(f"osascript -e {json.dumps(script)}")

def cliclick(cmd):
    sh(f"cliclick {cmd}")

DEMO_WINDOW_FLAG = "/tmp/claimcheck-demo-window"

def fullscreen_front(url=None):
    """Open ONE dedicated demo window (first call), then navigate and fill it."""
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
    if url:
        osa(f'tell application "Google Chrome" to set URL of active tab of front window to "{url}"')
    time.sleep(1.4)

def record(name, seconds):
    os.makedirs(SEG_DIR, exist_ok=True)
    out = os.path.join(SEG_DIR, f"{name}.mov")
    if os.path.exists(out):
        os.remove(out)
    sh(f"ffmpeg -f avfoundation -framerate {FPS} -capture_cursor 1 -i \"{DEV}\" -t {seconds} "
       f"-c:v libx264 -preset ultrafast -b:v 6000k -pix_fmt yuv420p {out} -y")
    d = sh(f"ffprobe -v error -show_entries format=duration -of csv=p=0 {out}").stdout.strip()
    print(f"[{name}] recorded {d}s -> {out}")
    return out

def last_frame(name):
    out = os.path.join(SEG_DIR, f"{name}-last.png")
    sh(f"ffmpeg -y -sseof -0.4 -i {os.path.join(SEG_DIR, name + '.mov')} -frames:v 1 {out}")
    return out

def scene_landing(sec):
    fullscreen_front("https://claimcheck-three-snowy.vercel.app/")
    time.sleep(2.0)
    t0 = time.time()
    def act():
        pass
    # gentle scroll: hero -> stats
    time.sleep(min(2.5, max(0.5, sec - (time.time() - t0) - 3)))
    cliclick("w:0,0 dr:1,0")  # scroll down (cliclick wheel syntax: w:x,y)
    time.sleep(1.2)
    cliclick("w:0,0 dr:1,0")
    time.sleep(max(0.5, sec - (time.time() - t0)))

def scene_try(sec):
    fullscreen_front("https://claimcheck-three-snowy.vercel.app/try")
    time.sleep(2.0)
    t0 = time.time()
    # click the textarea (center-upper area of the tool card)
    cliclick("c:855,565")
    time.sleep(0.4)
    for i, line in enumerate(["All tests pass after this change.", "The bounded cache reduces memory usage by 30 percent."]):
        if i > 0:
            osa('tell application "System Events" to key code 36')
            time.sleep(0.25)
        osa(f'tell application "System Events" to keystroke {json.dumps(line)}')
        time.sleep(0.25)
    time.sleep(0.6)
    # click Plan the evidence (below textarea)
    cliclick("c:497,709")
    time.sleep(0.4)
    remaining = sec - (time.time() - t0)
    time.sleep(max(1.0, remaining - 1.0))

def scene_terminal(sec):
    osa('tell application "Terminal" to activate')
    time.sleep(0.5)
    osa('tell application "System Events" to set frontmost of process "Terminal" to true')
    time.sleep(0.4)
    t0 = time.time()
    cmd = ('cd /Users/raphie/Documents/Hackathons/claimcheck && clear && '
           'node dist/cli.js verify --repo eval/cases/02-tests-pass-false/repo '
           '--claims-file demo-take/demo-claims.md && '
           'sleep 1 && head -12 eval-results/advanced-iter2/summary.md')
    # dedicated NEW window: no other session can ever appear on camera
    osa(f'tell application "Terminal" to do script "{cmd}"')
    time.sleep(1.2)
    osa('tell application "System Events" to tell process "Terminal" to set size of front window to {1710, 1000}')
    osa('tell application "System Events" to tell process "Terminal" to set position of front window to {0, 25}')
    # give the real model its ~40-60s on camera, re-fronting Terminal so
    # nothing (notifications, other apps) steals the frame mid-take
    while time.time() - t0 < sec:
        time.sleep(4)
        osa('tell application "System Events" to set frontmost of process "Terminal" to true')

def scene_report(sec):
    fullscreen_front("https://claimcheck-three-snowy.vercel.app/report?open=evidence?open=evidence")
    time.sleep(2.5)
    t0 = time.time()
    # scroll to cards
    cliclick("w:0,0 dr:1,0")
    time.sleep(0.8)
    cliclick("w:0,0 dr:1,0")
    time.sleep(1.2)
    remaining = sec - (time.time() - t0)
    time.sleep(max(1.0, remaining - 1.0))

def scene_close(sec):
    fullscreen_front("https://claimcheck-three-snowy.vercel.app/selfaudit.html")
    time.sleep(2.5)
    t0 = time.time()
    time.sleep(1.5)
    fullscreen_front("https://claimcheck-three-snowy.vercel.app/")
    remaining = sec - (time.time() - t0)
    time.sleep(max(2.0, remaining))

# durations from vo/track.wav beat windows (his pauses are the scene cuts)
SCENES = [
    ("s1-landing", 16.2, scene_landing),
    ("s2-try", 23.0, scene_try),
    ("s3-terminal", 35.6, scene_terminal),
    ("s4-report", 19.2, scene_report),
    ("s5-close", 9.9, scene_close),
]

if __name__ == "__main__":
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for name, sec, fn in SCENES:
        if only and only not in name:
            continue
        print(f"=== recording {name} ({sec}s) ===")
        fn(sec)
        record(name, sec)
        print(f"[{name}] last frame: {last_frame(name)}")
