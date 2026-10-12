#!/usr/bin/env python3
"""Populate missing amenity caches through the authenticated RentNest API."""

import argparse
import csv
import getpass
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    # Never forward the login credentials or bearer token to another endpoint.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class ApiError(Exception):
    pass


class Client:
    def __init__(self, base):
        parsed = urlsplit(base)
        if (parsed.scheme not in ("http", "https") or not parsed.hostname
                or parsed.username or parsed.password or parsed.query or parsed.fragment
                or parsed.path not in ("", "/")):
            raise ValueError("Use an API origin such as http://localhost:8080, without credentials or a path.")
        if parsed.scheme == "http" and parsed.hostname not in ("localhost", "127.0.0.1", "::1"):
            raise ValueError("Remote backends require HTTPS to protect login credentials.")
        self.base = base.rstrip("/")
        self.token = None
        self.opener = build_opener(NoRedirect())

    def request(self, path, payload=None):
        headers = {"Accept": "application/json"}
        if self.token:
            headers["Authorization"] = "Bearer " + self.token
        data = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(payload).encode()
        request = Request(self.base + path, data=data, headers=headers)
        try:
            with self.opener.open(request, timeout=30) as response:
                return json.load(response)
        except HTTPError as error:
            # Do not log response bodies: they can contain sensitive information.
            raise ApiError(f"HTTP {error.code}; stopped. Check backend logs/authentication.") from None
        except (URLError, TimeoutError, OSError, ValueError):
            raise ApiError("Network timeout/error or invalid JSON; stopped. A started job may still be running.") from None

    def login(self, email, password):
        response = self.request("/auth/login", {"email": email, "password": password})
        if not isinstance(response, dict) or not isinstance(response.get("token"), str) or not response["token"]:
            raise ApiError("Login did not return a token.")
        self.token = response["token"]


def load_inventory(path):
    rows = json.loads(path.read_text())
    if not isinstance(rows, list) or not rows:
        raise ValueError("Expected a nonempty JSON array exported from amenities-backfill-inventory.sql.")
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Each inventory entry must be an object.")
        for key in ("listingid", "amenity_count"):
            if type(row.get(key)) is not int or row[key] < (1 if key == "listingid" else 0):
                raise ValueError(f"Invalid or missing {key}. Use the inventory SQL, not a listing export.")
        if row["listingid"] in seen:
            raise ValueError("Duplicate listing ID in inventory.")
        seen.add(row["listingid"])
        if "latitude" not in row or "longitude" not in row or "amenity_fingerprint" not in row:
            raise ValueError("Missing inventory fields. Export the complete inventory query.")
    return sorted(rows, key=lambda row: row["listingid"])


def has_coordinates(row):
    lat, lon = row["latitude"], row["longitude"]
    return (type(lat) in (int, float) and type(lon) in (int, float)
            and -90 <= lat <= 90 and -180 <= lon <= 180)


