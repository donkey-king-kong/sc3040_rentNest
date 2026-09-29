#!/usr/bin/env python3
"""Generate postal_code_coordinates.csv from the OneMap postal code dump."""

import argparse
import csv
import gzip
import json
from pathlib import Path


DEFAULT_INPUT = Path(__file__).resolve().parents[1] / "data" / "database.json.gz"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "data" / "postal_code_coordinates.csv"


def normalise_postal(value):
    if value is None:
        return None

    postal = str(value).strip()
    if not postal or postal.upper() == "NIL":
        return None

    return postal.zfill(6)


def generate_csv(input_path, output_path):
    seen = set()
    written = 0
    skipped_nil = 0
    skipped_duplicates = 0

    with gzip.open(input_path, "rt", encoding="utf-8") as file:
        records = json.load(file)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["postal_code", "latitude", "longitude"])

        for record in records:
            postal_code = normalise_postal(record.get("POSTAL"))
            if postal_code is None:
                skipped_nil += 1
                continue

            if postal_code in seen:
                skipped_duplicates += 1
                continue

            seen.add(postal_code)
            writer.writerow([postal_code, record.get("LATITUDE"), record.get("LONGITUDE")])
            written += 1

    return written, skipped_nil, skipped_duplicates


def main():
    parser = argparse.ArgumentParser(
        description="Convert OneMap database.json.gz into postal_code_coordinates.csv."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Path to database.json.gz")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Path to output CSV")
    args = parser.parse_args()

    written, skipped_nil, skipped_duplicates = generate_csv(args.input, args.output)
    print(f"Wrote {written} unique postal codes to {args.output}")
    print(f"Skipped {skipped_nil} NIL/blank records")
    print(f"Skipped {skipped_duplicates} duplicate postal code records")


if __name__ == "__main__":
    main()
