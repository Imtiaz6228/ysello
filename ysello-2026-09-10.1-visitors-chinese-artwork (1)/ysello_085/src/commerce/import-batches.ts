export async function importInBatches<T extends { imported: Array<{ remoteItemId: number }>; skipped: Array<{ remoteItemId: number; reason: string }> }>(
  ids: number[],
  send: (batch: number[]) => Promise<T>,
  progress: (completed: number, total: number) => void,
) {
  const selected = [...new Set(ids)];
  const imported: T["imported"] = [];
  const skipped: T["skipped"] = [];
  let error: string | null = null;
  for (let offset = 0; offset < selected.length; offset += 50) {
    try {
      const result = await send(selected.slice(offset, offset + 50));
      imported.push(...result.imported);
      skipped.push(...result.skipped);
      progress(Math.min(offset + 50, selected.length), selected.length);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Import request failed.";
      break;
    }
  }
  const successful = new Set(imported.map((item) => item.remoteItemId));
  return { imported, skipped, error, remaining: selected.filter((id) => !successful.has(id)) };
}
