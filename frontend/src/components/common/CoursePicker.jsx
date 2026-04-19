import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, GraduationCap } from "lucide-react";
import {
  COURSE_OPTIONS,
  CUSTOM_COURSE_VALUE,
} from "../../constants/courseOptions";

export default function CoursePicker({
  id,
  label,
  value,
  customValue,
  onSelect,
  onCustomChange,
  placeholder = "Select your course",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const displayValue = useMemo(() => {
    if (!value) return placeholder;
    if (value === CUSTOM_COURSE_VALUE) {
      return customValue?.trim() ? `Other: ${customValue.trim()}` : "Other";
    }
    return value;
  }, [customValue, placeholder, value]);

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <button
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="mt-1 flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-left outline-none transition focus:ring-2 focus:ring-indigo-500"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3 min-w-0">
          <GraduationCap className="h-4 w-4 text-slate-400" />
          <span className={`truncate ${value ? "text-slate-900" : "text-slate-400"}`}>
            {displayValue}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border bg-white shadow-xl">
          <div className="max-h-60 overflow-y-auto py-1">
            {COURSE_OPTIONS.map((course) => {
              const active = value === course;
              return (
                <button
                  key={course}
                  type="button"
                  onClick={() => {
                    onSelect(course);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition ${
                    active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {course}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {value === CUSTOM_COURSE_VALUE && (
        <div className="mt-3">
          <label htmlFor={`${id}-custom`} className="text-sm font-medium text-slate-700">
            Your Course
          </label>
          <div className="relative mt-1">
            <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id={`${id}-custom`}
              type="text"
              value={customValue}
              onChange={(e) => onCustomChange(e.target.value)}
              placeholder="Enter your course"
              className="w-full rounded-xl border py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
