
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Freelancer, Project, Assignment, Script, AuthResult, ApiResponse, QueryParams, MoodboardItem, Asset, KnowledgeSource } from '../types';

const appId = 'studio-roster-v1';

// --- HELPERS ---

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface GenerateContentParams {
    model: string;
    [key: string]: any;
}

export const generateContentWithRetry = async (ai: GoogleGenerativeAI, params: GenerateContentParams, retries = 3): Promise<any> => {
    try {
        const model = ai.getGenerativeModel({ model: params.model });
        const response = await model.generateContent(params);
        return response;
    } catch (e) {
        if (retries > 0) {
            await delay(1000);
            return generateContentWithRetry(ai, params, retries - 1);
        }
        throw e;
    }
};

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  modifiedTime: string;
  logic: any[];
  synced?: boolean;
}

const STORAGE_PREFIX = 'studio_roster_v1_';

// --- PERSISTENCE LAYER ---

const loadFromStorage = <T>(key: string, defaultData: T): T => {
    try {
        const stored = localStorage.getItem(STORAGE_PREFIX + key);
        return stored ? JSON.parse(stored) : defaultData;
    } catch (e) {
        console.error(`Failed to load ${key}`, e);
        return defaultData;
    }
};

const saveToStorage = (key: string, data: any) => {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    } catch (e) {
        console.error(`Failed to save ${key}`, e);
    }
};

// Initialize State from Storage or Empty (Strict No-Mock Policy)
let localFreelancers: Freelancer[] = loadFromStorage('freelancers', []);
let localProjects: Project[] = loadFromStorage('projects', []);
let localAssignments: Assignment[] = loadFromStorage('assignments', []);
let localScripts: Script[] = loadFromStorage('scripts', []);
let localAssets: Asset[] = loadFromStorage('assets', []);

// --- BACKEND INTEGRATION ---

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 15000) => {
    const controller = new AbortController();
    const { signal } = controller;
    
    const fetchPromise = fetch(url, { ...options, signal });
    
    const timeoutPromise = new Promise<Response>((_, reject) => {
        const id = setTimeout(() => {
            controller.abort();
            reject(new Error('Request timed out'));
        }, timeout);
    });

    return Promise.race([fetchPromise, timeoutPromise]);
};

// Allow custom timeout in options
async function fetchApi<T>(url: string, options?: RequestInit & { timeout?: number }): Promise<ApiResponse<T>> {
    try {
        // Prevent browser caching of API responses to ensure we get fresh data from server
        const headers = {
            ...(options?.headers || {}),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
        };

        const timeout = options?.timeout || 30000; // Default 30s
        const res = await fetchWithTimeout(url, { ...options, headers }, timeout);
        
        // Security: Handle Unauthorized Access
        if (res.status === 401) {
            console.warn('Session expired or unauthorized. Redirecting...');
            // Optional: Dispatch a global event or clear storage
            // window.location.href = '/login'; // Or handle via React State in App.tsx
            throw new Error('Unauthorized');
        }

        // Check for Proxy Errors (Vite returning index.html instead of API response)
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            throw new Error('Backend unavailable (Received HTML fallback)');
        }

        if (res.status === 404) {
             throw new Error(`Endpoint not found: ${url}`);
        }
        
        if (res.status === 502 || res.status === 503 || res.status === 504) {
             throw new Error('Backend unavailable (Gateway Error)');
        }

        let body: any = null;
        try {
            body = await res.json();
        } catch (e) {
            if (res.ok && res.status === 204) return { success: true } as any;
            if (res.ok) return { success: true, data: {} as any };
            throw new Error('Invalid JSON response');
        }

        if (!res.ok) {
            const errorObj = body?.error;
            const message = errorObj?.message || res.statusText || 'Unknown Error';
            throw new Error(message);
        }

        if (body.data === undefined && (Array.isArray(body) || body.id || body.email || body.name || body.bucket || body.translatedText)) {
             return { data: body as T, success: true };
        }

        return body as ApiResponse<T>;
    } catch (e: any) {
        throw e; 
    }
}

const uploadToBackend = async (file: File, projectId?: string): Promise<Asset> => {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) formData.append('projectId', projectId);

    // Set 10 minute timeout for uploads to prevent "Request timed out" on large files
    const res = await fetchApi<Asset>('/api/assets/upload', {
        method: 'POST',
        body: formData,
        timeout: 600000 
    });
    
    const asset = res.data!;
    
    if (!asset.url && !asset.publicUrl) {
        try {
            const urlRes = await fetchApi<{url: string}>(`/api/assets/${asset.id}/url`);
            asset.url = urlRes.data?.url;
        } catch (e) {
            console.warn("Could not sign URL for asset", asset.id);
        }
    } else if (asset.publicUrl) {
        asset.url = asset.publicUrl;
    }
    
    return asset;
};

