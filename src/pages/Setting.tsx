import { CogIcon, type LucideIcon, UserIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import MobileHeader from "@/components/MobileHeader";
import MyAccountSection from "@/components/Settings/MyAccountSection";
import PreferencesSection from "@/components/Settings/PreferencesSection";
import SectionMenuItem from "@/components/Settings/SectionMenuItem";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useMediaQuery from "@/hooks/useMediaQuery";
import { useTranslate } from "@/utils/i18n";

type SettingSection = "my-account" | "preference";

interface State {
  selectedSection: SettingSection;
}

const SECTIONS: SettingSection[] = ["my-account", "preference"];
const SECTION_ICON_MAP: Record<SettingSection, LucideIcon> = {
  "my-account": UserIcon,
  preference: CogIcon,
};

const Setting = () => {
  const t = useTranslate();
  const sm = useMediaQuery("sm");
  const location = useLocation();
  const [state, setState] = useState<State>({
    selectedSection: "my-account",
  });

  useEffect(() => {
    let hash = location.hash.slice(1) as SettingSection;
    if (!SECTIONS.includes(hash)) {
      hash = "my-account";
    }
    setState({ selectedSection: hash });
  }, [location.hash]);

  const handleSectionSelectorItemClick = useCallback((settingSection: SettingSection) => {
    window.location.hash = settingSection;
  }, []);

  return (
    <section className="@container w-full max-w-5xl min-h-full flex flex-col justify-start items-start sm:pt-3 md:pt-6 pb-8">
      {!sm && <MobileHeader />}
      <div className="w-full px-4 sm:px-6">
        <div className="w-full border border-border flex flex-row justify-start items-start px-4 py-3 rounded-xl bg-background text-muted-foreground">
          {sm && (
            <div className="flex flex-col justify-start items-start w-40 h-auto shrink-0 py-2">
              <span className="text-sm mt-0.5 pl-3 font-mono select-none text-muted-foreground">{t("common.basic")}</span>
              <div className="w-full flex flex-col justify-start items-start mt-1">
                {SECTIONS.map((item) => (
                  <SectionMenuItem
                    key={item}
                    text={t(`setting.${item}`)}
                    icon={SECTION_ICON_MAP[item]}
                    isSelected={state.selectedSection === item}
                    onClick={() => handleSectionSelectorItemClick(item)}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="w-full grow sm:pl-4 overflow-x-auto">
            {!sm && (
              <div className="w-auto inline-block my-2">
                <Select value={state.selectedSection} onValueChange={(value) => handleSectionSelectorItemClick(value as SettingSection)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((settingSection) => (
                      <SelectItem key={settingSection} value={settingSection}>
                        {t(`setting.${settingSection}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {state.selectedSection === "my-account" ? <MyAccountSection /> : <PreferencesSection />}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Setting;
