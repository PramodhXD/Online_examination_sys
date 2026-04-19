import json
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.programming_exam import (
    ProgrammingAttempt,
    ProgrammingExam,
    ProgrammingProblem,
    ProgrammingTestCase,
)
from app.schemas.programming_exam import (
    ProgrammingAttemptSessionResponse,
    ProgrammingAttemptStartResponse,
    ProgrammingDraftSaveRequest,
    ProgrammingExamDetailResponse,
    ProgrammingExamResponse,
    ProgrammingProblemResponse,
    ProgrammingProblemSolution,
    ProgrammingSubmitRequest,
    ProgrammingSubmitResult,
    ProgrammingTestCaseResponse,
)
from app.schemas.code import SupportedLanguage
from app.services.code_execution import execute_code
from app.services.notification_service import create_notification
from app.utils.jwt import get_current_user
from app.utils.programming_exam_assignment import is_user_assigned_to_programming_exam

router = APIRouter(prefix="/programming-exams", tags=["Programming Exams"])

PUBLISHED_STATUS = "PUBLISHED"
VIOLATION_SUBMITTED = "VIOLATION_SUBMITTED"


def _attempt_duration_minutes(exam: ProgrammingExam) -> int:
    return max(1, int(exam.duration_minutes or 0))


def _attempt_deadline(attempt: ProgrammingAttempt, exam: ProgrammingExam) -> datetime | None:
    if attempt.started_at is None:
        return None
    return attempt.started_at + timedelta(minutes=_attempt_duration_minutes(exam))


def _attempt_remaining_seconds(
    attempt: ProgrammingAttempt,
    exam: ProgrammingExam,
    *,
    now: datetime | None = None,
) -> int:
    deadline = _attempt_deadline(attempt, exam)
    if deadline is None:
        return 0
    current_time = now or datetime.utcnow()
    return max(0, int((deadline - current_time).total_seconds()))


def _is_attempt_open(attempt: ProgrammingAttempt) -> bool:
    return (
        str(attempt.status or "").upper() in {"IN_PROGRESS", "LIVE", "FLAGGED"}
        and attempt.completed_at is None
    )


def _resolve_saved_code(attempt: ProgrammingAttempt, problem: ProgrammingProblem) -> str:
    solution_map = _solution_map_from_attempt(attempt, fallback_problem_id=problem.id)
    saved_solution = solution_map.get(int(problem.id), "").strip()
    if saved_solution:
        return solution_map.get(int(problem.id), "")
    saved = (attempt.source_code or "").strip()
    if saved:
        return attempt.source_code or ""
    return problem.starter_code or ""


def _solution_map_from_attempt(
    attempt: ProgrammingAttempt,
    *,
    fallback_problem_id: int | None = None,
) -> dict[int, str]:
    raw = str(attempt.source_code or "").strip()
    if not raw:
        return {}

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        if fallback_problem_id is None:
            return {}
        return {int(fallback_problem_id): attempt.source_code or ""}

    if isinstance(payload, dict):
        if isinstance(payload.get("solutions"), list):
            out: dict[int, str] = {}
            for item in payload["solutions"]:
                if not isinstance(item, dict):
                    continue
                try:
                    problem_id = int(item.get("problem_id"))
                except (TypeError, ValueError):
                    continue
                out[problem_id] = str(item.get("code") or "")
            if out:
                return out

        direct = payload.get("by_problem")
        if isinstance(direct, dict):
            out: dict[int, str] = {}
            for key, value in direct.items():
                try:
                    out[int(key)] = str(value or "")
                except (TypeError, ValueError):
                    continue
            if out:
                return out

    if fallback_problem_id is None:
        return {}
    return {int(fallback_problem_id): attempt.source_code or ""}


def _serialize_solution_map(solution_map: dict[int, str]) -> str:
    payload = {
        "solutions": [
            {"problem_id": int(problem_id), "code": code or ""}
            for problem_id, code in sorted(solution_map.items())
        ]
    }
    return json.dumps(payload)


