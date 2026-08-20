import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-slate-800 bg-slate-900/80 text-center">
        <CardHeader className="items-center">
          <StatusBadge status="404 Not Found" variant="slate" />
          <CardTitle className="mt-4 text-xl text-slate-100">
            Resource Not Found
          </CardTitle>
          <CardDescription>
            The requested page or endpoint is not available in the current FixionFuel Order Management build.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/"
            className="inline-flex justify-center items-center px-4 py-2 text-xs font-semibold rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
          >
            Back to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
