/** Read every page for summaries and searchable catalogues; never silently truncate totals. */
export async function readAllRows(query: () => any) {
 const rows: any[] = [];
 for (let offset = 0; ; offset += 1000) {
  const result = await query().range(offset, offset + 999);
  if (result.error) return {data: null, error: result.error, count: null};
  rows.push(...(result.data || []));
  if ((result.data || []).length < 1000) return {data: rows, error: null, count: rows.length};
 }
}
