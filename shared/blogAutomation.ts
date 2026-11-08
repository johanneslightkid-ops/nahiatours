export type BlogAutomationInterval = 6 | 12 | 24;
export type BlogAutomationStatus = 'never' | 'running' | 'success' | 'failed';

export interface BlogAutomationConfig {
  enabled: boolean;
  intervalHours: BlogAutomationInterval;
  lastStatus: BlogAutomationStatus;
  lastRunStartedAt: string | null;
  lastRunAt: string | null;
  lastError: string;
  lastArticleTitle: string;
  lastTourTitle: string;
  lastProvider: string;
  lastModel: string;
  runCount: number;
}

export const DEFAULT_BLOG_AUTOMATION_CONFIG: BlogAutomationConfig = {
  enabled: false,
  intervalHours: 6,
  lastStatus: 'never',
  lastRunStartedAt: null,
  lastRunAt: null,
  lastError: '',
  lastArticleTitle: '',
  lastTourTitle: '',
  lastProvider: '',
  lastModel: '',
  runCount: 0,
};

export const normalizeBlogAutomationConfig = (value: unknown): BlogAutomationConfig => {
  const record =
    value && typeof value === 'object'
      ? (value as Partial<BlogAutomationConfig>)
      : {};
  const intervalHours =
    record.intervalHours === 12 || record.intervalHours === 24 ? record.intervalHours : 6;
  const lastStatus =
    record.lastStatus === 'running' ||
    record.lastStatus === 'success' ||
    record.lastStatus === 'failed'
      ? record.lastStatus
      : 'never';

  return {
    ...DEFAULT_BLOG_AUTOMATION_CONFIG,
    enabled: record.enabled === true,
    intervalHours,
    lastStatus,
    lastRunStartedAt: typeof record.lastRunStartedAt === 'string' ? record.lastRunStartedAt : null,
    lastRunAt: typeof record.lastRunAt === 'string' ? record.lastRunAt : null,
    lastError: typeof record.lastError === 'string' ? record.lastError : '',
    lastArticleTitle: typeof record.lastArticleTitle === 'string' ? record.lastArticleTitle : '',
    lastTourTitle: typeof record.lastTourTitle === 'string' ? record.lastTourTitle : '',
    lastProvider: typeof record.lastProvider === 'string' ? record.lastProvider : '',
    lastModel: typeof record.lastModel === 'string' ? record.lastModel : '',
    runCount: Number.isSafeInteger(record.runCount) && Number(record.runCount) > 0
      ? Number(record.runCount)
      : 0,
  };
};
