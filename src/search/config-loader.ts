import { ConversationPersona, sanitizePronoun } from '../session/persona.js';
import { LoadedSearchSettings, SearchScoringWeights } from './types.js';

export interface SupabaseFromLike {
  from(table: string): {
    select(columns: string): PromiseLike<{
      data: unknown;
      error: unknown;
    }>;
  };
}

const WEIGHT_KEYS: Array<keyof SearchScoringWeights> = [
  'keyword',
  'unigram',
  'bigram',
  'citationArticleBonus',
  'citationDocBonus',
];

function parseSearchWeights(raw: unknown): Partial<SearchScoringWeights> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const parsed: Partial<SearchScoringWeights> = {};

  for (const key of WEIGHT_KEYS) {
    const val = record[key];
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      parsed[key] = val;
    }
  }
  return Object.keys(parsed).length > 0 ? parsed : null;
}

function parseStopWords(raw: unknown): Set<string> | null {
  if (!Array.isArray(raw)) return null;
  const normalized = raw
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? new Set(normalized) : null;
}

function parseChatPersona(raw: unknown): Partial<ConversationPersona> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const assistantPronoun = sanitizePronoun(record.assistantPronoun);
  const userPronoun = sanitizePronoun(record.userPronoun);
  if (!assistantPronoun && !userPronoun) return null;
  return { assistantPronoun, userPronoun };
}

/**
 * Nạp cấu hình động của Search Engine từ bảng public.system_configs trên Supabase.
 * Luôn kiểm tra dữ liệu tại trust boundary và fallback an toàn khi offline hoặc sai schema.
 */
export async function loadSearchSettingsFromSupabase(
  supabase?: SupabaseFromLike
): Promise<LoadedSearchSettings> {
  if (!supabase) {
    return { config: {}, loadedKeys: [] };
  }

  try {
    const { data, error } = await supabase.from('system_configs').select('key, value');
    if (error || !Array.isArray(data)) {
      return { config: {}, loadedKeys: [] };
    }

    const config: LoadedSearchSettings['config'] = {};
    let stopWords: Set<string> | undefined;
    let chatPersona: Partial<ConversationPersona> | undefined;
    const loadedKeys: string[] = [];

    for (const rawRow of data) {
      if (!rawRow || typeof rawRow !== 'object') continue;
      const row = rawRow as { key?: unknown; value?: unknown };
      if (typeof row.key !== 'string') continue;

      switch (row.key) {
        case 'stop_words': {
          const parsed = parseStopWords(row.value);
          if (parsed) {
            stopWords = parsed;
            loadedKeys.push('stop_words');
          }
          break;
        }
        case 'search_weights': {
          const parsed = parseSearchWeights(row.value);
          if (parsed) {
            config.weights = parsed;
            loadedKeys.push('search_weights');
          }
          break;
        }
        case 'confidence_threshold': {
          if (typeof row.value === 'number' && Number.isFinite(row.value) && row.value > 0 && row.value <= 1) {
            config.defaultConfidenceThreshold = row.value;
            loadedKeys.push('confidence_threshold');
          }
          break;
        }
        case 'min_query_length': {
          if (typeof row.value === 'number' && Number.isFinite(row.value) && row.value >= 1) {
            config.minQueryLength = Math.trunc(row.value);
            loadedKeys.push('min_query_length');
          }
          break;
        }
        case 'chat_persona': {
          const parsed = parseChatPersona(row.value);
          if (parsed) {
            chatPersona = parsed;
            loadedKeys.push('chat_persona');
          }
          break;
        }
      }
    }

    return { config, stopWords, chatPersona, loadedKeys };
  } catch {
    return { config: {}, loadedKeys: [] };
  }
}
