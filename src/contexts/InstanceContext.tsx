import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { settingsService } from "@/services";
import { GITHUB_REACTIONS, type UserSettings } from "@/types/github";

interface InstanceProfile {
  version: string;
  mode: string;
  admin: string;
}

interface InstanceState {
  profile: InstanceProfile;
  settings: UserSettings;
  isInitialized: boolean;
  isLoading: boolean;
}

interface GeneralSetting {
  registrationAllowed: boolean;
  passwordAuthAllowed: boolean;
  disallowChangeUsername: boolean;
  disallowChangeNickname: boolean;
  customProfile: {
    title: string;
    description: string;
    logoUrl: string;
  };
}

interface MemoRelatedSetting {
  contentLengthLimit: number;
  reactions: string[];
  disallowPublicVisibility: boolean;
  displayWithUpdateTime: boolean;
}

interface InstanceContextValue extends InstanceState {
  generalSetting: GeneralSetting;
  memoRelatedSetting: MemoRelatedSetting;
  initialize: () => Promise<void>;
  fetchSetting: (_key: string) => Promise<void>;
}

const defaultProfile: InstanceProfile = {
  version: "1.0.0",
  mode: "github",
  admin: "admin",
};

const defaultGeneralSetting: GeneralSetting = {
  registrationAllowed: false,
  passwordAuthAllowed: false,
  disallowChangeUsername: false,
  disallowChangeNickname: false,
  customProfile: {
    title: "Memos",
    description: "",
    logoUrl: "",
  },
};

const defaultMemoRelatedSetting: MemoRelatedSetting = {
  contentLengthLimit: 0,
  reactions: Object.keys(GITHUB_REACTIONS),
  disallowPublicVisibility: false,
  displayWithUpdateTime: false,
};

const InstanceContext = createContext<InstanceContextValue | null>(null);

export function InstanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InstanceState>({
    profile: defaultProfile,
    settings: { locale: "en", appearance: "system", memoVisibility: "PRIVATE" },
    isInitialized: false,
    isLoading: true,
  });

  const initialize = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const settings = await settingsService.getSettings();

      setState({
        profile: defaultProfile,
        settings,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to initialize instance:", error);
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
      }));
    }
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      generalSetting: defaultGeneralSetting,
      memoRelatedSetting: defaultMemoRelatedSetting,
      initialize,
      fetchSetting: async () => {},
    }),
    [state, initialize],
  );

  return (
    <InstanceContext.Provider value={value}>
      {children}
    </InstanceContext.Provider>
  );
}

export function useInstance() {
  const context = useContext(InstanceContext);
  if (!context) {
    throw new Error("useInstance must be used within InstanceProvider");
  }
  return context;
}
