import sys
import time
import subprocess
import urllib.request
import json

def test_live_server_boot():
    print("[INFO] Starting FastAPI live server on port 8000...")
    proc = subprocess.Popen(
        [sys.executable, "backend/run.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    try:
        # Give server up to 10 seconds to bind port
        healthy = False
        for attempt in range(20):
            time.sleep(0.5)
            # Check if process died
            if proc.poll() is not None:
                stdout, stderr = proc.communicate()
                print("[ERROR] Server process died with code", proc.returncode)
                print("STDOUT:", stdout.decode("utf-8", errors="replace"))
                print("STDERR:", stderr.decode("utf-8", errors="replace"))
                break

            try:
                with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=2) as res:
                    if res.status == 200:
                        data = json.loads(res.read().decode())
                        if data.get("status") == "healthy":
                            healthy = True
                            print("[SUCCESS] Live Server Health Check passed:", data)
                            break
            except Exception:
                pass

        assert healthy, "Failed to connect to http://127.0.0.1:8000/api/health within timeout"

        # Verify frontend index.html served at root
        with urllib.request.urlopen("http://127.0.0.1:8000/", timeout=2) as res:
            assert res.status == 200
            html = res.read().decode()
            assert "Wally" in html
            assert "headerProfilePill" in html
            print("[SUCCESS] Frontend root / successfully served by FastAPI.")

        # Verify demo login endpoint
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/auth/demo",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=2) as res:
            assert res.status == 200
            auth_data = json.loads(res.read().decode())
            assert "access_token" in auth_data
            print("[SUCCESS] Live Auth Endpoint returned token for:", auth_data["user"]["name"])

        print("\n>>> ALL LIVE SERVER TESTS PASSED SUCCESSFULLY! <<<")

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
        print("[INFO] Server process shut down cleanly.")

if __name__ == "__main__":
    test_live_server_boot()
