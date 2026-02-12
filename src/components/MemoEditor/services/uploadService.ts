import { attachmentService } from "@/services";
import type { Attachment } from "@/types/github";
import type { LocalFile } from "../types/attachment";

export const uploadService = {
  async uploadFiles(localFiles: LocalFile[]): Promise<Attachment[]> {
    if (localFiles.length === 0) return [];

    const attachments: Attachment[] = [];

    for (const { file } of localFiles) {
      const attachment = await attachmentService.createAttachment(file);
      attachments.push(attachment);
    }

    return attachments;
  },
};
