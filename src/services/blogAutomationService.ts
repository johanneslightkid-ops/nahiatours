import { apiPost } from './apiClient';
import type { BlogAutomationConfig } from '../../shared/blogAutomation';

interface AutomationResponse {
  ok: boolean;
  config?: BlogAutomationConfig;
  error?: string;
}

const request = async (body: Record<string, unknown>): Promise<BlogAutomationConfig> => {
  const response = await apiPost<AutomationResponse>('blog-automation', body);
  if (!response.ok || !response.config) {
    throw new Error(response.error || 'No se pudo leer la configuración de generación automática.');
  }
  return response.config;
};

export const loadBlogAutomation = (): Promise<BlogAutomationConfig> =>
  request({ action: 'load' });

export const saveBlogAutomation = (
  config: Pick<BlogAutomationConfig, 'enabled' | 'intervalHours'>
): Promise<BlogAutomationConfig> =>
  request({ action: 'save', ...config });
