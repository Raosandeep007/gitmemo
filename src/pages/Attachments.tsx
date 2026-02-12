import dayjs from "dayjs";
import {
  ExternalLinkIcon,
  PaperclipIcon,
  SearchIcon,
  Trash,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import AttachmentIcon from "@/components/AttachmentIcon";
import ConfirmDialog from "@/components/ConfirmDialog";
import Empty from "@/components/Empty";
import MobileHeader from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  useAttachments,
  useDeleteAttachment,
} from "@/hooks/useAttachmentQueries";
import useDialog from "@/hooks/useDialog";
import useMediaQuery from "@/hooks/useMediaQuery";
import i18n from "@/i18n";
import type { Attachment } from "@/types/github";
import { toDate } from "@/utils/date";
import { useTranslate } from "@/utils/i18n";

const getAttachmentDate = (attachment: Attachment): Date => {
  const fromCreateTime = toDate(attachment.createTime);
  if (fromCreateTime) return fromCreateTime;

  const filenamePrefix = attachment.filename.split("_")[0];
  const timestamp = Number(filenamePrefix);
  if (!Number.isNaN(timestamp) && timestamp > 0) {
    return new Date(timestamp);
  }

  return new Date();
};

const groupAttachmentsByDate = (
  attachments: Attachment[],
): Map<string, Attachment[]> => {
  const grouped = new Map<string, Attachment[]>();
  const sorted = [...attachments].sort(
    (a, b) =>
      dayjs(getAttachmentDate(b)).unix() - dayjs(getAttachmentDate(a)).unix(),
  );

  for (const attachment of sorted) {
    const monthKey = dayjs(getAttachmentDate(attachment)).format("YYYY-MM");
    const group = grouped.get(monthKey) ?? [];
    group.push(attachment);
    grouped.set(monthKey, group);
  }

  return grouped;
};

const filterAttachments = (
  attachments: Attachment[],
  searchQuery: string,
): Attachment[] => {
  if (!searchQuery.trim()) return attachments;
  const query = searchQuery.toLowerCase();
  return attachments.filter((attachment) =>
    attachment.filename.toLowerCase().includes(query),
  );
};

interface AttachmentItemProps {
  attachment: Attachment;
}

const AttachmentItem = ({ attachment }: AttachmentItemProps) => (
  <div className="w-24 sm:w-32 h-auto flex flex-col justify-start items-start">
    <div className="w-24 h-24 flex justify-center items-center sm:w-32 sm:h-32 border border-border overflow-clip rounded-xl cursor-pointer hover:shadow hover:opacity-80">
      <AttachmentIcon attachment={attachment} strokeWidth={0.5} />
    </div>
    <div className="w-full max-w-full flex flex-row justify-between items-center mt-1 px-1">
      <p className="text-xs shrink text-muted-foreground truncate">
        {attachment.filename}
      </p>
      {attachment.memo && (
        <Link
          to={`/${attachment.memo}`}
          className="text-primary hover:opacity-80 transition-opacity shrink-0 ml-1"
          aria-label="View memo"
        >
          <ExternalLinkIcon className="w-3 h-3" />
        </Link>
      )}
    </div>
  </div>
);

