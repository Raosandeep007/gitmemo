import { useAuth } from "@/contexts/AuthContext";
import { useTranslate } from "@/utils/i18n";
import UserAvatar from "../UserAvatar";
import SettingGroup from "./SettingGroup";
import SettingSection from "./SettingSection";

const MemberSection = () => {
  const t = useTranslate();
  const { currentUser } = useAuth();

  if (!currentUser) {
    return null;
  }

  return (
    <SettingSection>
      <SettingGroup title={t("setting.member-list")}>
        <div className="w-full flex flex-row justify-start items-center gap-3 py-2">
          <UserAvatar className="shrink-0 w-10 h-10" avatarUrl={currentUser.avatarUrl} />
          <div className="flex flex-col justify-center items-start">
            <span className="text-foreground font-medium">{currentUser.displayName || currentUser.username}</span>
            <span className="text-sm text-muted-foreground">@{currentUser.username}</span>
          </div>
          <span className="ml-auto text-sm text-muted-foreground capitalize">{currentUser.role.toLowerCase()}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          This instance is backed by GitHub. User management is handled through GitHub repository access.
        </p>
      </SettingGroup>
    </SettingSection>
  );
};

export default MemberSection;
