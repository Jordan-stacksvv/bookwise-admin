import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, useApi } from "@/lib/mock-store";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, X, BookOpen, Users, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/departments")({
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const s = useStore();
  const api = useApi();
  const [newValue, setNewValue] = useState("");

  const depts = useMemo(
    () =>
      Array.from(
        new Set([
          ...s.departments,
          ...s.books.map((b) => b.department),
          ...s.kids.map((k) => k.department),
          ...s.teachers.map((t) => t.department),
        ]),
      ).filter(Boolean),
    [s.departments, s.books, s.kids, s.teachers],
  );

  const addDept = () => {
    if (!newValue.trim()) return;
    api.addDepartment(newValue.trim());
    setNewValue("");
  };

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Manage departments used across books, kids, and teachers."
      />

      <div className="bg-card border rounded-xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row gap-3" style={{ boxShadow: "var(--shadow-soft)" }}>
        <Input
          placeholder="New department name…"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addDept(); }}
          className="flex-1"
        />
        <Button disabled={!newValue.trim()} onClick={addDept}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Department
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 sm:px-4 py-3 font-medium">Department</th>
                <th className="px-3 sm:px-4 py-3 font-medium"><span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Books</span></th>
                <th className="px-3 sm:px-4 py-3 font-medium"><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Kids</span></th>
                <th className="px-3 sm:px-4 py-3 font-medium"><span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Teachers</span></th>
                <th className="px-3 sm:px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {depts.map((d) => {
                const bookCount = s.books.filter((b) => b.department === d).length;
                const kidCount = s.kids.filter((k) => k.department === d).length;
                const teacherCount = s.teachers.filter((t) => t.department === d).length;
                const inUse = bookCount > 0 || kidCount > 0 || teacherCount > 0;
                return (
                  <tr key={d} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 sm:px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" /> {d}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-muted-foreground tabular-nums">{bookCount}</td>
                    <td className="px-3 sm:px-4 py-3 text-muted-foreground tabular-nums">{kidCount}</td>
                    <td className="px-3 sm:px-4 py-3 text-muted-foreground tabular-nums">{teacherCount}</td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={inUse}
                        title={inUse ? "Remove this department from all books, kids, and teachers first" : "Delete department"}
                        onClick={() => api.deleteDepartment(d)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {depts.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No departments yet. Add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
