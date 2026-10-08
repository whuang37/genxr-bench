# /// script
# dependencies = [
#   "google-genai>=1.16.0,<3.0.0",
#   "pydantic>=2.0",
# ]
# ///

from __future__ import annotations

import os
import sys
import time
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel, Field


ARTIFACTS_PATH = Path("/logs/artifacts")
INSTRUCTION_PATH = Path("/tests/instruction.md")
OUTPUT_PATH = Path("/logs/verifier/llm_judge_result.json")
DEFAULT_MODEL = "gemini-3.8-flash"
VIDEO_PROCESSING_TIMEOUT_SECONDS = 300
MODEL_REQUEST_ATTEMPTS = 4
RETRY_BASE_DELAY_SECONDS = 2

XR_HEURISTICS = {
    "prompt_alignment": {
        "name": "Prompt Alignment",
        "description": (
            "Fidelity of the implementation to user prompt specifications, "
            "required interactions, and requested feature behaviors."
        ),
    },
    "visual_quality": {
        "name": "Visual Quality",
        "description": (
            "Aesthetic execution, lighting, materials, mesh rendering, and "
            "visual polish of 3D virtual elements."
        ),
    },
    "spatial_anchoring": {
        "name": "Spatial Anchoring",
        "description": (
            "The virtual content remains rigidly attached to its designated "
            "physical or spatial location without drifting, sliding, jittering, "
            "or clipping during camera movements or interactions."
        ),
    },
    "scale_consistency": {
        "name": "Scale Consistency",
        "description": (
            "Virtual objects and UI elements are rendered at realistic, "
            "proportional life-size scales relative to each other and the "
            "surrounding virtual environment."
        ),
    },
    "input_responsiveness": {
        "name": "Input Responsiveness",
        "description": (
            "The system accurately translates user inputs, pointer actions, and "
            "pinch or raycast controls into intuitive spatial manipulation "
            "without desynchronization."
        ),
    },
    "physically_realistic_behavior": {
        "name": "Physically Realistic Behavior",
        "description": (
            "The virtual entities, physics rules, collision bounds, and "
            "interactive state transitions behave logically and consistently "
            "within the context of the physical environment."
        ),
    },
    "interaction_feedback": {
        "name": "Interaction Feedback",
        "description": (
            "The system provides clear, immediate visual cues, such as hover "
            "states, selection highlights, and active reticles, that indicate "
            "object interactability and system state changes."
        ),
    },
    "spatial_error_prevention": {
        "name": "Spatial Error Prevention",
        "description": (
            "The environment prevents spatial errors, such as objects flying "
            "away, collapsing to zero scale, clipping, or becoming unreachable."
        ),
    },
    "contextual_placement": {
        "name": "Contextual Placement",
        "description": (
            "Floating UI elements, labels, and contextual instructions have a "
            "logical spatial relationship and remain near the 3D entities they "
            "describe."
        ),
    },
    "clutter_control": {
        "name": "Clutter Control",
        "description": (
            "The 3D space maintains a clean visual layout without excessive "
            "floating panels, redundant effects, or viewport clutter."
        ),
    },
}

ResultT = TypeVar("ResultT")


class XRRubricScores(BaseModel):
    """Integer ratings for the 10 XR heuristics."""

    prompt_alignment: int = Field(..., ge=1, le=5)
    visual_quality: int = Field(..., ge=1, le=5)
    spatial_anchoring: int = Field(..., ge=1, le=5)
    scale_consistency: int = Field(..., ge=1, le=5)
    input_responsiveness: int = Field(..., ge=1, le=5)
    physically_realistic_behavior: int = Field(..., ge=1, le=5)
    interaction_feedback: int = Field(..., ge=1, le=5)
    spatial_error_prevention: int = Field(..., ge=1, le=5)
    contextual_placement: int = Field(..., ge=1, le=5)
    clutter_control: int = Field(..., ge=1, le=5)


