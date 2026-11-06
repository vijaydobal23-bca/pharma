import React from "react";
import { Inbox } from "lucide-react";

export const EmptyState = ({
  icon: Icon = Inbox,
  title = "No data found",
  description = "There are no records matching your criteria.",
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-100 my-4">
      <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

