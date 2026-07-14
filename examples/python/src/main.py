"""
AI Compliance Gateway — Python Quickstart

This example demonstrates:
1. Chat completion with compliance checks
2. Content moderation
3. Health checking

Prerequisites:
  - ACG Gateway running (docker compose up)
  - An API key (from dashboard or CLI)
  - pip install httpx

Run:
  pip install -r requirements.txt
  python src/main.py
"""

import os
import httpx
import json
import sys

GATEWAY_URL = os.getenv("GATEWAY_URL", "http://localhost:3000")
ADMIN_URL = os.getenv("ADMIN_URL", "http://localhost:3002")
API_KEY = os.getenv("ACG_API_KEY", "dev-key")
ORG_ID = os.getenv("ACG_ORG_ID", "my-org")
PROJECT_ID = os.getenv("ACG_PROJECT_ID", "my-project")


class ACGClient:
    """Minimal ACG client using httpx."""

    def __init__(self, gateway_url: str, admin_url: str, api_key: str):
        self.gateway_url = gateway_url.rstrip("/")
        self.admin_url = admin_url.rstrip("/")
        self.headers = {
            "Content-Type": "application/json",
            "X-Api-Key": api_key,
        }

    def chat_completion(
        self,
        messages: list[dict],
        model: str = "gpt-4o-mini",
        compliance_pack: str | None = None,
        pii_detection: bool = True,
    ) -> dict:
        body = {
            "model": model,
            "messages": messages,
            "organizationId": ORG_ID,
            "projectId": PROJECT_ID,
            "piiDetectionEnabled": pii_detection,
        }
        if compliance_pack:
            body["compliancePack"] = compliance_pack

        with httpx.Client(timeout=60) as client:
            res = client.post(
                f"{self.gateway_url}/chat/completions",
                headers=self.headers,
                json=body,
            )
            res.raise_for_status()
            return res.json()

    def moderate(self, text: str, content_types: list[str] | None = None) -> dict:
        body = {"text": text, "organizationId": ORG_ID}
        if content_types:
            body["contentTypes"] = content_types

        with httpx.Client(timeout=30) as client:
            res = client.post(
                f"{self.gateway_url}/moderations",
                headers=self.headers,
                json=body,
            )
            res.raise_for_status()
            return res.json()

    def health(self) -> dict:
        with httpx.Client(timeout=5) as client:
            res = client.get(f"{self.gateway_url}/health")
            res.raise_for_status()
            return res.json()

    def router_providers(self) -> dict:
        with httpx.Client(timeout=10) as client:
            res = client.get(f"{self.admin_url}/engines/router/providers")
            res.raise_for_status()
            return res.json()

    def compliance_packs(self) -> dict:
        with httpx.Client(timeout=10) as client:
            res = client.get(f"{self.admin_url}/engines/compliance/packs")
            res.raise_for_status()
            return res.json()


def main():
    acg = ACGClient(GATEWAY_URL, ADMIN_URL, API_KEY)

    # 1. Health check
    print("--- Health Check ---")
    try:
        health = acg.health()
        print(f"Gateway healthy: {health.get('status') == 'healthy'}")
    except httpx.HTTPError as e:
        print(f"Gateway unreachable: {e}")
        print("Start with: docker compose up")
        sys.exit(1)

    # 2. Chat with HIPAA compliance
    print("\n--- Chat Completion (HIPAA pack) ---")
    try:
        response = acg.chat_completion(
            messages=[
                {"role": "system", "content": "You are a helpful healthcare assistant."},
                {"role": "user", "content": "What are the symptoms of diabetes?"},
            ],
            compliance_pack="hipaa",
        )
        print(f"Model: {response.get('model')}")
        print(f"Provider: {response.get('provider')}")
        choices = response.get("choices", [])
        if choices:
            print(f"Response: {choices[0]['message']['content']}")
        usage = response.get("usage", {})
        print(f"Tokens: {usage.get('totalTokens', 0)}")
        cost = response.get("cost", {})
        print(f"Cost: {cost.get('totalCost', 0)} {cost.get('currency', 'USD')}")
        print(f"Policy decisions: {len(response.get('policyDecisions', []))}")
        print(f"Latency: {response.get('latencyMs', 0)}ms")
    except httpx.HTTPStatusError as e:
        print(f"Error {e.response.status_code}: {e.response.text}")

    # 3. Chat with DPDP compliance
    print("\n--- Chat Completion (DPDP pack) ---")
    try:
        response = acg.chat_completion(
            messages=[
                {"role": "user", "content": "Explain data localization requirements in India."},
            ],
            compliance_pack="dpdp",
        )
        choices = response.get("choices", [])
        if choices:
            print(f"Response: {choices[0]['message']['content']}")
        print(f"Policy decisions: {len(response.get('policyDecisions', []))}")
    except httpx.HTTPStatusError as e:
        print(f"Error {e.response.status_code}: {e.response.text}")

    # 4. Content moderation
    print("\n--- Content Moderation ---")
    try:
        result = acg.moderate(
            text="This is a sample message for content moderation testing.",
            content_types=["pii", "profanity", "toxicity"],
        )
        print(f"Result: {result.get('moderationResult')}")
        print(f"Risk level: {result.get('riskLevel')}")
        print(f"Reasons: {result.get('reasons')}")
        print(f"Latency: {result.get('latencyMs', 0)}ms")
    except httpx.HTTPStatusError as e:
        print(f"Error {e.response.status_code}: {e.response.text}")

    # 5. Engine status
    print("\n--- Engine Status ---")
    try:
        providers = acg.router_providers()
        packs = acg.compliance_packs()
        print(f"Router: {providers.get('total', 0)} providers")
        print(f"Compliance: {packs.get('total', 0)} packs")
    except httpx.HTTPError as e:
        print(f"Could not fetch engine status: {e}")

    print("\nDone.")


if __name__ == "__main__":
    main()
