import { isEqual } from "lodash-es";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useInstance } from "@/contexts/InstanceContext";
import useDialog from "@/hooks/useDialog";
import { settingsService } from "@/services";
import { useTranslate } from "@/utils/i18n";
import UpdateCustomizedProfileDialog from "../UpdateCustomizedProfileDialog";
import SettingGroup from "./SettingGroup";
import SettingRow from "./SettingRow";
import SettingSection from "./SettingSection";

interface GeneralSetting {
  customProfile: {
    title: string;
    description: string;
    logoUrl: string;
  };
  additionalStyle: string;
  additionalScript: string;
}

const InstanceSection = () => {
  const t = useTranslate();
  const customizeDialog = useDialog();
  const { generalSetting: originalSetting } = useInstance();
  const [instanceGeneralSetting, setInstanceGeneralSetting] = useState<GeneralSetting>({
    customProfile: originalSetting.customProfile,
    additionalStyle: "",
    additionalScript: "",
  });

  useEffect(() => {
    setInstanceGeneralSetting((prev) => ({
      ...prev,
      customProfile: originalSetting.customProfile,
    }));
  }, [originalSetting]);

  const handleUpdateCustomizedProfileButtonClick = () => {
    customizeDialog.open();
  };

  const updatePartialSetting = (partial: Partial<GeneralSetting>) => {
    setInstanceGeneralSetting((prev) => ({
      ...prev,
      ...partial,
    }));
  };

  const handleSaveGeneralSetting = async () => {
    try {
      await settingsService.updateSettings({});
      toast.success(t("message.update-succeed"));
    } catch (error: unknown) {
      console.error("Update general settings failed:", error);
      toast.error("Failed to update settings");
    }
  };

  return (
    <SettingSection>
      <SettingGroup title={t("common.basic")}>
        <SettingRow label={t("setting.system-section.server-name")} description={instanceGeneralSetting.customProfile?.title || "Memos"}>
          <Button variant="outline" onClick={handleUpdateCustomizedProfileButtonClick}>
            {t("common.edit")}
          </Button>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("setting.system-section.title")} showSeparator>
        <SettingRow label={t("setting.system-section.additional-style")} vertical>
          <Textarea
            className="font-mono w-full"
            rows={3}
            placeholder={t("setting.system-section.additional-style-placeholder")}
            value={instanceGeneralSetting.additionalStyle}
            onChange={(event) => updatePartialSetting({ additionalStyle: event.target.value })}
          />
        </SettingRow>

        <SettingRow label={t("setting.system-section.additional-script")} vertical>
          <Textarea
            className="font-mono w-full"
            rows={3}
            placeholder={t("setting.system-section.additional-script-placeholder")}
            value={instanceGeneralSetting.additionalScript}
            onChange={(event) => updatePartialSetting({ additionalScript: event.target.value })}
          />
        </SettingRow>
      </SettingGroup>

      <div className="w-full flex justify-end">
        <Button disabled={isEqual(instanceGeneralSetting.customProfile, originalSetting.customProfile)} onClick={handleSaveGeneralSetting}>
          {t("common.save")}
        </Button>
      </div>

      <UpdateCustomizedProfileDialog
        open={customizeDialog.isOpen}
        onOpenChange={customizeDialog.setOpen}
        onSuccess={() => {
          toast.success("Profile updated successfully!");
        }}
      />
    </SettingSection>
  );
};

export default InstanceSection;
