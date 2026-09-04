import fs from "node:fs/promises";
import path from "node:path";
import { ApiError } from "../middleware/error-handler.js";

export type StoredFileRecord = {
  storagePath: string;
  data?: Uint8Array | null;
};

export async function readStoredFileData(file: StoredFileRecord) {
  if (file.data?.byteLength) return Buffer.from(file.data);

  try {
    return await fs.readFile(path.resolve(file.storagePath));
  } catch {
    throw new ApiError(
      410,
      "This delivery file is no longer available. The seller must upload a replacement version.",
      "PRODUCT_FILE_UNAVAILABLE",
    );
  }
}
