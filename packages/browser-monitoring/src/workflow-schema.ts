import { z } from 'zod';

export const BrowserActionTypeSchema = z.enum([
  'navigate',
  'click',
  'fill',
  'assert',
  'wait',
  'screenshot',
]);
export type BrowserActionType = z.infer<typeof BrowserActionTypeSchema>;

export const BrowserAssertionTypeSchema = z.enum([
  'element_visible',
  'element_hidden',
  'text_contains',
  'url_matches',
  'response_status',
  'no_console_errors',
]);
export type BrowserAssertionType = z.infer<typeof BrowserAssertionTypeSchema>;

export const BrowserAssertionConfigSchema = z.object({
  type: BrowserAssertionTypeSchema,
  selector: z.string().optional(),
  expected: z.string(),
  description: z.string().optional(),
});
export type BrowserAssertionConfig = z.infer<typeof BrowserAssertionConfigSchema>;

export const WorkflowStepSchema = z.object({
  name: z.string().min(1, 'Step name is required'),
  action: BrowserActionTypeSchema,
  selector: z.string().optional(),
  value: z.string().optional(),
  isSecret: z.boolean().default(false),
  timeoutMs: z.number().int().min(500).max(30000).default(5000),
  assertions: z.array(BrowserAssertionConfigSchema).optional(),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const BrowserWorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required').max(120),
  description: z.string().max(500).optional(),
  startUrl: z.string().url('Start URL must be a valid http or https URL').refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'Start URL must be HTTP or HTTPS'
  ),
  viewport: z.object({
    width: z.number().int().min(320).max(3840).default(1280),
    height: z.number().int().min(240).max(2160).default(720),
  }).default({ width: 1280, height: 720 }),
  allowedDomains: z.array(z.string()).optional(),
  variables: z.record(z.string()).default({}),
  steps: z.array(WorkflowStepSchema).min(1, 'Workflow must contain at least 1 step'),
});
export type BrowserWorkflowDefinition = z.infer<typeof BrowserWorkflowSchema>;

export const BrowserMonitorCreateSchema = z.object({
  siteId: z.string().uuid('Invalid site UUID'),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  intervalSeconds: z.number().int().min(60).max(86400).default(3600),
  timeoutMs: z.number().int().min(5000).max(120000).default(30000),
  failureThreshold: z.number().int().min(1).max(5).default(2),
  recoveryThreshold: z.number().int().min(1).max(5).default(2),
  enabled: z.boolean().default(true),
  workflow: BrowserWorkflowSchema,
});
export type BrowserMonitorCreate = z.infer<typeof BrowserMonitorCreateSchema>;
