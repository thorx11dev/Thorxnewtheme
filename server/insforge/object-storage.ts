import { insforgeRequest } from "./client";

export interface ObjectUploadResult {
  key: string;
  url: string;
}

export async function uploadToInsforgeStorage(key: string, base64Content: string, contentType: string): Promise<ObjectUploadResult> {
  return insforgeRequest<ObjectUploadResult>("POST", "/storage/upload", {
    key,
    content: base64Content,
    contentType,
  });
}

export async function deleteFromInsforgeStorage(key: string): Promise<void> {
  await insforgeRequest("DELETE", `/storage/object/${encodeURIComponent(key)}`);
}
