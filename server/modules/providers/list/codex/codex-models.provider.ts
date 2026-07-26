import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import TOML from '@iarna/toml';

import type { IProviderModels } from '@/shared/interfaces.js';
import type {
  ProviderChangeActiveModelInput,
  ProviderCurrentActiveModel,
  ProviderModelOption,
  ProviderModelsDefinition,
  ProviderSessionActiveModelChange,
} from '@/shared/types.js';
import {
  buildDefaultProviderCurrentActiveModel,
  readObjectRecord,
  readOptionalString,
  writeProviderSessionActiveModelChange,
} from '@/shared/utils.js';

type CodexCachedModel = {
  slug?: string;
  display_name?: string;
  description?: string;
  priority?: number;
  visibility?: string;
  supported_in_api?: boolean;
  default_reasoning_level?: string;
  supported_reasoning_levels?: Array<{
    effort?: string;
    description?: string;
  }>;
};

type CodexProviderModelsOptions = {
  configPath?: string;
  fallbackCatalogPath?: string;
};

const getDefaultConfigPath = (): string => path.join(os.homedir(), '.codex', 'config.toml');
const getDefaultFallbackCatalogPath = (): string => path.join(os.homedir(), '.codex', 'models_cache.json');

const isCodexCachedModel = (value: unknown): value is CodexCachedModel => {
  const record = readObjectRecord(value);
  return Boolean(record && readOptionalString(record.slug));
};

const readCodexPriority = (value: unknown): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
);

const mapCodexModel = (model: CodexCachedModel): ProviderModelOption => {
  const effortValues = Array.isArray(model.supported_reasoning_levels)
    ? model.supported_reasoning_levels
      .map((level) => {
        const value = readOptionalString(level?.effort);
        if (!value) {
          return null;
        }

        return {
          value,
          description: readOptionalString(level?.description),
        };
      })
      .filter((level): level is NonNullable<typeof level> => Boolean(level))
    : [];

  return {
    value: model.slug as string,
    label: readOptionalString(model.display_name) ?? (model.slug as string),
    description: readOptionalString(model.description),
    effort: effortValues.length > 0
      ? {
          default: readOptionalString(model.default_reasoning_level) ?? undefined,
          values: effortValues,
        }
      : undefined,
  };
};

const buildCodexModelsDefinition = (models: CodexCachedModel[]): ProviderModelsDefinition => {
  const sortedModels = [...models]
    .filter((model) => model.visibility === 'list' && model.supported_in_api !== false)
    .sort((left, right) => readCodexPriority(left.priority) - readCodexPriority(right.priority));

  const options: ProviderModelOption[] = [];
  const seenValues = new Set<string>();

  for (const model of sortedModels) {
    const mappedModel = mapCodexModel(model);
    if (seenValues.has(mappedModel.value)) {
      continue;
    }

    seenValues.add(mappedModel.value);
    options.push(mappedModel);
  }

  return {
    OPTIONS: options,
    DEFAULT: options[0]?.value ?? '',
  };
};

/**
 * Read config.toml and resolve the model catalog JSON path.
 * Priority:
 *  1. config.toml → model_catalog_json field
 *  2. fallback to ~/.codex/models_cache.json
 */
const resolveCatalogPath = async (configPath: string, fallbackCatalogPath: string): Promise<string> => {
  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = readObjectRecord(TOML.parse(raw));
    const catalogPath = readOptionalString(parsed?.model_catalog_json);
    if (catalogPath) {
      return catalogPath;
    }
  } catch {
    // config.toml not found or unreadable, fall through
  }

  return fallbackCatalogPath;
};

const loadModelsFromCatalog = async (catalogPath: string): Promise<CodexCachedModel[]> => {
  const raw = await readFile(catalogPath, 'utf8');
  const parsed = readObjectRecord(JSON.parse(raw));
  return Array.isArray(parsed?.models)
    ? parsed.models.filter(isCodexCachedModel)
    : [];
};

export class CodexProviderModels implements IProviderModels {
  private readonly configPath: string;

  private readonly fallbackCatalogPath: string;

  constructor(options: CodexProviderModelsOptions = {}) {
    this.configPath = options.configPath ?? getDefaultConfigPath();
    this.fallbackCatalogPath = options.fallbackCatalogPath ?? getDefaultFallbackCatalogPath();
  }

  async getSupportedModels(): Promise<ProviderModelsDefinition> {
    try {
      const catalogPath = await resolveCatalogPath(this.configPath, this.fallbackCatalogPath);
      const models = await loadModelsFromCatalog(catalogPath);
      return buildCodexModelsDefinition(models);
    } catch {
      return { OPTIONS: [], DEFAULT: '' };
    }
  }

  async getCurrentActiveModel(): Promise<ProviderCurrentActiveModel> {
    try {
      const raw = await readFile(this.configPath, 'utf8');
      const parsed = readObjectRecord(TOML.parse(raw));
      const model = readOptionalString(parsed?.model);
      if (!model) {
        return buildDefaultProviderCurrentActiveModel(await this.getSupportedModels());
      }

      return {
        model,
      };
    } catch {
      return buildDefaultProviderCurrentActiveModel(await this.getSupportedModels());
    }
  }

  async changeActiveModel(
    input: ProviderChangeActiveModelInput,
  ): Promise<ProviderSessionActiveModelChange> {
    return writeProviderSessionActiveModelChange('codex', input);
  }
}
