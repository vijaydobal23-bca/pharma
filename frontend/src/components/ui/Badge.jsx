import React from "react";

export const Badge = ({ children, variant = "default", size = "sm", className = "" }) => {
  const variantStyles = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    teal: "bg-teal-50 text-teal-700 border-teal-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    fefo: "bg-cyan-50 text-cyan-800 border-cyan-200 font-mono",
  };

  const sizeStyles = {
    xs: "px-2 py-0.5 text-[10px]",
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full ${
        variantStyles[variant] || variantStyles.default
      } ${sizeStyles[size] || sizeStyles.sm} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;