def _problem_solution_payload(
    problem: ProgrammingProblem,
    solution_map: dict[int, str],
) -> ProgrammingProblemSolution:
    return ProgrammingProblemSolution(
        problem_id=problem.id,
        code=solution_map.get(int(problem.id), problem.starter_code or ""),
    )


def _build_problem_response(
    problem: ProgrammingProblem,
    exam: ProgrammingExam,
    *,
    sample_tests: list[ProgrammingTestCase],
) -> ProgrammingProblemResponse:
    return ProgrammingProblemResponse(
        id=problem.id,
        problem_id=problem.id,
        title=problem.title,
        description=problem.statement,
        time_limit=max(1, int(exam.duration_minutes or 0)),
        difficulty=problem.difficulty,
        statement=problem.statement,
        input_format=problem.input_format,
        output_format=problem.output_format,
        constraints=problem.constraints,
        sample_input=problem.sample_input,
        sample_output=problem.sample_output,
        starter_code=problem.starter_code,
        sample_tests=[
            ProgrammingTestCaseResponse(
                id=case.id,
                input_data=case.input_data,
                expected_output=case.expected_output,
                is_sample=bool(case.is_sample),
            )
            for case in sample_tests
        ],
    )


def _build_start_response(
    attempt: ProgrammingAttempt,
    exam: ProgrammingExam,
    problem: ProgrammingProblem,
    problems: list[ProgrammingProblem],
    *,
    resumed: bool,
) -> ProgrammingAttemptStartResponse:
    solution_map = _solution_map_from_attempt(attempt, fallback_problem_id=problem.id)
    return ProgrammingAttemptStartResponse(
        attempt_id=attempt.id,
        exam_id=exam.id,
        problem_id=problem.id,
        resumed=resumed,
        language=(attempt.language or "python"),
        starter_code=problem.starter_code or "",
        saved_code=_resolve_saved_code(attempt, problem),
        solutions=[_problem_solution_payload(item, solution_map) for item in problems],
        started_at=attempt.started_at.isoformat() if attempt.started_at else None,
        duration_minutes=_attempt_duration_minutes(exam),
        remaining_seconds=_attempt_remaining_seconds(attempt, exam),
        status=str(attempt.status or "").upper(),
    )


async def _get_exam_problems(
    db: AsyncSession,
    exam_id: int,
) -> list[ProgrammingProblem]:
    return (
        await db.execute(
            select(ProgrammingProblem)
            .where(ProgrammingProblem.exam_id == exam_id)
            .order_by(ProgrammingProblem.id.asc())
        )
    ).scalars().all()


async def _auto_submit_if_expired(
    db: AsyncSession,
    *,
    attempt: ProgrammingAttempt,
    exam: ProgrammingExam,
    problem: ProgrammingProblem,
    problems: list[ProgrammingProblem] | None = None,
) -> tuple[bool, ProgrammingSubmitResult | None]:
    if not _is_attempt_open(attempt):
        return False, None
    if _attempt_remaining_seconds(attempt, exam) > 0:
        return False, None

    passed = 0
    total = 0
    score = 0
    total_marks = 0
    language = str(attempt.language or "python").strip().lower() or "python"
    problem_rows = problems or [problem]
    solution_map = _solution_map_from_attempt(attempt, fallback_problem_id=problem.id)

    for problem_row in problem_rows:
        test_cases = (
            await db.execute(
                select(ProgrammingTestCase).where(
                    ProgrammingTestCase.problem_id == problem_row.id,
                    ProgrammingTestCase.is_sample.is_(False),
                )
            )
        ).scalars().all()

        if not test_cases:
            test_cases = (
                await db.execute(
                    select(ProgrammingTestCase).where(ProgrammingTestCase.problem_id == problem_row.id)
                )
            ).scalars().all()

        source_code = solution_map.get(int(problem_row.id), problem_row.starter_code or "")
        for case in test_cases:
            total += 1
            total_marks += int(case.marks or 1)
            result = await execute_code(
                language=language,  # type: ignore[arg-type]
                source_code=source_code,
                stdin=case.input_data or "",
            )
            expected = (case.expected_output or "").strip()
            actual = (result.stdout or "").strip()
            if result.success and actual == expected:
                passed += 1
                score += int(case.marks or 1)

    attempt.language = language
    attempt.source_code = _serialize_solution_map(solution_map)
    attempt.passed_count = passed
    attempt.total_count = total
    attempt.score = score
    attempt.total = total_marks
    attempt.status = "COMPLETED"
    attempt.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(attempt)
    await create_notification(
        db,
        user_id=attempt.user_id,
        title="Programming exam auto-submitted",
        message=f"Your programming exam '{exam.title}' was auto-submitted because the time expired.",
        notification_type="warning",
        link="/programming",
    )
    await db.commit()

    return True, ProgrammingSubmitResult(
        attempt_id=attempt.id,
        passed=passed,
        total=total,
        score=score,
        status=attempt.status,
        message="Attempt auto-submitted because the exam time expired.",
    )


