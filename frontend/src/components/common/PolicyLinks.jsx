import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

export default function PolicyLinks({ className = "" }) {
  const location = useLocation();
  const linkState = { from: location.pathname };

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 ${className}`}>
      <Link to="/terms" state={linkState} className="hover:text-slate-700 hover:underline">
        Terms
      </Link>
      <span aria-hidden="true">|</span>
      <Link to="/privacy" state={linkState} className="hover:text-slate-700 hover:underline">
        Privacy
      </Link>
      <span aria-hidden="true">|</span>
      <Link to="/exam-rules" state={linkState} className="hover:text-slate-700 hover:underline">
        Exam Rules
      </Link>
    </div>
  );
}
