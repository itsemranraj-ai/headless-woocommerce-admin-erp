"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log non-sensitive client error to console in development
    console.error("FixionFuel Application Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-rose-900/40 bg-slate-900/90">
        <CardHeader>
          <div className="flex items-center justify-between">
            <StatusBadge status="Application Error" variant="rose" />
            {error.digest && (
              <span className="text-[10px] text-slate-500 font-mono">
                Digest: {error.digest}
              </span>
            )}
          </div>
          <CardTitle className="mt-3 text-lg text-slate-100">
            Something went wrong
          </CardTitle>
          <CardDescription>
            An unexpected error occurred while rendering this view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-slate-950 p-3 text-xs text-slate-400 font-mono overflow-auto max-h-32 mb-4 border border-slate-800">
            {error.message || "Unknown client execution error."}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => reset()}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex justify-center items-center px-4 py-2 text-xs font-medium rounded-lg border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
