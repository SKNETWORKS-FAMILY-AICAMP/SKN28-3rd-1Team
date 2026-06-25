import { z } from "zod"

import type { ChatWorkspaceRemoteCommand } from "@/ui/components/chat/workspace_root/workspace-state"

const workspaceProfileFieldSchema = z.object({
  id: z.enum(["birthYear", "residence", "subject", "goal", "stage", "conditions"]),
  kind: z.enum(["year", "text", "select", "textarea"]),
  label: z.string(),
  value: z.string(),
  placeholder: z.string(),
  options: z.array(z.string()).optional(),
  span: z.enum(["single", "wide", "full"]).optional(),
})

const workspaceInstitutionTierSchema = z.union([z.literal(0), z.literal(1), z.literal(2)])

const workspaceCoordinateSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

const workspaceMapLandmarkSchema = z.object({
  coordinate: workspaceCoordinateSchema.optional(),
  id: z.string(),
  label: z.string(),
  x: z.number(),
  y: z.number(),
})

const workspaceMapLegendItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  tier: workspaceInstitutionTierSchema,
})

const workspaceMapSnapshotSchema = z.object({
  center: workspaceCoordinateSchema.optional(),
  landmarks: z.array(workspaceMapLandmarkSchema),
  legend: z.array(workspaceMapLegendItemSchema).optional(),
  zoom: z.number().optional(),
})

const workspaceInstitutionSchema = z.object({
  coordinate: workspaceCoordinateSchema.optional(),
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  tier: workspaceInstitutionTierSchema,
  badges: z.array(z.string()),
  phone: z.string(),
  address: z.string(),
  hours: z.string(),
  business: z.string(),
  apply: z.string(),
  docs: z.string(),
  distanceLabel: z.string(),
})

const workspaceEvidenceDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  category: z.string(),
  page: z.string(),
  updated: z.string().optional(),
  match: z.number(),
  tags: z.array(z.string()),
  summary: z.string(),
  highlights: z.array(z.string()),
  citation: z.string(),
  excerpt: z.string(),
})

const workspaceChecklistStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  status: z.enum(["ready", "todo", "warning", "done"]),
})

const workspaceChecklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  status: z.enum(["ready", "todo", "warning", "done"]),
  required: z.boolean(),
  meta: z.string().optional(),
  defaultExpanded: z.boolean().optional(),
  steps: z.array(workspaceChecklistStepSchema).optional(),
})

const defaultSurfaceSchema = z.object({
  type: z.literal("default"),
  title: z.string(),
  description: z.string(),
  statusLabel: z.string().optional(),
})

const profileIntakeSurfaceSchema = z.object({
  type: z.literal("profile-intake"),
  title: z.string(),
  description: z.string(),
  fields: z.array(workspaceProfileFieldSchema),
  suggestedQuestions: z.array(z.string()),
  primaryActionLabel: z.string(),
})

const institutionResultsSurfaceSchema = z.object({
  type: z.literal("institution-results"),
  title: z.string(),
  description: z.string(),
  copy: z.object({
    headerBadge: z.string(),
    mapTitle: z.string(),
    mapDescription: z.string(),
    mapBadge: z.string(),
    listTitle: z.string(),
    listDescription: z.string(),
    countSuffix: z.string(),
    contactActionLabel: z.string(),
    directionsActionLabel: z.string(),
  }),
  view: z.enum(["map", "list", "detail"]),
  selectedInstitutionId: z.string(),
  map: workspaceMapSnapshotSchema,
  institutions: z.array(workspaceInstitutionSchema),
})

const evidenceDocumentsSurfaceSchema = z.object({
  type: z.literal("evidence-documents"),
  title: z.string(),
  description: z.string(),
  copy: z.object({
    headerBadge: z.string(),
    bundleTitle: z.string(),
    bundleDescription: z.string(),
    summaryTitle: z.string(),
    citationTitle: z.string(),
    excerptTitle: z.string(),
    highlightsTitle: z.string(),
    relevanceLabel: z.string(),
  }),
  view: z.enum(["list", "detail"]),
  selectedDocumentId: z.string(),
  documents: z.array(workspaceEvidenceDocumentSchema),
})

const actionChecklistSurfaceSchema = z.object({
  type: z.literal("action-checklist"),
  title: z.string(),
  description: z.string(),
  items: z.array(workspaceChecklistItemSchema),
  nextActionTitle: z.string(),
  nextActionDescription: z.string(),
  nextActionLabel: z.string(),
})

const accessSummarySurfaceSchema = z.object({
  type: z.literal("access-summary"),
  title: z.string(),
  description: z.string(),
  copy: z.object({
    headerBadge: z.string(),
    visitNotesTitle: z.string(),
    callActionLabel: z.string(),
    directionsActionLabel: z.string(),
  }),
  map: workspaceMapSnapshotSchema,
  institution: workspaceInstitutionSchema,
  travel: z.object({
    modeLabel: z.string(),
    durationLabel: z.string(),
    distanceLabel: z.string(),
    summary: z.string(),
  }),
  visitNotes: z.array(z.string()),
})

const remoteSurfaceSchema = z.discriminatedUnion("type", [
  defaultSurfaceSchema,
  profileIntakeSurfaceSchema,
  institutionResultsSurfaceSchema,
  evidenceDocumentsSurfaceSchema,
  actionChecklistSurfaceSchema,
  accessSummarySurfaceSchema,
])

export const workspaceCommandDataSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("workspace.showDefault"),
    title: z.string().optional(),
    description: z.string().optional(),
    statusLabel: z.string().optional(),
  }),
  z.object({
    type: z.literal("workspace.showSurface"),
    surface: remoteSurfaceSchema,
  }),
]) as z.ZodType<ChatWorkspaceRemoteCommand>
