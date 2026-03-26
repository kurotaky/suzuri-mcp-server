import { describe, it, expect } from 'vitest';
import { findPreset, getPresetsForCategory, resolvePlacementParams, PLACEMENT_PRESETS } from '../presets.js';

describe('presets', () => {
  it('findPreset が名前でプリセットを返す', () => {
    const preset = findPreset('center');
    expect(preset).toBeDefined();
    expect(preset!.label).toBe('中央配置');
    expect(preset!.scale).toBe(1.0);
  });

  it('findPreset が存在しない名前でundefinedを返す', () => {
    expect(findPreset('nonexistent')).toBeUndefined();
  });

  it('getPresetsForCategory がカテゴリでフィルタする', () => {
    const mugPresets = getPresetsForCategory('mug');
    expect(mugPresets.length).toBeGreaterThan(0);
    for (const preset of mugPresets) {
      expect(preset.recommendedFor).toContain('mug');
    }
  });

  it('getPresetsForCategory が未指定時に全プリセットを返す', () => {
    expect(getPresetsForCategory()).toEqual(PLACEMENT_PRESETS);
    expect(getPresetsForCategory('all')).toEqual(PLACEMENT_PRESETS);
  });

  it('resolvePlacementParams がプリセット名から値を解決する', () => {
    const params = resolvePlacementParams({ presetName: 'left_chest' });
    expect(params).toEqual({ scale: 0.3, offsetX: -0.25, offsetY: -0.2 });
  });

  it('resolvePlacementParams が直接指定値を優先する', () => {
    const params = resolvePlacementParams({ presetName: 'center', scale: 2.0 });
    expect(params).toEqual({ scale: 2.0, offsetX: 0.0, offsetY: 0.0 });
  });

  it('resolvePlacementParams がデフォルト値を返す', () => {
    const params = resolvePlacementParams({});
    expect(params).toEqual({ scale: 1.0, offsetX: 0.0, offsetY: 0.0 });
  });
});
