import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { ChevronDown, Download, FilePlus2, FolderOpen, Play, RotateCcw, Save } from "lucide-react";
import DashboardLayout from "../../components/dashboard/layout/DashboardLayout";
import codeExecutionService from "../../services/codeExecutionService";

const STORAGE_PREFIX = "student_code_editor";

const languageOptions = [
  { value: "python", label: "Python", extension: "py", monaco: "python" },
  { value: "javascript", label: "JavaScript", extension: "js", monaco: "javascript" },
  { value: "java", label: "Java", extension: "java", monaco: "java" },
  { value: "cpp", label: "C++", extension: "cpp", monaco: "cpp" },
  { value: "html", label: "HTML", extension: "html", monaco: "html" },
];

const starterCode = {
  python: `def greet(name):
    return f"Hello, {name}!"


print(greet("Student"))`,
  javascript: `const scores = [82, 91, 76, 95];
const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;

console.log("Average score:", average.toFixed(2));`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java");
    }
}`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++" << endl;
    return 0;
}`,
  html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
      }
      .card {
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(148, 163, 184, 0.35);
        border-radius: 16px;
        padding: 24px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Live HTML Preview</h1>
      <p>Edit this file and click Run Code.</p>
    </div>
  </body>
</html>`,
};

function getStorageKey(language) {
  return `${STORAGE_PREFIX}:${language}`;
}

function getInitialCode(language) {
  return localStorage.getItem(getStorageKey(language)) || starterCode[language];
}

export default function CodeEditor() {
  const [language, setLanguage] = useState(languageOptions[0].value);
  const [code, setCode] = useState(() => getInitialCode(languageOptions[0].value));
  const [output, setOutput] = useState("Output will appear here.");
  const [runtimeDetails, setRuntimeDetails] = useState("Runtime details will appear here.");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [fileBaseName, setFileBaseName] = useState("main");
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [pendingFileName, setPendingFileName] = useState("");
  const [isRenamingFile, setIsRenamingFile] = useState(false);
  const [fileHandle, setFileHandle] = useState(null);
  const fileInputRef = useRef(null);
  const fileMenuRef = useRef(null);
  const selectedLanguage = useMemo(
    () => languageOptions.find((option) => option.value === language) || languageOptions[0],
    [language]
  );

  useEffect(() => {
    setCode(getInitialCode(language));
    setOutput("Output will appear here.");
    setRuntimeDetails("Runtime details will appear here.");
  }, [language]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(language), code);
  }, [language, code]);

  useEffect(() => {
    if (!isFileMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target)) {
        setIsFileMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsFileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFileMenuOpen]);

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileBaseName}.${selectedLanguage.extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveFile = async () => {
    const extension = selectedLanguage.extension;
    const fileName = `${fileBaseName}.${extension}`;

    if ("showSaveFilePicker" in window) {
      try {
        let nextFileHandle = fileHandle;

        if (!nextFileHandle) {
          nextFileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: `${selectedLanguage.label} file`,
                accept: {
                  "text/plain": [`.${extension}`],
                },
              },
            ],
          });
          setFileHandle(nextFileHandle);
        }

        const writable = await nextFileHandle.createWritable();
        await writable.write(code);
        await writable.close();
        setLastSavedAt(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
        setRuntimeDetails(`Status: Saved\n\nMessage: File saved to your system as "${fileName}".`);
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
      }
    }

    handleDownload();
    setLastSavedAt(
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setRuntimeDetails(`Status: Saved\n\nMessage: Browser save dialog is unavailable, so the file was downloaded as "${fileName}".`);
  };

  const handleNewFile = () => {
    const suggestedName = `untitled-${Date.now()}`;
    setPendingFileName(suggestedName);
    setIsNewFileDialogOpen(true);
    setIsFileMenuOpen(false);
  };

  const confirmNewFile = () => {
    const suggestedName = `untitled-${Date.now()}`;
    const sanitizedName = pendingFileName.trim().replace(/\.[^.]*$/, "");

    setFileBaseName(sanitizedName || suggestedName);
    setCode("");
    setOutput("Output will appear here.");
    setRuntimeDetails("Runtime details will appear here.");
    setLastSavedAt("");
    setFileHandle(null);
    setIsNewFileDialogOpen(false);
    setPendingFileName("");
  };

  const cancelNewFile = () => {
    setIsNewFileDialogOpen(false);
    setPendingFileName("");
  };

  const commitRename = () => {
    const sanitizedName = fileBaseName.trim().replace(/\.[^.]*$/, "");
    setFileBaseName(sanitizedName || "untitled");
    setFileHandle(null);
    setIsRenamingFile(false);
  };

  const handleLoadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const fileName = file.name.replace(/\.[^.]+$/, "") || "untitled";
    const fileText = await file.text();

    setFileBaseName(fileName);
    setCode(fileText);
    setOutput("Loaded file content into the editor.");
    setRuntimeDetails(`Status: Ready\n\nMessage: Loaded file "${file.name}".`);
    setLastSavedAt("");
    setFileHandle(null);
    setIsFileMenuOpen(false);
    event.target.value = "";
  };

  const handleReset = () => {
    setCode(starterCode[language]);
    setOutput("Starter code restored.");
    setRuntimeDetails("Runtime details cleared.");
  };

  const handleRun = () => {
    void (async () => {
      if (language === "html") {
        setOutput("HTML rendered successfully.");
        setRuntimeDetails("Status: Ready\n\nMessage: HTML rendered in browser output.");
        return;
      }

      setIsRunning(true);
      setOutput("Running code...");
      setRuntimeDetails("Running code...");

      try {
        const result = await codeExecutionService.execute({
          language,
          source_code: code,
          stdin: "",
        });

        const sections = [
          `Status: ${result.success ? "Success" : "Failed"}`,
          `Message: ${result.message}`,
        ];

        if (typeof result.exit_code === "number") {
          sections.push(`Exit code: ${result.exit_code}`);
        }

        if (typeof result.execution_time_ms === "number") {
          sections.push(`Execution time: ${result.execution_time_ms} ms`);
        }

        if (result.stdout) {
          sections.push(`STDOUT:\n${result.stdout}`);
        }

        if (result.stderr) {
          sections.push(`STDERR:\n${result.stderr}`);
        }

        setRuntimeDetails(sections.join("\n\n"));
        setOutput(
          [result.stdout?.trimEnd(), result.stderr?.trimEnd()]
            .filter(Boolean)
            .join("\n")
            || "No output produced."
        );

      } catch (error) {
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Execution request failed.";

        setOutput("No output produced.");
        setRuntimeDetails(`Status: Failed\n\nMessage: ${message}`);
      } finally {
        setIsRunning(false);
      }
    })();
  };

  return (
    <DashboardLayout title="Code Lab">
      <section className="mx-auto flex max-w-[1600px] flex-col gap-6">
        {isNewFileDialogOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Create New File</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Enter a file name for the new file.
              </p>

              <div className="mt-5 flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                <input
                  type="text"
                  value={pendingFileName}
                  onChange={(event) => setPendingFileName(event.target.value)}
                  placeholder="File name"
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none dark:text-slate-100"
                />
                <span className="text-sm text-slate-400">.{selectedLanguage.extension}</span>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelNewFile}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmNewFile}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Create File
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Code Editor</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Write, save, and test code directly inside the student portal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div ref={fileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsFileMenuOpen((open) => !open)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  File
                  <ChevronDown size={16} />
                </button>

                {isFileMenuOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => {
                        void handleSaveFile();
                        setIsFileMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <Save size={16} />
                      Save File
                    </button>
                    <button
                      type="button"
                      onClick={handleNewFile}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <FilePlus2 size={16} />
                      New File
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <FolderOpen size={16} />
                      Load File
                    </button>
                  </div>
                ) : null}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".py,.js,.java,.cpp,.c,.cc,.html,.txt"
                  onChange={handleLoadFile}
                  className="hidden"
                />
              </div>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Download size={16} />
                Download
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw size={16} />
                Reset
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-70"
              >
                <Play size={16} />
                {isRunning ? "Running..." : "Run Code"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
              {isRenamingFile ? (
                <span className="inline-flex items-center gap-1">
                  <span>File:</span>
                  <input
                    type="text"
                    value={fileBaseName}
                    onChange={(event) => setFileBaseName(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitRename();
                      }
                      if (event.key === "Escape") {
                        setIsRenamingFile(false);
                      }
                    }}
                    autoFocus
                    className="w-24 bg-transparent outline-none"
                  />
                  <span>.{selectedLanguage.extension}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsRenamingFile(true)}
                  className="text-left"
                >
                  File: {fileBaseName}.{selectedLanguage.extension}
                </button>
              )}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
              Autosave enabled
            </span>
            {lastSavedAt ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                Last saved: {lastSavedAt}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid min-h-[720px] grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-[#1e1e1e] shadow-sm dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3 text-sm text-slate-200">
              <span className="font-semibold">{selectedLanguage.label} Editor</span>
              <span className="text-slate-400">Line numbers and syntax highlighting enabled</span>
            </div>
            <div className="h-[660px]">
              <Editor
                height="100%"
                language={selectedLanguage.monaco}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value ?? "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 15,
                  wordWrap: "on",
                  padding: { top: 16 },
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
          </div>

          <div className="flex min-h-[720px] flex-col gap-6">
            <div className="flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Output</h3>
              <div className="mt-4 min-h-[240px] rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                <pre className="whitespace-pre-wrap font-mono">{output}</pre>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                HTML renders in the browser. Python, JavaScript, Java, and C++ now run through the backend and depend on the server runtimes installed on this machine.
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Runtime Details</h3>
              <div className="mt-4 min-h-[240px] rounded-2xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                <pre className="whitespace-pre-wrap font-mono">{runtimeDetails}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
