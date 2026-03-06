import { getBookmarkById, getSiteBookmarkById } from "@/app/bookmarks/actions";
import { NewOrderForm } from "@/app/orders/new/new-order-form";
import { FormMessage } from "@/components/form-message";
import { requireAuth } from "@/lib/auth";

type NewOrderPageProps = {
  searchParams: Promise<{
    fromBookmark?: string | string[];
    siteBookmarkId?: string | string[];
    launchUrl?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewOrderPage({ searchParams }: NewOrderPageProps) {
  const user = await requireAuth();
  const params = await searchParams;
  const fromBookmarkId = first(params.fromBookmark)?.trim();
  const siteBookmarkId = first(params.siteBookmarkId)?.trim();
  const launchUrl = first(params.launchUrl)?.trim();
  const canMutate = user.role === "ADMIN";

  let templateBookmark = null;
  let siteBookmark = null;
  if (fromBookmarkId && canMutate) {
    templateBookmark = await getBookmarkById(fromBookmarkId);
  }
  if (siteBookmarkId && canMutate) {
    siteBookmark = await getSiteBookmarkById(siteBookmarkId);
  }

  return (
    <section className="space-y-4">
      {fromBookmarkId && !templateBookmark ? (
        <FormMessage
          tone="error"
          message="Bookmark not found or not available for your account."
        />
      ) : null}
      {siteBookmarkId && !siteBookmark ? (
        <FormMessage
          tone="error"
          message="Website bookmark not found or not available for your account."
        />
      ) : null}

      {canMutate ? (
        <NewOrderForm
          defaults={{
            title: templateBookmark?.name ?? "",
            description: templateBookmark?.defaultDescription ?? "",
            requesterName: user.name,
            priority: 3,
            etaDays: "10",
            vendor:
              templateBookmark?.defaultVendor ?? siteBookmark?.siteVendorHint ?? "",
            orderNumber: "",
            orderUrl:
              launchUrl ?? siteBookmark?.siteUrl ?? templateBookmark?.defaultOrderUrl ?? "",
            quantity: "",
            category: templateBookmark?.defaultCategory ?? "OTHER",
          }}
          initialVendorLaunchUrl={launchUrl ?? siteBookmark?.siteUrl ?? null}
        />
      ) : (
        <div className="rounded-lg border border-black/10 bg-white p-6 text-sm text-black/75">
          VIEWER access is read-only. Order creation is only available to ADMIN.
        </div>
      )}
    </section>
  );
}
