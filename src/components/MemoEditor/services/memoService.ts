import { isEqual } from "lodash-es";
import { memoService as memoApi } from "@/services";
import type { Memo } from "@/types/github";
import type { EditorState } from "../state";
import { uploadService } from "./uploadService";

function buildUpdateMask(
  prevMemo: Memo,
  state: EditorState,
  allAttachments: typeof state.metadata.attachments,
): { mask: Set<string>; patch: Partial<Memo> } {
  const mask = new Set<string>();
  const patch: Partial<Memo> = {
    name: prevMemo.name,
    content: state.content,
  };

  if (!isEqual(state.content, prevMemo.content)) {
    mask.add("content");
    patch.content = state.content;
  }
  if (!isEqual(state.metadata.visibility, prevMemo.visibility)) {
    mask.add("visibility");
    (patch as Record<string, unknown>).visibility = state.metadata.visibility;
  }
  if (!isEqual(allAttachments, prevMemo.attachments)) {
    mask.add("attachments");
    patch.attachments = allAttachments;
  }
  if (!isEqual(state.metadata.relations, prevMemo.relations)) {
    mask.add("relations");
    patch.relations = state.metadata.relations;
  }
  if (!isEqual(state.metadata.location, prevMemo.location)) {
    mask.add("location");
    patch.location = state.metadata.location;
  }

  // Auto-update timestamp if content changed
  if (["content", "attachments", "relations", "location"].some((key) => mask.has(key))) {
    mask.add("update_time");
  }

  // Handle custom timestamps
  if (state.timestamps.createTime) {
    if (!isEqual(state.timestamps.createTime, prevMemo.createTime)) {
      mask.add("create_time");
      patch.createTime = state.timestamps.createTime;
    }
  }
  if (state.timestamps.updateTime) {
    if (!isEqual(state.timestamps.updateTime, prevMemo.updateTime)) {
      mask.add("update_time");
      patch.updateTime = state.timestamps.updateTime;
    }
  }

  return { mask, patch };
}

export const memoService = {
  async save(
    state: EditorState,
    options: {
      memoName?: string;
      parentMemoName?: string;
    },
  ): Promise<{ memoName: string; hasChanges: boolean }> {
    // 1. Upload local files first
    const newAttachments = await uploadService.uploadFiles(state.localFiles);
    const allAttachments = [...state.metadata.attachments, ...newAttachments];

    // 2. Update existing memo
    if (options.memoName) {
      const prevMemo = await memoApi.getMemo(options.memoName);
      const { mask, patch } = buildUpdateMask(prevMemo, state, allAttachments);

      if (mask.size === 0) {
        return { memoName: prevMemo.name, hasChanges: false };
      }

      const memo = await memoApi.updateMemo(options.memoName, patch, Array.from(mask));
      return { memoName: memo.name, hasChanges: true };
    }

    // 3. Create new memo or comment
    if (options.parentMemoName) {
      const comment = await memoApi.createMemoComment(options.parentMemoName, state.content);
      return { memoName: comment.name, hasChanges: true };
    }

    const memo = await memoApi.createMemo({
      content: state.content,
      visibility: state.metadata.visibility,
      attachments: allAttachments,
      relations: state.metadata.relations,
      location: state.metadata.location,
    });

    return { memoName: memo.name, hasChanges: true };
  },

  async load(memoName: string): Promise<EditorState> {
    const memo = await memoApi.getMemo(memoName);

    return {
      content: memo.content,
      metadata: {
        visibility: memo.visibility,
        attachments: memo.attachments,
        relations: memo.relations,
        location: memo.location,
      },
      ui: {
        isFocusMode: false,
        isLoading: {
          saving: false,
          uploading: false,
          loading: false,
        },
        isDragging: false,
        isComposing: false,
      },
      timestamps: {
        createTime: memo.createTime,
        updateTime: memo.updateTime,
      },
      localFiles: [],
    };
  },
};
