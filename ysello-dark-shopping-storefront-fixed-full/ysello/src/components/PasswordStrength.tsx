import { Check, X } from "lucide-react";

const rules = [
  { label: "12+ characters", test: (value: string) => value.length >= 12 },
  {
    label: "Uppercase and lowercase",
    test: (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value),
  },
  { label: "Number", test: (value: string) => /[0-9]/.test(value) },
  { label: "Symbol", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function PasswordStrength({ value }: { value: string }) {
  const passed = rules.filter((rule) => rule.test(value)).length;

  return (
    <div className="password-strength">
      <div className="strength-track" aria-hidden="true">
        <span style={{ width: `${(passed / rules.length) * 100}%` }} />
      </div>
      <div className="strength-rules">
        {rules.map((rule) => {
          const ok = rule.test(value);
          const Icon = ok ? Check : X;

          return (
            <span key={rule.label} className={ok ? "passed" : ""}>
              <Icon size={14} aria-hidden="true" />
              {rule.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
