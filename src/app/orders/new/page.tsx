import { getBookmarkById } from "@/app/bookmarks/actions";
import { NewOrderForm } from "@/app/orders/new/new-order-form";
import { FormMessage } from "@/components/form-message";
import { requireAuth } from "@/lib/auth";

type NewOrderPageProps = {
  searchParams: Promise<{
    fromBookmark?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewOrderPage({ searchParams }: NewOrderPageProps) {
  const user = await requireAuth();
  const params = await searchParams;
  const fromBookmarkId = first(params.fromBookmark)?.trim();
  const canMutate = user.role === "ADMIN";

  let bookmark = null;
  if (fromBookmarkId && canMutate) {
    bookmark = await getBookmarkById(fromBookmarkId);
  }

  return (
    <section className="space-y-4">
      {fromBookmarkId && !bookmark ? (
        <FormMessage
          tone="error"
          message="Bookmark not found or not available for your account."
        />
      ) : null}

      {canMutate ? (
        <NewOrderForm
          defaults={{
            title: bookmark?.name ?? "",
            description: bookmark?.defaultDescription ?? "",
            requesterName: user.name,
            requesterContact: "",
            vendor: bookmark?.defaultVendor ?? "",
            orderNumber: "",
            orderUrl: bookmark?.defaultOrderUrl ?? "",
            quantity: "",
            category: bookmark?.defaultCategory ?? "OTHER",
          }}
        />
      ) : (
        <div className="rounded-lg border border-black/10 bg-white p-6 text-sm text-black/75">
          VIEWER access is read-only. Order creation is only available to ADMIN.
        </div>
      )}
    </section>
  );
}
