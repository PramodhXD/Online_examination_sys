import { useContext } from "react";
import { ExamContext } from "../context/exam-context";

export function useExam() {
  return useContext(ExamContext);
}