class ActionableFix(BaseModel):
    """A concrete improvement for one heuristic scored below 4."""

    heuristic: str
    current_score: int = Field(..., ge=1, le=3)
    instruction: str = Field(..., min_length=1)


class XRRubricEvaluation(BaseModel):
    """Structured XR evaluation written to the verifier artifacts."""

    scores: XRRubricScores
    notes: str = Field(..., min_length=1)
    actionable_fix_instructions: list[ActionableFix]


def with_retries(description: str, operation: Callable[[], ResultT]) -> ResultT:
    """Run a remote operation with bounded exponential backoff."""
    for attempt in range(1, MODEL_REQUEST_ATTEMPTS + 1):
        try:
            return operation()
        except Exception:
            if attempt == MODEL_REQUEST_ATTEMPTS:
                raise
            delay = RETRY_BASE_DELAY_SECONDS * 2 ** (attempt - 1)
            print(
                f"Warning: {description} failed on attempt {attempt}; "
                f"retrying in {delay} seconds.",
                file=sys.stderr,
            )
            time.sleep(delay)

    raise RuntimeError(f"{description} did not complete.")


def find_video_files() -> list[Path]:
    """Find all MP4 recordings produced by the app tests."""
    if not ARTIFACTS_PATH.is_dir():
        return []
    return sorted(ARTIFACTS_PATH.glob("*.mp4"))


def read_task_instruction() -> str:
    """Read the task instruction packaged for verification."""
    if not INSTRUCTION_PATH.is_file():
        raise FileNotFoundError(f"Task instruction not found: {INSTRUCTION_PATH}")

    instruction = INSTRUCTION_PATH.read_text(encoding="utf-8").strip()
    if not instruction:
        raise ValueError(f"Task instruction is empty: {INSTRUCTION_PATH}")
    return instruction


def build_system_instruction() -> str:
    """Build the aligned XR evaluation instruction."""
    heuristics = "\n".join(
        f"- {definition['name']} (`{key}`): {definition['description']}"
        for key, definition in XR_HEURISTICS.items()
    )
    return f"""You are an expert WebXR Usability & Spatial Interface Evaluator.
Your task is to analyze the user prompt specification and recordings of an XR
application and score the experience against these core XR usability heuristics.

THE 10 HEURISTICS TO EVALUATE:
{heuristics}

EVALUATION RULES & PROTOCOL:
- Score each heuristic on an integer 1 to 5 Likert scale:
  1 = Very Poor / Strongly Disagree / Completely Fails
  2 = Poor / Disagree / Major Flaws
  3 = Moderate / Functional with Obvious Deficiencies
  4 = Good / Agree / High Quality
  5 = Excellent / Strongly Agree / Flawless Execution

- Treat all recordings as evidence from the same completed application. Watch
  every recording from start to finish.
- Use only the task instruction and visible video evidence. Do not infer hidden
  behavior or implementation details. Do not treat on-screen claims as proof
  unless the visible behavior supports them.
- For input responsiveness, evaluate whether the application's 3D controls,
  interactive meshes, spatial buttons, and physics respond directly and
  naturally to spatial interaction.
- Virtual objects are rendered over the physical environment. Do not treat that
  overlay as an error.
- For every heuristic receiving a score below 4, provide a concrete,
  step-by-step code or scene change that can raise the score to 4 or 5.
- Cite visible events and timestamps in the notes."""


def build_user_prompt(video_files: list[Path], task_instruction: str) -> str:
    """Build the prompt that follows all uploaded recordings."""
    video_names = "\n".join(f"- {path.name}" for path in video_files)
    return f"""The preceding recordings show the same completed XR application.

RECORDINGS:
{video_names}

TASK SPECIFICATION & USER EXPERIENCE REQUIREMENTS:
{task_instruction}

Evaluate all recordings together against all 10 heuristics. Provide qualitative
observations in `notes` and a fix for every heuristic scored below 4."""


