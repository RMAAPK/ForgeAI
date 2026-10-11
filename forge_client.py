"""
Forge AI - Telemetry Client & Cloud Ingestion Interface
Reads 80-band acoustic telemetry records from Supabase PostgreSQL.
Production-grade, zero-leak client with strict typing and error handling.
"""

import os
from typing import List, Dict, Any, Optional
import requests

class ForgeTelemetryClient:
    """Enterprise client for querying Forge AI 80-band acoustic spindle telemetry."""

    def __init__(self, supabase_url: Optional[str] = None, api_key: Optional[str] = None):
        self.url = (supabase_url or os.getenv("SUPABASE_URL", "")).rstrip("/")
        self.key = api_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")

        if not self.url or not self.key:
            raise ValueError(
                "Missing Supabase credentials. Configure SUPABASE_URL and SUPABASE_ANON_KEY in .env."
            )

        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }

    def fetch_telemetry(self, limit: int = 10, machine_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch real-time 80-band acoustic records from the canonical telemetry table."""
        endpoint = f"{self.url}/rest/v1/cnc_spindle_telemetry"
        params = {"select": "*", "limit": str(limit), "order": "id.desc"}

        if machine_name:
            params["machine_name"] = f"eq.{machine_name}"

        response = requests.get(endpoint, headers=self.headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()

    def get_machine_profiles(self) -> List[str]:
        """Retrieve distinct machine names currently transmitting acoustic telemetry."""
        endpoint = f"{self.url}/rest/v1/cnc_spindle_telemetry"
        params = {"select": "machine_name"}
        response = requests.get(endpoint, headers=self.headers, params=params, timeout=10)
        response.raise_for_status()
        records = response.json()
        return sorted(list({r["machine_name"] for r in records if "machine_name" in r}))


if __name__ == "__main__":
    # Self-test using environment variables
    try:
        client = ForgeTelemetryClient()
        machines = client.get_machine_profiles()
        print(f"[FORGE TELEMETRY] Connected. Active machine profiles: {len(machines)}")
        for m in machines:
            print(f" - {m}")
    except Exception as exc:
        print(f"[FORGE TELEMETRY INFO] Standalone execution notice: {exc}")
