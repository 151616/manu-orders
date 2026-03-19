import { requireAuth } from "@/lib/auth";
import { listActiveManuRequests } from "./actions";
import { TrackingClient, type ManuRequestItem } from "./tracking-client";

export default async function TrackingPage() {
  const user = await requireAuth();
  const requests = await listActiveManuRequests();

  const items: ManuRequestItem[] = requests.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type as ManuRequestItem["type"],
    otherType: r.otherType,
    priority: r.priority,
    robot: r.robot as ManuRequestItem["robot"],
    fileOriginalName: r.fileOriginalName,
    fileUrl: r.fileUrl,
  }));

  return <TrackingClient isAdmin={user.role === "ADMIN"} requests={items} />;
}