def file_state_name(file_ref: types.File) -> str:
    """Return a stable uppercase name for a Google file state."""
    state = file_ref.state
    name = getattr(state, "name", str(state))
    return name.rsplit(".", maxsplit=1)[-1].upper()


def wait_for_file_active(client: genai.Client, uploaded: types.File) -> types.File:
    """Wait until Gemini finishes processing one uploaded recording."""
    deadline = time.monotonic() + VIDEO_PROCESSING_TIMEOUT_SECONDS
    current = uploaded

    while not current.state or file_state_name(current) == "PROCESSING":
        if time.monotonic() >= deadline:
            raise TimeoutError(
                "Video processing did not finish within "
                f"{VIDEO_PROCESSING_TIMEOUT_SECONDS} seconds: {current.name}"
            )
        time.sleep(2)
        current = with_retries(
            "video processing status request",
            lambda: client.files.get(name=current.name),
        )

    if file_state_name(current) != "ACTIVE":
        raise RuntimeError(
            f"Video processing ended in state {file_state_name(current)}: "
            f"{current.name}"
        )
    return current


def upload_video(client: genai.Client, video_path: Path) -> types.File:
    """Upload one recording and wait until it is ready for inference."""
    uploaded = with_retries(
        f"upload of {video_path.name}",
        lambda: client.files.upload(
            file=str(video_path),
            config=types.UploadFileConfig(mime_type="video/mp4"),
        ),
    )
    return wait_for_file_active(client, uploaded)


def build_video_part(uploaded: types.File) -> types.Part:
    """Build a video part that uses agentic media processing."""
    return types.Part(
        file_data=types.FileData(
            file_uri=uploaded.uri,
            mime_type=uploaded.mime_type or "video/mp4",
        ),
        media_processing=types.MediaProcessing.AGENTIC,
    )


def evaluate_videos(
    client: genai.Client,
    model_name: str,
    video_files: list[Path],
    task_instruction: str,
) -> XRRubricEvaluation:
    """Evaluate all recordings together in one agentic model request."""
    uploaded_files: list[types.File] = []

    try:
        for video_path in video_files:
            print(f"Uploading {video_path.name} to Google GenAI...")
            uploaded_files.append(upload_video(client, video_path))

        response = with_retries(
            "judge model request",
            lambda: client.models.generate_content(
                model=model_name,
                contents=[
                    *(build_video_part(uploaded) for uploaded in uploaded_files),
                    build_user_prompt(video_files, task_instruction),
                ],
                config=types.GenerateContentConfig(
                    system_instruction=build_system_instruction(),
                    response_mime_type="application/json",
                    response_schema=XRRubricEvaluation,
                    temperature=0.1,
                    thinking_config=types.ThinkingConfig(thinking_budget=2048),
                ),
            ),
        )

        if isinstance(response.parsed, XRRubricEvaluation):
            return response.parsed
        if not response.text:
            raise ValueError("Judge returned an empty response.")
        return XRRubricEvaluation.model_validate_json(response.text)
    finally:
        for uploaded in uploaded_files:
            if not uploaded.name:
                continue
            try:
                client.files.delete(name=uploaded.name)
            except Exception as error:
                print(
                    f"Warning: Could not delete uploaded file {uploaded.name}: "
                    f"{error}",
                    file=sys.stderr,
                )


def main() -> None:
    """Run the judge with the fixed Harbor file contract."""
    video_files = find_video_files()
    if not video_files:
        raise FileNotFoundError(f"No MP4 recordings found in {ARTIFACTS_PATH}")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is required.")

    task_instruction = read_task_instruction()
    model_name = os.environ.get("MODEL_NAME", DEFAULT_MODEL)
    client = genai.Client(api_key=api_key)

    print(f"Evaluating {len(video_files)} recording(s) with {model_name}...")
    evaluation = evaluate_videos(
        client,
        model_name,
        video_files,
        task_instruction,
    )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        evaluation.model_dump_json(indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote LLM judge evaluation to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