export const api = {
  auth: {
    login: async (contactInfo: string): Promise<ApiResponse<AuthResult>> => {
      return await fetchApi<AuthResult>('/api/auth/login', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ contactInfo })
      });
    }
  },

  translation: {
      translate: async (text: string, target: string): Promise<ApiResponse<{ translatedText: string }>> => {
          return await fetchApi<{ translatedText: string }>('/api/translation', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ text, target })
          });
      }
  },

  assets: {
      list: async (): Promise<ApiResponse<Asset[]>> => {
          try {
              const res = await fetchApi<Asset[]>('/api/assets');
              // Implicit Cache
              localAssets = res.data || [];
              saveToStorage('assets', localAssets);
              return res;
          } catch (e) {
              console.error("Assets API Error:", e); // Log specific error for debugging
              return { data: localAssets, success: true, message: 'Offline Mode (Cached)' };
          }
      },
      upload: async (file: File, projectId?: string): Promise<ApiResponse<Asset>> => {
          // STRICT MODE: No mock fallback for uploads.
          // If backend/storage is down, the upload MUST fail.
          try {
              const asset = await uploadToBackend(file, projectId);
              // Optimistic update
              localAssets = [asset, ...localAssets];
              saveToStorage('assets', localAssets);
              return { data: asset, success: true };
          } catch (e: any) {
              console.error("Upload failed:", e);
              const message = e.message || 'Upload failed due to network or server error';
              throw new Error(`Upload failed: ${message}`);
          }
      },
      delete: async (id: string): Promise<ApiResponse<boolean>> => {
          try {
              await fetchApi<any>(`/api/assets/${id}`, { method: 'DELETE' });
          } catch(e) {
              console.warn("Delete failed online, removing locally");
          }
          localAssets = localAssets.filter(a => a.id !== id);
          saveToStorage('assets', localAssets);
          return { data: true, success: true };
      }
  },

  storage: {
      getInfo: async (): Promise<ApiResponse<{ bucket: string; configured: boolean; projectId: string }>> => {
          try {
              return await fetchApi<{ bucket: string; configured: boolean; projectId: string }>('/api/storage/info');
          } catch (e) {
              return { data: { bucket: 'Unknown', configured: false, projectId: '' }, success: false };
          }
      }
  },

  freelancers: {
    list: async (params?: QueryParams): Promise<ApiResponse<Freelancer[]>> => {
      try {
          const res = await fetchApi<Freelancer[]>('/api/freelancers');
          // Implicit Cache
          localFreelancers = res.data || [];
          saveToStorage('freelancers', localFreelancers);
          return res;
      } catch (e) {
          return { data: localFreelancers, success: true, message: 'Offline Mode (Cached)' };
      }
    },
    create: async (f: Freelancer) => {
        try {
            const res = await fetchApi<Freelancer>('/api/freelancers', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(f) });
            localFreelancers = [...localFreelancers, res.data];
            saveToStorage('freelancers', localFreelancers);
            return res;
        } catch (e) {
            localFreelancers.push(f);
            saveToStorage('freelancers', localFreelancers);
            return { data: f, success: true };
        }
    },
    update: async (f: Freelancer) => {
        try {
            const res = await fetchApi<Freelancer>(`/api/freelancers/${f.id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(f) });
            localFreelancers = localFreelancers.map(lf => lf.id === f.id ? res.data : lf);
            saveToStorage('freelancers', localFreelancers);
            return res;
        } catch (e) {
            localFreelancers = localFreelancers.map(lf => lf.id === f.id ? f : lf);
            saveToStorage('freelancers', localFreelancers);
            return { data: f, success: true };
        }
    },
    delete: async (id: string) => {
        try {
            await fetchApi(`/api/freelancers/${id}`, { method: 'DELETE' });
        } catch(e) {console.error(e)}
        localFreelancers = localFreelancers.filter(f => f.id !== id);
        saveToStorage('freelancers', localFreelancers);
        return { data: true, success: true };
    },
    importBatch: async (items: Freelancer[]) => {
        try {
            const res = await fetchApi<any>('/api/freelancers/batch', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(items) });
            // Re-fetch to sync
            return res;
        } catch (e) {
            return { data: { created: 0, updated: 0, errors: [] }, success: false };
        }
    },
  },
  
  projects: {
      list: async (params?: QueryParams): Promise<ApiResponse<Project[]>> => {
          try {
              const res = await fetchApi<Project[]>('/api/projects');
              localProjects = res.data || [];
              saveToStorage('projects', localProjects);
              return res;
          } catch(e) {
              return { data: localProjects, success: true, message: 'Offline Mode (Cached)' };
          }
      },
      create: async (p: Project) => {
          try {
              const res = await fetchApi<Project>('/api/projects', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p) });
              localProjects = [...localProjects, res.data];
              saveToStorage('projects', localProjects);
              return res;
          } catch(e) {
              localProjects.push(p);
              saveToStorage('projects', localProjects);
              return { data: p, success: true };
          }
      },
      update: async (p: Project) => {
          try {
              const res = await fetchApi<Project>(`/api/projects/${p.id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(p) });
              localProjects = localProjects.map(lp => lp.id === p.id ? res.data : lp);
              saveToStorage('projects', localProjects);
              return res;
          } catch(e) {
              localProjects = localProjects.map(lp => lp.id === p.id ? p : lp);
              saveToStorage('projects', localProjects);
              return { data: p, success: true };
          }
      },
      delete: async (id: string) => {
          try { await fetchApi(`/api/projects/${id}`, { method: 'DELETE' }); } catch(e) {console.error(e)}
          localProjects = localProjects.filter(p => p.id !== id);
          saveToStorage('projects', localProjects);
          return { data: true, success: true };
      },
      deleteBatch: async (ids: string[]) => {
          try { await fetchApi('/api/projects/batch-delete', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(ids) }); } catch(e) {console.error(e)}
          localProjects = localProjects.filter(p => !ids.includes(p.id));
          saveToStorage('projects', localProjects);
          return { data: true, success: true };
      },
      importBatch: async (items: Project[]) => {
          try {
              return await fetchApi<any>('/api/projects/batch', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(items) });
          } catch (e) {
              return { data: { created: 0, updated: 0 }, success: false };
          }
      },
  },

  assignments: {
      list: async (params?: QueryParams): Promise<ApiResponse<Assignment[]>> => {
          try { 
              const res = await fetchApi<Assignment[]>('/api/assignments'); 
              localAssignments = res.data || [];
              saveToStorage('assignments', localAssignments);
              return res;
          } catch(e) { 
              return { data: localAssignments, success: true }; 
          }
      },
      create: async (a: Assignment) => {
          try { 
              const res = await fetchApi<Assignment>('/api/assignments', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(a) }); 
              localAssignments = [...localAssignments, res.data];
              saveToStorage('assignments', localAssignments);
              return res;
          } catch(e) { 
              localAssignments.push(a); 
              saveToStorage('assignments', localAssignments);
              return { data: a, success: true }; 
          }
      },
      update: async (a: Assignment) => {
          try { 
              const res = await fetchApi<Assignment>(`/api/assignments/${a.id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(a) }); 
              localAssignments = localAssignments.map(la => la.id === a.id ? res.data : la);
              saveToStorage('assignments', localAssignments);
              return res;
          } catch(e) {
              localAssignments = localAssignments.map(la => la.id === a.id ? a : la);
              saveToStorage('assignments', localAssignments);
              return { data: a, success: true };
          }
      },
  },

  scripts: {
      list: async (params?: any) => {
          try { 
              const res = await fetchApi<Script[]>('/api/scripts'); 
              localScripts = res.data || [];
              saveToStorage('scripts', localScripts);
              return res;
          } catch(e) { return { data: localScripts, success: true }; }
      },
      create: async (s: Script) => {
          try { 
              const res = await fetchApi<Script>('/api/scripts', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(s) }); 
              localScripts = [...localScripts, res.data];
              saveToStorage('scripts', localScripts);
              return res;
          } catch(e) { 
              localScripts.push(s); 
              saveToStorage('scripts', localScripts);
              return { data: s, success: true }; 
          }
      },
      findByProject: async (projectId: string) => {
          try { return await fetchApi<Script[]>(`/api/scripts/project/${projectId}`); } catch(e) { return { data: [], success: true }; }
      },
  },
  
  drive: {
    listTeamAssets: async (): Promise<ApiResponse<DriveFile[]>> => {
        try {
            return await fetchApi<DriveFile[]>('/api/google/drive/team-assets');
        } catch (e) {console.error(e)}
        return { data: [], success: true };
    },
  },

  moodboard: {
    list: async (projectId?: string): Promise<ApiResponse<MoodboardItem[]>> => {
      try {
          if (projectId) {
              return await fetchApi<MoodboardItem[]>(`/api/moodboard/${projectId}`);
          }
      } catch (e) {console.error(e)}
      return { data: [], success: true };
    },
    
    linkAsset: async (projectId: string, assetId: string): Promise<ApiResponse<MoodboardItem>> => {
      return await fetchApi<MoodboardItem>(`/api/moodboard/${projectId}/link-asset`, { 
          method: 'POST', 
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ assetId }) 
      });
    },

    create: async (item: Partial<MoodboardItem>): Promise<ApiResponse<MoodboardItem>> => {
      return await fetchApi<MoodboardItem>(`/api/moodboard/${item.projectId}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(item)
      });
    },

    update: async (item: MoodboardItem): Promise<ApiResponse<MoodboardItem>> => {
       try { return await fetchApi<MoodboardItem>(`/api/moodboard/${item.id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(item) }); } catch(e) { return { data: item, success: true }; }
    },

    delete: async (id: string): Promise<ApiResponse<boolean>> => {
       try { await fetchApi(`/api/moodboard/${id}`, { method: 'DELETE' }); } catch(e) {console.error(e)}
       return { data: true, success: true };
    }
  },

  knowledge: {
      createFromAsset: async (projectId: string, assetId: string, mockAsset?: Asset): Promise<ApiResponse<KnowledgeSource>> => {
          return await fetchApi<KnowledgeSource>('/api/knowledge/create-from-asset', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ projectId, assetId })
          });
      },
      
      delete: async (id: string) => {
          try { await fetchApi(`/api/knowledge/${id}`, { method: 'DELETE' }); } catch(e) {console.error(e)}
          return { data: true, success: true };
      }
  },

  suggestions: {
    get: async () => []
  }
};
