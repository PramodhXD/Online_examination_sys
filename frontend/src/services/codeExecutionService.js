import api from "./api";

const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 30000;

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

const codeExecutionService = {
  enqueue: async (payload) => api.post("/code/execute", payload).then((res) => res.data),

  getResult: async (jobId) => api.get(`/code-result/${jobId}`).then((res) => res.data),

  waitForResult: async (jobId, { intervalMs = DEFAULT_POLL_INTERVAL_MS, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const result = await codeExecutionService.getResult(jobId);
      if (result.status === "completed") {
        return {
          language: result.language,
          success: Boolean(result.success),
          stdout: result.output || "",
          stderr: result.error || "",
          exit_code: result.exit_code ?? null,
          execution_time_ms: result.execution_time ?? null,
          runtime_available: result.runtime_available ?? true,
          message: result.message || "Execution completed.",
        };
      }

      if (result.status === "failed") {
        throw new Error(result.error || result.message || "Code execution failed.");
      }

      await sleep(intervalMs);
    }

    throw new Error("Code execution timed out while waiting for the result.");
  },

  execute: async (payload, options) => {
    const queued = await codeExecutionService.enqueue(payload);
    if (queued.queued === false && queued.result) {
      return queued.result;
    }
    return codeExecutionService.waitForResult(queued.job_id, options);
  },
};

export default codeExecutionService;
