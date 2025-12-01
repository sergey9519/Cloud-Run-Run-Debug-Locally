
export type KnowledgeSourceType = 'url' | 'file' | 'text' | 'youtube' | 'wiki';

export interface KnowledgeSourceEntity {
  id: string;
  type: KnowledgeSourceType;
  title: string;
  url?: string;
  assetId?: string;
  originalContent: string;
  summary?: string;
  status: 'processing' | 'indexed' | 'error';
  createdAt: Date;
}
