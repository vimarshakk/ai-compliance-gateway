"""ACG Python SDK client."""

from __future__ import annotations

import httpx
from typing import Optional, Dict, Any

from .types import ScanResult, PolicyResult, ProviderConfig


class ACGClient:
    """Client for AI Compliance Gateway API.

    Usage:
        client = ACGClient(base_url="http://localhost:3000", api_key="acg_...")
        result = client.scan("What is the meaning of life?")
    """

    def __init__(
        self,
        base_url: str = "http://localhost:3000",
        api_key: Optional[str] = None,
        timeout: float = 30.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._client = httpx.Client(
            base_url=self._base_url,
            timeout=timeout,
            headers=self._build_headers(),
        )

    def _build_headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    def scan(
        self,
        prompt: str,
        *,
        pack: str = "default",
        strict: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ScanResult:
        """Scan a prompt for compliance issues.

        Args:
            prompt: The prompt text to scan.
            pack: Compliance pack name (default, hipaa, soc2, gdpr, iso27001, pci, nist, fedramp).
            strict: Enable strict mode for tighter checks.
            metadata: Additional context metadata.

        Returns:
            ScanResult with risk_score, violations, and recommendations.
        """
        response = self._client.post(
            "/v1/scan",
            json={
                "prompt": prompt,
                "pack": pack,
                "strict": strict,
                "metadata": metadata or {},
            },
        )
        response.raise_for_status()
        return ScanResult(**response.json())

    def scan_with_provider(
        self,
        prompt: str,
        provider: str,
        *,
        model: Optional[str] = None,
        pack: str = "default",
    ) -> ScanResult:
        """Scan a prompt and route through a specific provider.

        Args:
            prompt: The prompt text.
            provider: Provider name (openai, anthropic, azure, bedrock, vertex).
            model: Model override.
            pack: Compliance pack.

        Returns:
            ScanResult with provider response.
        """
        response = self._client.post(
            "/v1/providers/scan",
            json={
                "prompt": prompt,
                "provider": provider,
                "model": model,
                "pack": pack,
            },
        )
        response.raise_for_status()
        return ScanResult(**response.json())

    def evaluate_policy(
        self,
        input_text: str,
        output_text: str,
        *,
        policy_id: Optional[str] = None,
    ) -> PolicyResult:
        """Evaluate output against compliance policies.

        Args:
            input_text: Original input/prompt.
            output_text: Model output to evaluate.
            policy_id: Specific policy ID to check.

        Returns:
            PolicyResult with violations and score.
        """
        response = self._client.post(
            "/v1/policy/evaluate",
            json={
                "input": input_text,
                "output": output_text,
                "policyId": policy_id,
            },
        )
        response.raise_for_status()
        return PolicyResult(**response.json())

    def get_providers(self) -> list[ProviderConfig]:
        """List available providers and their status.

        Returns:
            List of ProviderConfig with name, status, compliance score.
        """
        response = self._client.get("/v1/providers")
        response.raise_for_status()
        return [ProviderConfig(**p) for p in response.json().get("providers", [])]

    def get_health(self) -> Dict[str, Any]:
        """Check gateway health status.

        Returns:
            Health status dict.
        """
        response = self._client.get("/health")
        response.raise_for_status()
        return response.json()

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def __enter__(self) -> "ACGClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