def populate(client, listing_id, wait_seconds, clock=time.monotonic, pause=time.sleep):
    deadline = clock() + wait_seconds
    while True:
        response = client.request(f"/api/gov/nearby-amenities/{listing_id}")
        if (not isinstance(response, dict) or response.get("status") not in ("LOADING", "READY")
                or not isinstance(response.get("amenities"), list)):
            raise ApiError("Unexpected amenity response; stopped.")
        amenities = response["amenities"]
        if any(not isinstance(item, dict) for item in amenities):
            raise ApiError("Invalid amenity row; stopped.")
        if amenities:
            categories = {}
            for item in amenities:
                category = item.get("amenity_type")
                if category not in ("school", "hawker_centre", "bus_stop"):
                    raise ApiError("Unknown amenity category; stopped.")
                categories[category] = categories.get(category, 0) + 1
            # READY is not a completion signal: the backend returns as soon as
            # ANY row exists, even if other categories are still being generated.
            return "rows_observed_review_completion", len(amenities), json.dumps(categories, sort_keys=True)
        if response["status"] == "READY":
            return "empty_result_review_logs", 0, "{}"
        if clock() >= deadline:
            raise ApiError("Polling deadline exceeded; stopped. Background generation may continue.")
        pause(min(2, max(0, deadline - clock())))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--inventory", type=Path, required=True,
                        help="Fresh JSON export from amenities-backfill-inventory.sql")
    parser.add_argument("--after-inventory", type=Path,
                        help="Compare a post-run export with --inventory, without network calls")
    parser.add_argument("--report", type=Path,
                        default=Path(__file__).resolve().parents[2] / "Documentation" /
                        ("amenities-backfill-" + datetime.now().strftime("%Y%m%d-%H%M%S") + ".csv"))
    parser.add_argument("--wait-seconds", type=int, default=300)
    parser.add_argument("--dry-run", action="store_true", help="Validate and preview without network calls")
    args = parser.parse_args()
    try:
        client = Client(args.base_url)
        rows = load_inventory(args.inventory)
        if args.after_inventory:
            after = {r["listingid"]: r for r in load_inventory(args.after_inventory)}
            changed = [r["listingid"] for r in rows if r["amenity_count"] and (
                r["listingid"] not in after
                or after[r["listingid"]]["amenity_count"] != r["amenity_count"]
                or after[r["listingid"]]["amenity_fingerprint"] != r["amenity_fingerprint"])]
            if changed:
                raise ValueError(f"Existing amenities changed or disappeared for listings: {changed}")
            if set(after) != {r["listingid"] for r in rows}:
                raise ValueError("Listing inventory changed; review added or missing listings.")
            print("PASS: all originally populated listing amenity fingerprints are unchanged.")
            print("Listings still without amenities:",
                  [r["listingid"] for r in after.values() if not r["amenity_count"]])
            print("Coverage is not proof that every category succeeded; review backend logs.")
            return 0
        if not 1 <= args.wait_seconds <= 3600:
            raise ValueError("--wait-seconds must be 1 through 3600.")
        missing = [r for r in rows if r["amenity_count"] == 0 and has_coordinates(r)]
        print(f"Inventory: {len(rows)} listings; {len(missing)} eligible empty caches.")
        print("Targets:", ", ".join(str(r["listingid"]) for r in missing))
        print("Listings with existing rows are skipped. No force-refresh calls will be made.")
        if args.dry_run:
            return 0
        if not args.report.parent.is_dir() or args.report.exists():
            raise ValueError("Report parent must exist and report file must not already exist.")
        print(f"Backend: {client.base}")
        print("Run one backend only; stop other listing-detail requests and refresh jobs.")
        if input("Confirm this backend uses the intended TEST database. Type BACKFILL: ") != "BACKFILL":
            print("Cancelled; no requests made.")
            return 0
        if missing:
            client.login(input("App account email: ").strip(), getpass.getpass("App password (not database password): "))
        failed = False
        with args.report.open("x", newline="") as stream:
            writer = csv.writer(stream, lineterminator="\n")
            writer.writerow(["listingid", "result", "observed_rows", "category_counts", "note"])
            for row in rows:
                listing_id = row["listingid"]
                note = ""
                if row["amenity_count"]:
                    result, count, categories = "skipped_existing", row["amenity_count"], ""
                elif not has_coordinates(row):
                    result, count, categories = "skipped_missing_coordinates", 0, ""
                else:
                    try:
                        result, count, categories = populate(client, listing_id, args.wait_seconds)
                    except (ApiError, KeyboardInterrupt) as error:
                        result, count, categories = "stopped_review_logs", "", ""
                        note = str(error) or "Interrupted; background generation may continue."
                        failed = True
                writer.writerow([listing_id, result, count, categories, note])
                stream.flush()
                print(f"{listing_id}: {result} ({count} rows)")
                if failed:
                    break
        print(f"Report: {args.report}")
        print("Re-export inventory and compare fingerprints. Review backend logs; observed rows do not prove completion.")
        return 1 if failed else 0
    except (ValueError, OSError, ApiError) as error:
        print(str(error), file=sys.stderr)
        return 1
    except (KeyboardInterrupt, EOFError):
        print("Cancelled. Any already started background jobs may continue.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
