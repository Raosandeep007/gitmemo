import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import useLoading from "@/hooks/useLoading";
import { handleError } from "@/lib/error";
import { settingsService } from "@/services";
import type { Shortcut } from "@/types/github";
import { useTranslate } from "@/utils/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcut?: Shortcut;
  onSuccess?: () => void;
}

const newShortcut = (shortcut?: Shortcut): Shortcut => {
  const id = shortcut?.id ?? shortcut?.name?.split("/").at(-1) ?? "";
  return {
    name: shortcut?.name || "",
    id,
    title: shortcut?.title || "",
    filter: shortcut?.filter || "",
  };
};

function CreateShortcutDialog({ open, onOpenChange, shortcut: initialShortcut, onSuccess }: Props) {
  const t = useTranslate();
  const { refetchSettings } = useAuth();
  const [shortcut, setShortcut] = useState<Shortcut>(newShortcut(initialShortcut));
  const requestState = useLoading(false);
  const isCreating = shortcut.name === "";

  useEffect(() => {
    setShortcut(newShortcut(initialShortcut));
  }, [initialShortcut]);

  const onShortcutTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShortcut((prev) => ({ ...prev, title: e.target.value }));
  };

  const onShortcutFilterChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setShortcut((prev) => ({ ...prev, filter: e.target.value }));
  };

  const handleSaveBtnClick = async () => {
    if (!shortcut.title || !shortcut.filter) {
      toast.error("Title and filter cannot be empty");
      return;
    }

    try {
      requestState.setLoading();
      if (isCreating) {
        await settingsService.createShortcut({
          title: shortcut.title,
          filter: shortcut.filter,
        });
        toast.success("Create shortcut successfully");
      } else {
        await settingsService.updateShortcut({
          ...shortcut,
          id: shortcut.id || shortcut.name.split("/").at(-1) || "",
        });
        toast.success("Update shortcut successfully");
      }
      await refetchSettings();
      requestState.setFinish();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      await handleError(error, toast.error, {
        context: isCreating ? "Create shortcut" : "Update shortcut",
        onError: () => requestState.setError(),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{`${isCreating ? t("common.create") : t("common.edit")} ${t("common.shortcuts")}`}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">{t("common.title")}</Label>
            <Input id="title" type="text" placeholder="" value={shortcut.title} onChange={onShortcutTitleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter">{t("common.filter")}</Label>
            <Textarea
              id="filter"
              rows={3}
              placeholder={t("common.shortcut-filter")}
              value={shortcut.filter}
              onChange={onShortcutFilterChange}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">{t("common.learn-more")}:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <a
                  className="text-primary hover:underline"
                  href="https://www.usememos.com/docs/usage/shortcuts"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Docs - Shortcuts
                </a>
              </li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={requestState.isLoading} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={requestState.isLoading} onClick={handleSaveBtnClick}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateShortcutDialog;
