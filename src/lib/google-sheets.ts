import { google } from "googleapis";

/**
 * Fetches all rows from a Google Spreadsheet using a service account key.
 * Returns the raw row data as a 2D string array (including the header row).
 *
 * @param sheetGid  Optional numeric sheet tab ID from the URL (?gid=…).
 *                  When provided, the matching tab is used. Falls back to the
 *                  first sheet if the gid is not found.
 */
export async function fetchSheetRows(
  spreadsheetId: string,
  serviceAccountKey: Record<string, unknown>,
  sheetGid?: number,
): Promise<string[][]> {
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // Determine the tab title to use as the range prefix
  let sheetTitle: string | undefined;
  if (sheetGid !== undefined) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const match = (meta.data.sheets ?? []).find(
      (s) => s.properties?.sheetId === sheetGid,
    );
    sheetTitle = match?.properties?.title ?? undefined;
  }

  // If we found a title use "Title!A:Z", otherwise omit the prefix (first sheet)
  const range = sheetTitle ? `${sheetTitle}` : undefined;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: range ?? "A:Z",
  });

  return (response.data.values as string[][] | null | undefined) ?? [];
}
