import React from "react";

interface Option {
  value: string | number;
  label: string;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
  options: Option[];
  infoText?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  id,
  options,
  infoText,
  className,
  ...props
}) => {
  return (
    <div className="form-group mb-3">
      <label htmlFor={id} className="form-label">
        {label}:
      </label>
      <select
        id={id}
        className={`form-select ${className || ""}`}
        aria-describedby={infoText ? `${id}-help` : undefined}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {infoText && (
        <div id={`${id}-help`} className="form-text">
          {infoText}
        </div>
      )}
    </div>
  );
};
