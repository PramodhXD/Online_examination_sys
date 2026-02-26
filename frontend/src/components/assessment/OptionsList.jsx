export default function OptionsList({ options, selected, onSelect }) {
  return (
    <div className="space-y-3">
      {options.map((opt, idx) => {
        const active = selected === idx;

        return (
          <label
            key={idx}
            className={`flex items-center gap-4 px-5 py-4 rounded-md cursor-pointer transition
              ${
                active
                  ? "border border-blue-600 bg-blue-50"
                  : "border border-gray-200 hover:border-blue-300 hover:bg-gray-50"
              }
            `}
          >
            <input
              type="radio"
              checked={active}
              onChange={() => onSelect(idx)}
              className="accent-blue-600"
            />
            <span className="text-gray-800">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}
