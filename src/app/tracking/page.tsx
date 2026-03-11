import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveTrackingFilePublicUrl } from "@/lib/manu-tracking-storage";
import { TrackingClient, type ManuRequestItem } from "./tracking-client";

export default async function TrackingPage() {
  const user = await requireAuth();

  const raw = await prisma.manuRequest.findMany({
    where: { isFinished: false },
    orderBy: { createdAt: "desc" },
  });

  const requests: ManuRequestItem[] = await Promise.all(
    raw.map(async (req) => ({
      id: req.id,
      title: req.title,
      description: req.description,
      type: req.type as ManuRequestItem["type"],
      otherType: req.otherType,
      fileOriginalName: req.fileOriginalName,
      fileUrl: req.fileStoragePath
        ? await resolveTrackingFilePublicUrl(req.fileStoragePath)
        : null,
      createdAt: req.createdAt,
    })),
  );

  return (
    <TrackingClient isAdmin={user.role === "ADMIN"} requests={requests} />
  );
}
