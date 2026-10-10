
(() => {
    "use strict";

    const API_BASE = "http://127.0.0.1:8000";

    const form = document.getElementById("predict-form");
    const submitBtn = document.getElementById("submit-btn");
    const resetBtn = document.getElementById("reset-btn");
    const errorRetryBtn = document.getElementById("error-retry-btn");

    const stateIdle = document.getElementById("state-idle");
    const stateLoading = document.getElementById("state-loading");
    const stateResult = document.getElementById("state-result");
    const stateError = document.getElementById("state-error");

    const scoreNumberEl = document.getElementById("score-number");
    const scoreBandEl = document.getElementById("score-band");
    const scoreContextEl = document.getElementById("score-context");
    const gaugeFill = document.getElementById("gauge-fill");
    const errorLabelEl = document.getElementById("error-label");
    const errorCopyEl = document.getElementById("error-copy");

    const GAUGE_ARC_LENGTH = 314;

    // Draw gauge tick marks
    function drawTicks() {
        document.querySelectorAll(".gauge-ticks").forEach((g) => {
            g.innerHTML = "";

            const cx = 120;
            const cy = 140;
            const rOuter = 100;
            const rInner = 90;

            for (let i = 0; i <= 10; i += 2) {
                const angle = Math.PI - (i / 10) * Math.PI;

                const x1 = cx + rOuter * Math.cos(angle);
                const y1 = cy - rOuter * Math.sin(angle);
                const x2 = cx + rInner * Math.cos(angle);
                const y2 = cy - rInner * Math.sin(angle);

                const line = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "line"
                );

                line.setAttribute("x1", x1.toFixed(1));
                line.setAttribute("y1", y1.toFixed(1));
                line.setAttribute("x2", x2.toFixed(1));
                line.setAttribute("y2", y2.toFixed(1));

                g.appendChild(line);
            }
        });
    }

    drawTicks();

    // Stress level segmented buttons
    const segGroup = document.getElementById("stress_level_group");
    const stressHiddenInput = document.getElementById("stress_level");

    segGroup.querySelectorAll(".seg-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            segGroup.querySelectorAll(".seg-btn").forEach((b) => {
                b.classList.remove("active");
            });

            btn.classList.add("active");
            stressHiddenInput.value = btn.dataset.value;

            clearFieldError(stressHiddenInput);
        });
    });

    // Field error helpers
    function fieldWrapper(input) {
        return input.closest(".field");
    }

    function setFieldError(input, message) {
        if (!input) return;

        const wrap = fieldWrapper(input);
        if (!wrap) return;

        wrap.classList.add("field-error");

        const msgEl = wrap.querySelector(".error-msg");
        if (msgEl) msgEl.textContent = message;
    }

    function clearFieldError(input) {
        if (!input) return;

        const wrap = fieldWrapper(input);
        if (!wrap) return;

        wrap.classList.remove("field-error");

        const msgEl = wrap.querySelector(".error-msg");
        if (msgEl) msgEl.textContent = "";
    }

    function clearAllErrors() {
        form.querySelectorAll(".field").forEach((field) => {
            field.classList.remove("field-error");
        });

        form.querySelectorAll(".error-msg").forEach((msg) => {
            msg.textContent = "";
        });
    }

    // Collect form values using the HTML input names
    function collectPayload() {
        const fd = new FormData(form);

        return {
            age: fd.get("age") === ""
                ? NaN
                : Number(fd.get("age")),

            gender: fd.get("gender") || "",
            country: (fd.get("country") || "").trim(),

            academic_level: fd.get("academic_level") || "",
            most_used_platform: fd.get("most_used_platform") || "",
            purpose_of_use: fd.get("purpose_of_use") || "",

            avg_daily_usage_hours: fd.get("avg_daily_usage_hours") === ""
                ? NaN
                : Number(fd.get("avg_daily_usage_hours")),

            daily_unlocks: fd.get("daily_unlocks") === ""
                ? NaN
                : Number(fd.get("daily_unlocks")),

            study_hours: fd.get("study_hours") === ""
                ? NaN
                : Number(fd.get("study_hours")),

            physical_activity_hours: fd.get("physical_activity_hours") === ""
                ? NaN
                : Number(fd.get("physical_activity_hours")),

            sleep_hours_per_night: fd.get("sleep_hours_per_night") === ""
                ? NaN
                : Number(fd.get("sleep_hours_per_night")),

            stress_level: fd.get("stress_level") || ""
        };
    }

    // Client-side validation
    function validate(payload) {
        const errors = [];

        const numericChecks = [
            ["age", 10, 100],
            ["avg_daily_usage_hours", 0, 24],
            ["daily_unlocks", 0, Infinity],
            ["study_hours", 0, 24],
            ["physical_activity_hours", 0, 24],
            ["sleep_hours_per_night", 0, 24]
        ];

        numericChecks.forEach(([key, min, max]) => {
            const input = document.getElementById(key);
            const value = payload[key];

            if (!Number.isFinite(value)) {
                errors.push([input, "Enter a valid number."]);
            } else if (value < min || value > max) {
                errors.push([
                    input,
                    `Must be between ${min} and ${
                        max === Infinity ? "a valid non-negative value" : max
                    }.`
                ]);
            } else if (
                key === "daily_unlocks" &&
                !Number.isInteger(value)
            ) {
                errors.push([input, "Enter a whole number."]);
            }
        });

        [
            "gender",
            "country",
            "academic_level",
            "most_used_platform",
            "purpose_of_use"
        ].forEach((key) => {
            const input = document.getElementById(key);

            if (!payload[key] || String(payload[key]).trim() === "") {
                errors.push([input, "This field is required."]);
            }
        });

        const validStressLevels = ["Medium", "Low", "Very High", "High"];

        if (!validStressLevels.includes(payload.stress_level)) {
            errors.push([stressHiddenInput, "Pick a valid stress level."]);
        }

        return errors;
    }

    // Convert values to the exact field names expected by FastAPI
    function makeApiPayload(payload) {
        return {
            age: payload.age,
            gender: payload.gender,
            country: payload.country,

            academic_Level: payload.academic_level,
            most_Used_Platform: payload.most_used_platform,
            purpose_Of_Use: payload.purpose_of_use,

            avg_Daily_Usage_Hours: payload.avg_daily_usage_hours,
            daily_Unlocks: payload.daily_unlocks,
            study_Hours: payload.study_hours,
            physical_Activity_Hours: payload.physical_activity_hours,
            sleep_Hours_Per_Night: payload.sleep_hours_per_night,

            stress_Level: payload.stress_level
        };
    }

    // Show the selected UI state
    function showState(name) {
        [stateIdle, stateLoading, stateResult, stateError].forEach((el) => {
            el.hidden = true;
        });

        const states = {
            idle: stateIdle,
            loading: stateLoading,
            result: stateResult,
            error: stateError
        };

        if (states[name]) {
            states[name].hidden = false;
        }
    }

    function setSubmitting(isSubmitting) {
        submitBtn.disabled = isSubmitting;
        submitBtn.classList.toggle("loading", isSubmitting);
    }

    // Display score descriptions
    // Confirm these ranges match your model's actual target scale.
    function bandFor(score) {
        if (score < 4) {
            return {
                label: "Signal: strained",
                context: "This is a model-generated score. It is not a mental health diagnosis."
            };
        }

        if (score < 7) {
            return {
                label: "Signal: balanced",
                context: "This is a model-generated score, not a clinical assessment."
            };
        }

        return {
            label: "Signal: strong",
            context: "This is a model-generated score, not a clinical assessment."
        };
    }

    // Display the prediction
    function renderResult(score) {
        if (!Number.isFinite(score)) {
            renderError(
                "Unexpected response",
                "The API returned an invalid score."
            );
            return;
        }

        const clamped = Math.max(0, Math.min(10, score));
        const result = bandFor(clamped);

        scoreNumberEl.textContent = score.toFixed(2);
        scoreBandEl.textContent = result.label;
        scoreContextEl.textContent = result.context;

        gaugeFill.style.transition = "none";
        gaugeFill.style.strokeDashoffset = String(GAUGE_ARC_LENGTH);

        requestAnimationFrame(() => {
            gaugeFill.style.transition = "";

            const offset = GAUGE_ARC_LENGTH * (1 - clamped / 10);
            gaugeFill.style.strokeDashoffset = String(offset);
        });

        showState("result");
    }

    function renderError(label, message) {
        errorLabelEl.textContent = label;
        errorCopyEl.textContent = message;
        showState("error");
    }

    // Map FastAPI validation errors to HTML form fields
    function applyServerValidationErrors(detail) {
        if (!Array.isArray(detail)) return false;

        const fieldMap = {
            age: "age",
            gender: "gender",
            country: "country",
            academic_Level: "academic_level",
            most_Used_Platform: "most_used_platform",
            purpose_Of_Use: "purpose_of_use",
            avg_Daily_Usage_Hours: "avg_daily_usage_hours",
            daily_Unlocks: "daily_unlocks",
            study_Hours: "study_hours",
            physical_Activity_Hours: "physical_activity_hours",
            sleep_Hours_Per_Night: "sleep_hours_per_night",
            stress_Level: "stress_level"
        };

        let matched = false;

        detail.forEach((err) => {
            const field = Array.isArray(err.loc)
                ? err.loc[err.loc.length - 1]
                : null;

            const htmlId = fieldMap[field] || field;
            const input = htmlId
                ? document.getElementById(htmlId)
                : null;

            if (input) {
                setFieldError(input, err.msg || "Invalid value.");
                matched = true;
            }
        });

        return matched;
    }

    // Submit the form to FastAPI
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearAllErrors();

        const formPayload = collectPayload();
        const clientErrors = validate(formPayload);

        if (clientErrors.length > 0) {
            clientErrors.forEach(([input, message]) => {
                setFieldError(input, message);
            });

            clientErrors[0][0]?.focus?.();
            return;
        }

        const apiPayload = makeApiPayload(formPayload);

        setSubmitting(true);
        showState("loading");

        try {
            const response = await fetch(`${API_BASE}/predict`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(apiPayload)
            });

            const data = await response.json().catch(() => null);

            if (response.status === 422) {
                const matched = data &&
                    applyServerValidationErrors(data.detail);

                renderError(
                    "Check your inputs",
                    matched
                        ? "Some fields were rejected by the API. Check the marked fields."
                        : "The API rejected the input. Check your form values."
                );

                return;
            }

            if (!response.ok) {
                const message = data && data.detail
                    ? typeof data.detail === "string"
                        ? data.detail
                        : JSON.stringify(data.detail)
                    : `The API responded with status ${response.status}.`;

                renderError("Prediction failed", message);
                return;
            }

            // IMPORTANT: Match the exact key returned by FastAPI
            const score = data?.predict_mental_health_score;

            if (typeof score !== "number") {
                renderError(
                    "Unexpected response",
                    "The API response did not contain predict_mental_health_score."
                );
                return;
            }

            renderResult(score);

        } catch (error) {
            console.error("Prediction request failed:", error);

            renderError(
                "Can't reach the server",
                `Could not connect to ${API_BASE}. Make sure FastAPI is running.`
            );

        } finally {
            setSubmitting(false);
        }
    });

    // Clear field errors when the user edits a field
    form.querySelectorAll("input, select").forEach((element) => {
        element.addEventListener("input", () => {
            clearFieldError(element);
        });

        element.addEventListener("change", () => {
            clearFieldError(element);
        });
    });

    // Reset result display
    resetBtn.addEventListener("click", () => {
        clearAllErrors();
        showState("idle");
    });

    // Retry after an error
    errorRetryBtn.addEventListener("click", () => {
        showState("idle");
    });

})();
