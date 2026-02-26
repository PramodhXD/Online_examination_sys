from dataclasses import dataclass


PLAN_FREE = "FREE"
PLAN_PRO = "PRO"
PLAN_PREMIUM = "PREMIUM"
VALID_PLANS = {PLAN_FREE, PLAN_PRO, PLAN_PREMIUM}


@dataclass(frozen=True)
class PlanConfig:
    assessment_limit_per_month: int | None
    allow_certificates: bool
    allow_leaderboard: bool
    allow_pdf_reports: bool


PLAN_CONFIGS: dict[str, PlanConfig] = {
    PLAN_FREE: PlanConfig(
        assessment_limit_per_month=2,
        allow_certificates=False,
        allow_leaderboard=False,
        allow_pdf_reports=False,
    ),
    PLAN_PRO: PlanConfig(
        assessment_limit_per_month=None,
        allow_certificates=True,
        allow_leaderboard=True,
        allow_pdf_reports=False,
    ),
    PLAN_PREMIUM: PlanConfig(
        assessment_limit_per_month=None,
        allow_certificates=True,
        allow_leaderboard=True,
        allow_pdf_reports=True,
    ),
}

PLAN_PRICE_PAISE: dict[str, int] = {
    PLAN_FREE: 0,
    PLAN_PRO: 49900,
    PLAN_PREMIUM: 99900,
}


def normalize_plan(value: str | None) -> str:
    plan = (value or PLAN_FREE).strip().upper()
    if plan not in VALID_PLANS:
        return PLAN_FREE
    return plan


def get_plan_config(value: str | None) -> PlanConfig:
    return PLAN_CONFIGS[normalize_plan(value)]


def get_plan_price_paise(value: str | None) -> int:
    return PLAN_PRICE_PAISE[normalize_plan(value)]
