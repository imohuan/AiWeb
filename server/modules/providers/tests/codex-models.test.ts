import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { CodexProviderModels } from '@/modules/providers/list/codex/codex-models.provider.js';

test('Codex models provider reads model_catalog_json from config.toml', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-model-catalog-'));
  const configPath = path.join(tempRoot, 'config.toml');
  const catalogPath = path.join(tempRoot, 'catalog.json');

  try {
    await fs.writeFile(configPath, `model_catalog_json = ${JSON.stringify(catalogPath)}\nmodel = "slot-1"\n`, 'utf8');
    await fs.writeFile(catalogPath, JSON.stringify({
      models: [
        {
          slug: 'slot-2',
          display_name: 'Slot 2',
          description: 'from custom catalog',
          visibility: 'list',
          supported_in_api: true,
          priority: 2,
        },
        {
          slug: 'slot-1',
          display_name: 'Slot 1',
          description: 'highest priority',
          visibility: 'list',
          supported_in_api: true,
          priority: 1,
          default_reasoning_level: 'medium',
          supported_reasoning_levels: [
            { effort: 'low', description: 'Low effort' },
            { effort: 'medium', description: 'Medium effort' },
          ],
        },
      ],
    }), 'utf8');

    const provider = new CodexProviderModels({
      configPath,
      fallbackCatalogPath: path.join(tempRoot, 'models_cache.json'),
    });

    const models = await provider.getSupportedModels();
    const current = await provider.getCurrentActiveModel();

    assert.equal(models.DEFAULT, 'slot-1');
    assert.deepEqual(models.OPTIONS.map((option) => option.value), ['slot-1', 'slot-2']);
    assert.equal(models.OPTIONS[0]?.label, 'Slot 1');
    assert.equal(models.OPTIONS[0]?.effort?.default, 'medium');
    assert.equal(current.model, 'slot-1');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test('Codex models provider falls back to models_cache.json when config has no catalog path', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-model-cache-'));
  const configPath = path.join(tempRoot, 'config.toml');
  const fallbackCatalogPath = path.join(tempRoot, 'models_cache.json');

  try {
    await fs.writeFile(configPath, 'model = "cache-model"\n', 'utf8');
    await fs.writeFile(fallbackCatalogPath, JSON.stringify({
      models: [
        {
          slug: 'cache-model',
          display_name: 'Cache Model',
          visibility: 'list',
          supported_in_api: true,
          priority: 1,
        },
      ],
    }), 'utf8');

    const provider = new CodexProviderModels({ configPath, fallbackCatalogPath });

    const models = await provider.getSupportedModels();

    assert.equal(models.DEFAULT, 'cache-model');
    assert.deepEqual(models.OPTIONS.map((option) => option.value), ['cache-model']);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
