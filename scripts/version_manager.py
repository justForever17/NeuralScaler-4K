# -*- coding: utf-8 -*-
"""
NeuralScaler 4K - Unified Version Manager
Handles semver bumping, multi-file version synchronization, and CI release consistency gating.
"""

import os
import sys
import json
import re
import argparse

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

PKG_JSON = os.path.join(PROJECT_ROOT, "package.json")
PKG_LOCK = os.path.join(PROJECT_ROOT, "package-lock.json")
CARGO_TOML = os.path.join(PROJECT_ROOT, "src-tauri", "Cargo.toml")

SEMVER_PATTERN = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?$")

def get_package_json_version():
    if not os.path.exists(PKG_JSON):
        raise FileNotFoundError(f"package.json not found at {PKG_JSON}")
    with open(PKG_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("version", "").strip()

def parse_semver(v_str):
    m = SEMVER_PATTERN.match(v_str.strip().lstrip("v"))
    if not m:
        raise ValueError(f"Invalid semver version format: '{v_str}'")
    major, minor, patch = int(m.group(1)), int(m.group(2)), int(m.group(3))
    prerelease = m.group(4)
    return major, minor, patch, prerelease

def compute_bump(current_version, bump_type):
    major, minor, patch, _ = parse_semver(current_version)
    bump_type = bump_type.lower()
    if bump_type == "patch":
        patch += 1
    elif bump_type == "minor":
        minor += 1
        patch = 0
    elif bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    else:
        raise ValueError(f"Unknown bump type '{bump_type}', must be patch, minor, or major.")
    return f"{major}.{minor}.{patch}"

def apply_version(new_version):
    parse_semver(new_version) # Validate format
    print(f"[VersionManager] Applying new version: {new_version}")

    # 1. Update package.json
    if os.path.exists(PKG_JSON):
        with open(PKG_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        old_v = data.get("version")
        data["version"] = new_version
        with open(PKG_JSON, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"  + package.json: {old_v} -> {new_version}")

    # 2. Update package-lock.json if exists
    if os.path.exists(PKG_LOCK):
        with open(PKG_LOCK, "r", encoding="utf-8") as f:
            lock_data = json.load(f)
        lock_data["version"] = new_version
        if "packages" in lock_data and "" in lock_data["packages"]:
            lock_data["packages"][""]["version"] = new_version
        with open(PKG_LOCK, "w", encoding="utf-8") as f:
            json.dump(lock_data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"  + package-lock.json updated to {new_version}")

    # 3. Update Cargo.toml if exists
    if os.path.exists(CARGO_TOML):
        with open(CARGO_TOML, "r", encoding="utf-8") as f:
            content = f.read()
        new_content = re.sub(r'version\s*=\s*"[^"]+"', f'version = "{new_version}"', content, count=1)
        with open(CARGO_TOML, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"  + src-tauri/Cargo.toml updated to {new_version}")

    print(f"[VersionManager] Successfully synchronized version {new_version} across all configuration files.")
    return new_version

def check_consistency(expected_tag=None):
    print("[VersionManager] Checking version consistency...")
    pkg_v = get_package_json_version()
    print(f"  * package.json version: {pkg_v}")

    errors = []
    # Check package-lock.json
    if os.path.exists(PKG_LOCK):
        with open(PKG_LOCK, "r", encoding="utf-8") as f:
            lock_data = json.load(f)
        lock_v = lock_data.get("version")
        if lock_v != pkg_v:
            errors.append(f"package-lock.json version ({lock_v}) does not match package.json ({pkg_v})")

    # Check Cargo.toml
    if os.path.exists(CARGO_TOML):
        with open(CARGO_TOML, "r", encoding="utf-8") as f:
            cargo_content = f.read()
        m = re.search(r'version\s*=\s*"([^"]+)"', cargo_content)
        if m and m.group(1) != pkg_v:
            errors.append(f"src-tauri/Cargo.toml version ({m.group(1)}) does not match package.json ({pkg_v})")

    # If tag is specified or present in environment
    tag = expected_tag or os.environ.get("GITHUB_REF_NAME") or os.environ.get("RELEASE_TAG")
    if tag and tag.startswith("v"):
        tag_v = tag.lstrip("v")
        if tag_v != pkg_v:
            errors.append(f"Git Tag '{tag}' (version {tag_v}) does not match package.json version ({pkg_v})! "
                          f"Did you forget to bump package.json before tagging?")

    if errors:
        print("[VersionManager] Consistency Gate FAILED:")
        for err in errors:
            print(f"  [ERROR] {err}")
        return False
    else:
        print(f"[VersionManager] Consistency Gate PASSED (Version: {pkg_v})")
        return True

def main():
    parser = argparse.ArgumentParser(description="NeuralScaler Unified Version Manager")
    subparsers = parser.add_subparsers(dest="command", help="Sub-commands")

    # get command
    subparsers.add_parser("get", help="Print current package version")

    # check command
    check_parser = subparsers.add_parser("check", help="Check version consistency across files and git tag")
    check_parser.add_argument("--tag", help="Expected git tag (e.g. v2.2.1)")

    # bump command
    bump_parser = subparsers.add_parser("bump", help="Bump version by patch, minor, or major")
    bump_parser.add_argument("type", choices=["patch", "minor", "major"], help="Bump semver segment")

    # set command
    set_parser = subparsers.add_parser("set", help="Explicitly set version")
    set_parser.add_argument("version", help="New semver version (e.g. 2.2.1)")

    args = parser.parse_args()

    if args.command == "get":
        print(get_package_json_version())
        sys.exit(0)
    elif args.command == "check":
        ok = check_consistency(args.tag)
        sys.exit(0 if ok else 1)
    elif args.command == "bump":
        curr = get_package_json_version()
        new_v = compute_bump(curr, args.type)
        apply_version(new_v)
        sys.exit(0)
    elif args.command == "set":
        apply_version(args.version.lstrip("v"))
        sys.exit(0)
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
