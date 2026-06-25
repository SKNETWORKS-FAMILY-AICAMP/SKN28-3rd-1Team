import type { MascotAnimationName } from "@/ui/components/mascot/mascot-animation-data";

export type ChatWorkspaceMascotState = {
  animation: MascotAnimationName;
  animationControl: "auto" | "manual";
  renderer: "sprite";
};

export type WorkspaceBadgeTone =
  | "primary"
  | "success"
  | "info"
  | "purple"
  | "neutral"
  | "warning";

export type ChatWorkspaceDefaultSurface = {
  type: "default";
  mascot: ChatWorkspaceMascotState;
  title: string;
  description: string;
  statusLabel?: string;
};

export type WorkspaceProfileField = {
  id:
    | "birthYear"
    | "residence"
    | "subject"
    | "goal"
    | "stage"
    | "conditions";
  kind: "year" | "text" | "select" | "textarea";
  label: string;
  value: string;
  placeholder: string;
  options?: string[];
  span?: "single" | "wide" | "full";
};

export type ChatWorkspaceProfileIntakeSurface = {
  type: "profile-intake";
  mascot: ChatWorkspaceMascotState;
  title: string;
  description: string;
  fields: WorkspaceProfileField[];
  suggestedQuestions: string[];
  primaryActionLabel: string;
};

export type WorkspaceInstitutionTier = 0 | 1 | 2;

export type WorkspaceCoordinate = {
  lat: number;
  lng: number;
};

export type WorkspaceMapLandmark = {
  coordinate?: WorkspaceCoordinate;
  id: string;
  label: string;
  x: number;
  y: number;
};

export type WorkspaceMapLegendItem = {
  id: string;
  label: string;
  tier: WorkspaceInstitutionTier;
};

export type WorkspaceMapSnapshot = {
  center?: WorkspaceCoordinate;
  landmarks: WorkspaceMapLandmark[];
  legend?: WorkspaceMapLegendItem[];
  zoom?: number;
};

export type WorkspaceInstitution = {
  coordinate?: WorkspaceCoordinate;
  id: string;
  name: string;
  x: number;
  y: number;
  tier: WorkspaceInstitutionTier;
  badges: string[];
  phone: string;
  address: string;
  hours: string;
  business: string;
  apply: string;
  docs: string;
  distanceLabel: string;
};

export type ChatWorkspaceInstitutionResultsSurface = {
  type: "institution-results";
  title: string;
  description: string;
  copy: {
    headerBadge: string;
    mapTitle: string;
    mapDescription: string;
    mapBadge: string;
    listTitle: string;
    listDescription: string;
    countSuffix: string;
    contactActionLabel: string;
    directionsActionLabel: string;
  };
  view: "map" | "list" | "detail";
  selectedInstitutionId: string;
  map: WorkspaceMapSnapshot;
  institutions: WorkspaceInstitution[];
};

export type WorkspaceEvidenceDocument = {
  id: string;
  title: string;
  source: string;
  category: string;
  page: string;
  updated?: string;
  match: number;
  tags: string[];
  summary: string;
  highlights: string[];
  citation: string;
  excerpt: string;
};

export type ChatWorkspaceEvidenceDocumentsSurface = {
  type: "evidence-documents";
  title: string;
  description: string;
  copy: {
    headerBadge: string;
    bundleTitle: string;
    bundleDescription: string;
    summaryTitle: string;
    citationTitle: string;
    excerptTitle: string;
    highlightsTitle: string;
    relevanceLabel: string;
  };
  view: "list" | "detail";
  selectedDocumentId: string;
  documents: WorkspaceEvidenceDocument[];
};

export type WorkspaceChecklistItem = {
  id: string;
  title: string;
  detail: string;
  status: "ready" | "todo" | "warning" | "done";
  required: boolean;
  meta?: string;
  defaultExpanded?: boolean;
  steps?: Array<{
    id: string;
    title: string;
    detail: string;
    status: "ready" | "todo" | "warning" | "done";
  }>;
};

