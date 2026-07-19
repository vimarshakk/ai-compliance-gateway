"""ACG Python SDK type definitions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List


@dataclass
class Violation:
    """A single compliance violation."""

    rule_id: str
    severity: str  # critical, high, medium, low, info
    message: str
    category: str
    line: Optional[int] = None
    column: Optional[int] = None
    suggestion: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Violation":
        return cls(
            rule_id=data.get("rule_id", ""),
            severity=data.get("severity", "info"),
            message=data.get("message", ""),
            category=data.get("category", ""),
            line=data.get("line"),
            column=data.get("column"),
            suggestion=data.get("suggestion"),
        )


@dataclass
class ScanResult:
    """Result of a prompt scan."""

    risk_score: float
    violations: List[Violation]
    recommendations: List[str]
    pack: str
    scan_id: Optional[str] = None
    duration_ms: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def has_violations(self) -> bool:
        return len(self.violations) > 0

    @property
    def critical_count(self) -> int:
        return sum(1 for v in self.violations if v.severity == "critical")

    @property
    def high_count(self) -> int:
        return sum(1 for v in self.violations if v.severity == "high")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScanResult":
        return cls(
            risk_score=data.get("risk_score", 0.0),
            violations=[Violation.from_dict(v) for v in data.get("violations", [])],
            recommendations=data.get("recommendations", []),
            pack=data.get("pack", "default"),
            scan_id=data.get("scan_id"),
            duration_ms=data.get("duration_ms"),
            metadata=data.get("metadata", {}),
        )


@dataclass
class PolicyResult:
    """Result of a policy evaluation."""

    passed: bool
    score: float
    violations: List[Violation]
    policy_id: Optional[str] = None
    evaluation_id: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PolicyResult":
        return cls(
            passed=data.get("passed", False),
            score=data.get("score", 0.0),
            violations=[Violation.from_dict(v) for v in data.get("violations", [])],
            policy_id=data.get("policy_id"),
            evaluation_id=data.get("evaluation_id"),
        )


@dataclass
class ProviderConfig:
    """Provider configuration and status."""

    name: str
    status: str  # healthy, degraded, offline
    compliance_score: float
    models: List[str] = field(default_factory=list)
    region: Optional[str] = None

    @property
    def is_healthy(self) -> bool:
        return self.status == "healthy"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ProviderConfig":
        return cls(
            name=data.get("name", ""),
            status=data.get("status", "offline"),
            compliance_score=data.get("compliance_score", 0.0),
            models=data.get("models", []),
            region=data.get("region"),
        )
