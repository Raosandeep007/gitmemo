import { DatabaseIcon } from "lucide-react";
import { useTranslate } from "@/utils/i18n";
import SettingGroup from "./SettingGroup";
import SettingRow from "./SettingRow";
import SettingSection from "./SettingSection";

const StorageSection = () => {
  const t = useTranslate();

  return (
    <SettingSection>
      <SettingGroup title={t("setting.storage-section.current-storage")}>
        <SettingRow label={t("setting.storage-section.current-storage")}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DatabaseIcon className="w-4 h-4" />
            <span>GitHub Repository</span>
          </div>
        </SettingRow>
        <p className="text-sm text-muted-foreground mt-2">
          All data is stored in your GitHub repository. Attachments are saved as files in the repository.
        </p>
      </SettingGroup>
    </SettingSection>
  );
};

export default StorageSection;
