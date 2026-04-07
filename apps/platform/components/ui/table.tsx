import * as React from "react";

import { cn } from "../../lib/utils";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="[&_tr]:border-b [&_tr]:border-slate-800" {...props} />;
}

export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}

export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="border-b border-slate-900 transition-colors hover:bg-slate-900/50" {...props} />;
}

export function TableHead(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className="h-10 px-4 text-left align-middle font-medium text-slate-400" {...props} />;
}

export function TableCell(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className="p-4 align-middle" {...props} />;
}
