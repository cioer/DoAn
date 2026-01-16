#!/usr/bin/env python3
"""
Script to generate all forms (1b - 18b)
Run: python3 generate_all_forms.py
"""
import subprocess
import sys

FORMS = [
    "generate_1b_only.py",
    "generate_2b_only.py",
    "generate_3b_only.py",
    "generate_4b_only.py",
    "generate_5b_only.py",
    "generate_6b_only.py",
    "generate_7b_only.py",
    "generate_8b_only.py",
    "generate_9b_only.py",
    "generate_10b_only.py",
    "generate_11b_only.py",
    "generate_12b_only.py",
    "generate_13b_only.py",
    "generate_14b_only.py",
    "generate_18b_only.py",
]

def main():
    print("=" * 60)
    print("GENERATING ALL FORMS (1b - 18b)")
    print("=" * 60)

    success = []
    failed = []

    for form in FORMS:
        print(f"\n▶ Running {form}...")
        try:
            result = subprocess.run(
                [sys.executable, form],
                capture_output=True,
                text=True,
                timeout=60
            )
            if result.returncode == 0:
                print(f"✅ {form} completed")
                success.append(form)
            else:
                print(f"❌ {form} failed")
                print(result.stderr)
                failed.append(form)
        except subprocess.TimeoutExpired:
            print(f"⏱️ {form} timed out")
            failed.append(form)
        except Exception as e:
            print(f"❌ {form} error: {e}")
            failed.append(form)

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"✅ Success: {len(success)}/{len(FORMS)}")
    print(f"❌ Failed: {len(failed)}/{len(FORMS)}")

    if failed:
        print("\nFailed forms:")
        for f in failed:
            print(f"  - {f}")

if __name__ == "__main__":
    main()