@router.get("/", response_model=List[ProgrammingExamResponse])
async def list_programming_exams(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(ProgrammingExam).where(
                func.upper(ProgrammingExam.status) == PUBLISHED_STATUS
            )
        )
    ).scalars().all()
    allowed: list[ProgrammingExam] = []
    for exam in rows:
        if await is_user_assigned_to_programming_exam(db, exam.id, current_user["id"]):
            allowed.append(exam)
    return allowed


@router.get("/{exam_id}", response_model=ProgrammingExamDetailResponse)
async def get_programming_exam_detail(
    exam_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exam = (
        await db.execute(
            select(ProgrammingExam).where(
                ProgrammingExam.id == exam_id,
                func.upper(ProgrammingExam.status) == PUBLISHED_STATUS,
            )
        )
    ).scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Programming exam not found")
    if not await is_user_assigned_to_programming_exam(db, exam.id, current_user["id"]):
        raise HTTPException(status_code=403, detail="You are not assigned to this programming exam")

    problems = (
        await db.execute(
            select(ProgrammingProblem)
            .where(ProgrammingProblem.exam_id == exam_id)
            .order_by(ProgrammingProblem.id.asc())
        )
    ).scalars().all()

    problem_responses: list[ProgrammingProblemResponse] = []
    for problem in problems:
        samples = (
            await db.execute(
                select(ProgrammingTestCase)
                .where(
                    ProgrammingTestCase.problem_id == problem.id,
                    ProgrammingTestCase.is_sample.is_(True),
                )
                .order_by(ProgrammingTestCase.id.asc())
            )
        ).scalars().all()
        problem_responses.append(
            _build_problem_response(problem, exam, sample_tests=samples)
        )

    return ProgrammingExamDetailResponse(
        exam=ProgrammingExamResponse.model_validate(exam),
        problems=problem_responses,
    )


@router.post("/{exam_id}/start", response_model=ProgrammingAttemptStartResponse)
async def start_programming_exam(
    exam_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exam = (
        await db.execute(
            select(ProgrammingExam).where(
                ProgrammingExam.id == exam_id,
                func.upper(ProgrammingExam.status) == PUBLISHED_STATUS,
            )
        )
    ).scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Programming exam not found")
    if not await is_user_assigned_to_programming_exam(db, exam.id, current_user["id"]):
        raise HTTPException(status_code=403, detail="You are not assigned to this programming exam")

    problems = await _get_exam_problems(db, exam_id)
    problem = problems[0] if problems else None

    if not problem:
        raise HTTPException(status_code=404, detail="No programming problem found")

    open_attempt = (
        await db.execute(
            select(ProgrammingAttempt).where(
                ProgrammingAttempt.user_id == current_user["id"],
                ProgrammingAttempt.exam_id == exam.id,
                func.upper(ProgrammingAttempt.status).in_(["IN_PROGRESS", "LIVE", "FLAGGED"]),
                ProgrammingAttempt.completed_at.is_(None),
            ).order_by(ProgrammingAttempt.started_at.desc())
        )
    ).scalars().first()
    if open_attempt:
        expired, _ = await _auto_submit_if_expired(
            db,
            attempt=open_attempt,
            exam=exam,
            problem=problem,
            problems=problems,
        )
        if not expired:
            return _build_start_response(open_attempt, exam, problem, problems, resumed=True)

    attempt = ProgrammingAttempt(
        user_id=current_user["id"],
        exam_id=exam.id,
        problem_id=problem.id,
        status="IN_PROGRESS",
        started_at=datetime.utcnow(),
        language="python",
        source_code=_serialize_solution_map(
            {item.id: item.starter_code or "" for item in problems}
        ),
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return _build_start_response(attempt, exam, problem, problems, resumed=False)


@router.get("/attempts/{attempt_id}/session", response_model=ProgrammingAttemptSessionResponse)
async def get_programming_exam_session(
    attempt_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(ProgrammingAttempt, ProgrammingExam, ProgrammingProblem)
            .join(ProgrammingExam, ProgrammingExam.id == ProgrammingAttempt.exam_id)
            .join(ProgrammingProblem, ProgrammingProblem.id == ProgrammingAttempt.problem_id)
            .where(ProgrammingAttempt.id == attempt_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Attempt not found")

    attempt, exam, problem = row
    if attempt.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    problems = await _get_exam_problems(db, exam.id)

    auto_submitted, _ = await _auto_submit_if_expired(
        db,
        attempt=attempt,
        exam=exam,
        problem=problem,
        problems=problems,
    )
    if auto_submitted:
        row = (
            await db.execute(
                select(ProgrammingAttempt, ProgrammingExam, ProgrammingProblem)
                .join(ProgrammingExam, ProgrammingExam.id == ProgrammingAttempt.exam_id)
                .join(ProgrammingProblem, ProgrammingProblem.id == ProgrammingAttempt.problem_id)
                .where(ProgrammingAttempt.id == attempt_id)
            )
        ).first()
        attempt, exam, problem = row

    remaining_seconds = _attempt_remaining_seconds(attempt, exam)
    return ProgrammingAttemptSessionResponse(
        attempt_id=attempt.id,
        exam_id=exam.id,
        problem_id=problem.id,
        status=str(attempt.status or "").upper(),
        started_at=attempt.started_at.isoformat() if attempt.started_at else None,
        duration_minutes=_attempt_duration_minutes(exam),
        remaining_seconds=remaining_seconds,
        expired=remaining_seconds <= 0,
        auto_submitted=auto_submitted,
    )


@router.post("/attempts/save")
async def save_programming_draft(
    data: ProgrammingDraftSaveRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (
        await db.execute(
            select(ProgrammingAttempt, ProgrammingExam, ProgrammingProblem)
            .join(ProgrammingExam, ProgrammingExam.id == ProgrammingAttempt.exam_id)
            .join(ProgrammingProblem, ProgrammingProblem.id == ProgrammingAttempt.problem_id)
            .where(ProgrammingAttempt.id == data.attempt_id)
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Attempt not found")

    attempt, exam, problem = row
    if attempt.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    problems = await _get_exam_problems(db, exam.id)

    auto_submitted, result = await _auto_submit_if_expired(
        db,
        attempt=attempt,
        exam=exam,
        problem=problem,
        problems=problems,
    )
    if auto_submitted:
        raise HTTPException(status_code=409, detail=result.message if result else "Exam time has expired")

    attempt.language = str(data.language or "python").strip().lower() or "python"
    incoming_solutions = {
        int(item.problem_id): item.code or ""
        for item in (data.solutions or [])
    }
    if incoming_solutions:
        attempt.source_code = _serialize_solution_map(incoming_solutions)
    else:
        attempt.source_code = data.source_code or ""
    await db.commit()
    return {"saved": True}


@router.post("/submit", response_model=ProgrammingSubmitResult)
async def submit_programming_exam(
    data: ProgrammingSubmitRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    attempt = (
        await db.execute(
            select(ProgrammingAttempt).where(ProgrammingAttempt.id == data.attempt_id)
        )
    ).scalar_one_or_none()

    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if attempt.status in {"COMPLETED", VIOLATION_SUBMITTED}:
        raise HTTPException(status_code=400, detail="Attempt already submitted")

    problem = (
        await db.execute(
            select(ProgrammingProblem).where(ProgrammingProblem.id == attempt.problem_id)
        )
    ).scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    exam = (
        await db.execute(
            select(ProgrammingExam).where(ProgrammingExam.id == attempt.exam_id)
        )
    ).scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Programming exam not found")
    problems = await _get_exam_problems(db, attempt.exam_id)
    if not problems:
        raise HTTPException(status_code=404, detail="No programming problems found")

    auto_submitted, result = await _auto_submit_if_expired(
        db,
        attempt=attempt,
        exam=exam,
        problem=problem,
        problems=problems,
    )
    if auto_submitted and result is not None:
        return result

    language = str(data.language or "").strip().lower()
    supported_languages = {"python", "javascript", "java", "cpp", "c"}
    if language not in supported_languages:
        raise HTTPException(status_code=400, detail="Unsupported language")

    submitted_solutions = {
        int(item.problem_id): item.code or ""
        for item in (data.solutions or [])
    }
    if not submitted_solutions and str(data.source_code or "").strip():
        submitted_solutions[int(problem.id)] = data.source_code
    if not submitted_solutions:
        raise HTTPException(status_code=400, detail="At least one solution is required")

    valid_problem_ids = {int(item.id) for item in problems}
    unknown_problem_ids = set(submitted_solutions) - valid_problem_ids
    if unknown_problem_ids:
        raise HTTPException(status_code=400, detail="Submission includes invalid problem ids")

    attempt.language = data.language
    attempt.source_code = _serialize_solution_map(submitted_solutions)

    passed = 0
    total = 0
    score = 0
    total_marks = 0

    for submitted_problem in problems:
        test_cases = (
            await db.execute(
                select(ProgrammingTestCase).where(
                    ProgrammingTestCase.problem_id == submitted_problem.id,
                    ProgrammingTestCase.is_sample.is_(False),
                )
            )
        ).scalars().all()

        if not test_cases:
            test_cases = (
                await db.execute(
                    select(ProgrammingTestCase).where(ProgrammingTestCase.problem_id == submitted_problem.id)
                )
            ).scalars().all()

        if not test_cases:
            continue

        problem_code = submitted_solutions.get(int(submitted_problem.id), submitted_problem.starter_code or "")
        for case in test_cases:
            total += 1
            total_marks += int(case.marks or 1)
            result = await execute_code(
                language=language,  # type: ignore[arg-type]
                source_code=problem_code,
                stdin=case.input_data or "",
            )
            expected = (case.expected_output or "").strip()
            actual = (result.stdout or "").strip()
            if result.success and actual == expected:
                passed += 1
                score += int(case.marks or 1)

    if total == 0:
        raise HTTPException(status_code=400, detail="No test cases available")

    attempt.passed_count = passed
    attempt.total_count = total
    attempt.score = score
    attempt.total = total_marks
    is_violation_submit = (data.submit_reason or "").strip().lower() == "violation"
    attempt.status = VIOLATION_SUBMITTED if is_violation_submit else "COMPLETED"
    attempt.completed_at = datetime.utcnow()

    await db.commit()
    await create_notification(
        db,
        user_id=attempt.user_id,
        title="Programming exam result available",
        message=(
            f"Your programming exam '{exam.title}' has been evaluated. "
            f"Passed {passed}/{total} hidden test cases."
        ),
        notification_type="success" if not is_violation_submit else "warning",
        link="/programming",
    )
    await db.commit()

    return ProgrammingSubmitResult(
        attempt_id=attempt.id,
        passed=passed,
        total=total,
        score=score,
        status=attempt.status,
        message="Submission evaluated successfully." if not is_violation_submit else "Attempt auto-submitted due to violation.",
    )