const Attachments = () => {
  const t = useTranslate();
  const md = useMediaQuery("md");
  const deleteUnusedAttachmentsDialog = useDialog();
  const { mutateAsync: deleteAttachment } = useDeleteAttachment();
  const { data: attachments = [], isLoading, refetch } = useAttachments();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredAttachments = useMemo(
    () => filterAttachments(attachments, searchQuery),
    [attachments, searchQuery],
  );
  const usedAttachments = useMemo(
    () => filteredAttachments.filter((attachment) => attachment.memo),
    [filteredAttachments],
  );
  const unusedAttachments = useMemo(
    () => filteredAttachments.filter((attachment) => !attachment.memo),
    [filteredAttachments],
  );
  const groupedAttachments = useMemo(
    () => groupAttachmentsByDate(usedAttachments),
    [usedAttachments],
  );

  const handleDeleteUnusedAttachments = useCallback(async () => {
    try {
      await Promise.all(
        unusedAttachments.map((attachment) =>
          deleteAttachment({
            name: attachment.name,
            sha: attachment.sha ?? "",
          }),
        ),
      );
      toast.success(t("resource.delete-all-unused-success"));
    } catch {
      toast.error(t("resource.delete-all-unused-error"));
    } finally {
      await refetch();
    }
  }, [unusedAttachments, deleteAttachment, t, refetch]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  return (
    <section className="@container w-full max-w-5xl min-h-full flex flex-col justify-start items-center sm:pt-3 md:pt-6 pb-8">
      {!md && <MobileHeader />}
      <div className="w-full px-4 sm:px-6">
        <div className="w-full border border-border flex flex-col justify-start items-start px-4 py-3 rounded-xl bg-background text-foreground">
          <div className="relative w-full flex flex-row justify-between items-center">
            <p className="py-1 flex flex-row justify-start items-center select-none opacity-80">
              <PaperclipIcon className="w-6 h-auto mr-1 opacity-80" />
              <span className="text-lg">{t("common.attachments")}</span>
            </p>
            <div>
              <div className="relative max-w-32">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("common.search")}
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col justify-start items-start mt-4 mb-6">
            {isLoading ? (
              <div className="w-full h-32 flex flex-col justify-center items-center">
                <p className="w-full text-center text-base my-6 mt-8">
                  {t("resource.fetching-data")}
                </p>
              </div>
            ) : (
              <>
                {filteredAttachments.length === 0 ? (
                  <div className="w-full mt-8 mb-8 flex flex-col justify-center items-center italic">
                    <Empty />
                    <p className="mt-4 text-muted-foreground">
                      {t("message.no-data")}
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className={
                        "w-full h-auto px-2 flex flex-col justify-start items-start gap-y-8"
                      }
                    >
                      {Array.from(groupedAttachments.entries()).map(
                        ([monthStr, monthAttachments]) => {
                          return (
                            <div
                              key={monthStr}
                              className="w-full flex flex-row justify-start items-start"
                            >
                              <div className="w-16 sm:w-24 pt-4 sm:pl-4 flex flex-col justify-start items-start">
                                <span className="text-sm opacity-60">
                                  {dayjs(monthStr).year()}
                                </span>
                                <span className="font-medium text-xl">
                                  {dayjs(monthStr)
                                    .toDate()
                                    .toLocaleString(i18n.language, {
                                      month: "short",
                                    })}
                                </span>
                              </div>
                              <div className="w-full max-w-[calc(100%-4rem)] sm:max-w-[calc(100%-6rem)] flex flex-row justify-start items-start gap-4 flex-wrap">
                                {monthAttachments.map((attachment) => (
                                  <AttachmentItem
                                    key={attachment.name}
                                    attachment={attachment}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        },
                      )}

                      {unusedAttachments.length > 0 && (
                        <>
                          <Separator />
                          <div className="w-full flex flex-row justify-start items-start">
                            <div className="w-16 sm:w-24 sm:pl-4 flex flex-col justify-start items-start"></div>
                            <div className="w-full max-w-[calc(100%-4rem)] sm:max-w-[calc(100%-6rem)] flex flex-row justify-start items-start gap-4 flex-wrap">
                              <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex flex-row items-center gap-2">
                                  <span className="text-muted-foreground">
                                    {t("resource.unused-resources")}
                                  </span>
                                  <span className="text-muted-foreground opacity-80">
                                    ({unusedAttachments.length})
                                  </span>
                                </div>
                                <div>
                                  <Button
                                    variant="destructive"
                                    onClick={() =>
                                      deleteUnusedAttachmentsDialog.open()
                                    }
                                    size="sm"
                                  >
                                    <Trash />
                                    {t("resource.delete-all-unused")}
                                  </Button>
                                </div>
                              </div>
                              {unusedAttachments.map((attachment) => (
                                <AttachmentItem
                                  key={attachment.name}
                                  attachment={attachment}
                                />
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteUnusedAttachmentsDialog.isOpen}
        onOpenChange={deleteUnusedAttachmentsDialog.setOpen}
        title={t("resource.delete-all-unused-confirm")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleDeleteUnusedAttachments}
        confirmVariant="destructive"
      />
    </section>
  );
};

export default Attachments;
