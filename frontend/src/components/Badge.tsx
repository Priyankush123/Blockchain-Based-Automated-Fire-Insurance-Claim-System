import React from "react";

interface BadgeProps {
  status: string;
  type?: "claim" | "policy" | "role" | "general";
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  let color = "bg-slate-800 text-slate-300 border-slate-700";

  const upper = status.toUpperCase();

  if (upper === "VERIFIED" || upper === "APPROVED" || upper === "SETTLED" || upper === "ACTIVE") {
    color = "bg-emerald-950/80 text-emerald-400 border-emerald-600/50";
  } else if (upper === "SUBMITTED" || upper === "PENDING" || upper === "ASSESSED") {
    color = "bg-amber-950/80 text-amber-400 border-amber-600/50";
  } else if (upper === "REJECTED" || upper === "CANCELLED" || upper === "EXPIRED") {
    color = "bg-rose-950/80 text-rose-400 border-rose-600/50";
  } else if (upper === "ADMIN" || upper === "DEFAULT ADMIN") {
    color = "bg-purple-950/80 text-purple-400 border-purple-600/50";
  } else if (upper === "INSURER") {
    color = "bg-blue-950/80 text-blue-400 border-blue-600/50";
  } else if (upper === "FIRE OFFICER") {
    color = "bg-flame-950/80 text-flame-400 border-flame-600/50";
  } else if (upper === "SURVEYOR") {
    color = "bg-cyan-950/80 text-cyan-400 border-cyan-600/50";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {status}
    </span>
  );
};
