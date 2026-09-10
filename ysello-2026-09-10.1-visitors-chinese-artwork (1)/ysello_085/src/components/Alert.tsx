import { CheckCircle2, AlertCircle } from "lucide-react";

type AlertProps = {
  type: "success" | "error" | "info";
  message: string;
};

export function Alert({ type, message }: AlertProps) {
  const Icon = type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`alert ${type}`} role="status">
      <Icon size={18} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
