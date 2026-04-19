export const COURSE_OPTIONS = [
  "BSC",
  "BCom",
  "BCA",
  "BBA",
  "BA",
  "B.Tech",
  "BE",
  "MSC",
  "MCom",
  "MCA",
  "MBA",
  "MA",
  "M.Tech",
  "Diploma",
  "Other",
];

export const CUSTOM_COURSE_VALUE = "Other";

export const isPresetCourse = (value) =>
  COURSE_OPTIONS.some((course) => course !== CUSTOM_COURSE_VALUE && course === value);