export type ChatWorkspaceActionChecklistSurface = {
  type: "action-checklist";
  title: string;
  description: string;
  items: WorkspaceChecklistItem[];
  nextActionTitle: string;
  nextActionDescription: string;
  nextActionLabel: string;
};

export type WorkspaceAccessTravel = {
  modeLabel: string;
  durationLabel: string;
  distanceLabel: string;
  summary: string;
};

export type ChatWorkspaceAccessSummarySurface = {
  type: "access-summary";
  title: string;
  description: string;
  copy: {
    headerBadge: string;
    visitNotesTitle: string;
    callActionLabel: string;
    directionsActionLabel: string;
  };
  map: WorkspaceMapSnapshot;
  institution: WorkspaceInstitution;
  travel: WorkspaceAccessTravel;
  visitNotes: string[];
};

export type ChatWorkspaceSurface =
  | ChatWorkspaceDefaultSurface
  | ChatWorkspaceProfileIntakeSurface
  | ChatWorkspaceInstitutionResultsSurface
  | ChatWorkspaceEvidenceDocumentsSurface
  | ChatWorkspaceActionChecklistSurface
  | ChatWorkspaceAccessSummarySurface;

export type ChatWorkspaceState = {
  surface: ChatWorkspaceSurface;
};

export type ChatWorkspaceRemoteDefaultSurface = Omit<
  ChatWorkspaceDefaultSurface,
  "mascot"
>;

export type ChatWorkspaceRemoteProfileIntakeSurface = Omit<
  ChatWorkspaceProfileIntakeSurface,
  "mascot"
>;

export type ChatWorkspaceRemoteSurface =
  | ChatWorkspaceRemoteDefaultSurface
  | ChatWorkspaceRemoteProfileIntakeSurface
  | ChatWorkspaceInstitutionResultsSurface
  | ChatWorkspaceEvidenceDocumentsSurface
  | ChatWorkspaceActionChecklistSurface
  | ChatWorkspaceAccessSummarySurface;

export type ChatWorkspaceCommand =
  | {
      type: "workspace.showDefault";
      mascot?: Partial<ChatWorkspaceMascotState>;
      title?: string;
      description?: string;
      statusLabel?: string;
    }
  | {
      type: "workspace.showSurface";
      surface: ChatWorkspaceSurface;
    }
  | {
      type: "workspace.setMascotAnimation";
      animation: MascotAnimationName;
      animationControl?: ChatWorkspaceMascotState["animationControl"];
    }
  | {
      type: "workspace.useAutoMascot";
    };

export type ChatWorkspaceRemoteCommand =
  | {
      type: "workspace.showDefault";
      title?: string;
      description?: string;
      statusLabel?: string;
    }
  | {
      type: "workspace.showSurface";
      surface: ChatWorkspaceRemoteSurface;
    };

export type ChatWorkspaceSnapshot = {
  surface: {
    type: ChatWorkspaceSurface["type"];
    title?: string;
    description?: string;
    statusLabel?: string;
    view?: string;
    selectedInstitutionId?: string;
    selectedDocumentId?: string;
    institutionCount?: number;
    documentCount?: number;
    checklistItemCount?: number;
    requiredChecklistItemCount?: number;
    doneChecklistItemCount?: number;
    fieldCount?: number;
    filledFieldCount?: number;
  };
};

export function createDefaultChatWorkspaceState(): ChatWorkspaceState {
  return {
    surface: {
      type: "default",
      mascot: createDefaultMascotState(),
      title: "안녕하세요, 로디에요",
      description: "궁금한 점을 편하게 물어보세요.",
      statusLabel: "상담 대기 중",
    },
  };
}

