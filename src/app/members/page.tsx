import { requireAdmin } from "@/lib/auth";
import { getMembers } from "@/app/members/actions";
import { MembersTable } from "@/components/members-table";

export default async function MembersPage() {
  await requireAdmin();
  const members = await getMembers();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-black dark:text-white">Members</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Import from a CSV exported from Google Sheets. Columns: First Name, Last Name, Subteam, Position.
        </p>
      </div>
      <MembersTable initialMembers={members} />
    </div>
  );
}
