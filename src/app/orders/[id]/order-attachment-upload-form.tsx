"use client";

import { useActionState } from "react";
import { uploadOrderAttachment } from "@/app/orders/actions";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { EMPTY_FORM_STATE } from "@/lib/form-utils";

type OrderAttachmentUploadFormProps = {
  orderId: string;
};

export function OrderAttachmentUploadForm({
  orderId,
}: OrderAttachmentUploadFormProps) {
  const action = uploadOrderAttachment.bind(null, orderId);
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3"
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium text-black">Upload Attachment</span>
        <input
          type="file"
          name="attachment"
          required
          className="w-full rounded-md border border-slate-300/80 bg-white px-3 py-2 text-sm text-black"
        />
      </label>

      {state.fieldErrors.attachment ? (
        <p className="text-xs text-red-600">{state.fieldErrors.attachment}</p>
      ) : null}
      {state.error ? <FormMessage tone="error" message={state.error} /> : null}

      <SubmitButton idleLabel="Upload File" pendingLabel="Uploading..." />
    </form>
  );
}