export function selectChatWorkspaceSnapshot(
  state: ChatWorkspaceState
): ChatWorkspaceSnapshot {
  const { surface } = state;

  switch (surface.type) {
    case "default":
      return {
        surface: {
          type: surface.type,
          title: surface.title,
          description: surface.description,
          statusLabel: surface.statusLabel,
        },
      };
    case "profile-intake": {
      const filledFieldCount = surface.fields.filter((field) =>
        field.value.trim()
      ).length;

      return {
        surface: {
          type: surface.type,
          title: surface.title,
          description: surface.description,
          fieldCount: surface.fields.length,
          filledFieldCount,
        },
      };
    }
    case "institution-results":
      return {
        surface: {
          type: surface.type,
          title: surface.title,
          description: surface.description,
          view: surface.view,
          selectedInstitutionId: surface.selectedInstitutionId,
          institutionCount: surface.institutions.length,
        },
      };
    case "evidence-documents":
      return {
        surface: {
          type: surface.type,
          title: surface.title,
          description: surface.description,
          view: surface.view,
          selectedDocumentId: surface.selectedDocumentId,
          documentCount: surface.documents.length,
        },
      };
    case "action-checklist":
      return {
        surface: {
          type: surface.type,
          title: surface.title,
          description: surface.description,
          checklistItemCount: surface.items.length,
          requiredChecklistItemCount: surface.items.filter(
            (item) => item.required
          ).length,
          doneChecklistItemCount: surface.items.filter(
            (item) => item.status === "done"
          ).length,
        },
      };
    case "access-summary":
      return {
        surface: {
          type: surface.type,
          title: surface.title,
          description: surface.description,
          selectedInstitutionId: surface.institution.id,
        },
      };
    default:
      return assertNever(surface);
  }
}

export function normalizeChatWorkspaceCommand(
  command: ChatWorkspaceRemoteCommand
): ChatWorkspaceCommand {
  if (command.type === "workspace.showDefault") {
    return command;
  }

  const { surface } = command;
  if (surface.type === "default") {
    return {
      type: "workspace.showDefault",
      title: surface.title,
      description: surface.description,
      statusLabel: surface.statusLabel,
    };
  }

  if (surface.type === "profile-intake") {
    return {
      type: "workspace.showSurface",
      surface: {
        ...surface,
        mascot: createDefaultMascotState(),
      },
    };
  }

  return {
    type: "workspace.showSurface",
    surface,
  };
}

export function reduceChatWorkspaceState(
  state: ChatWorkspaceState,
  command: ChatWorkspaceCommand
): ChatWorkspaceState {
  switch (command.type) {
    case "workspace.showDefault":
      return {
        surface: {
          type: "default",
          mascot: {
            ...createDefaultMascotState(),
            ...command.mascot,
          },
          title: command.title ?? "안녕하세요, 로디에요",
          description: command.description ?? "궁금한 점을 편하게 물어보세요.",
          statusLabel: command.statusLabel ?? "상담 대기 중",
        },
      };
    case "workspace.showSurface":
      return {
        surface: command.surface,
      };
    case "workspace.setMascotAnimation":
      return updateMascotSurface(state, {
        animation: command.animation,
        animationControl: command.animationControl ?? "manual",
      });
    case "workspace.useAutoMascot":
      return updateMascotSurface(state, {
        animationControl: "auto",
      });
    default:
      return assertNever(command);
  }
}

export function resolveChatWorkspaceState(
  state: ChatWorkspaceState,
  runtimeMascotAnimation: MascotAnimationName
): ChatWorkspaceState {
  if (
    !hasWorkspaceMascot(state.surface) ||
    state.surface.mascot.animationControl !== "auto"
  ) {
    return state;
  }

  return updateMascotSurface(state, {
    animation: runtimeMascotAnimation,
  });
}

function createDefaultMascotState(): ChatWorkspaceMascotState {
  return {
    animation: "idle",
    animationControl: "auto",
    renderer: "sprite",
  };
}

function hasWorkspaceMascot(
  surface: ChatWorkspaceSurface
): surface is ChatWorkspaceDefaultSurface | ChatWorkspaceProfileIntakeSurface {
  return "mascot" in surface;
}

function updateMascotSurface(
  state: ChatWorkspaceState,
  mascot: Partial<ChatWorkspaceMascotState>
): ChatWorkspaceState {
  if (!hasWorkspaceMascot(state.surface)) return state;

  return {
    surface: {
      ...state.surface,
      mascot: {
        ...state.surface.mascot,
        ...mascot,
      },
    },
  };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled chat workspace command: ${String(value)}`);
}
