"use client";

interface FilterOption {
  label: string;
  value: string;
}

interface FiltersProps {
  filters: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
  }[];
  onChange: (key: string, value: string) => void;
}

export function Filters({ filters, onChange }: FiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filter.value}
          onChange={(e) => onChange(filter.key, e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
