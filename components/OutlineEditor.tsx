'use client';

import { useEditor } from '@/hooks/useEditor';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ColorInput } from '@/components/ColorInput';

/**
 * 主体描边（outline）配置面板
 * - 支持开关
 * - 支持线宽调整
 * - 默认跟随主题色（primary），也可切换为自定义颜色
 */
export function OutlineEditor() {
  const {
    image,
    foregroundOutline,
    setForegroundOutlineEnabled,
    setForegroundOutlineWidth,
    setForegroundOutlineColorMode,
    setForegroundOutlineColor,
  } = useEditor();

  if (!image.foreground) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please upload an image first to use the outline feature.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Add an outline around the cutout subject.
      </p>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Enable Outline</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Outline is drawn behind the subject.
          </p>
        </div>
        <Switch
          checked={foregroundOutline.enabled}
          onCheckedChange={(checked) => setForegroundOutlineEnabled(!!checked)}
        />
      </div>

      {foregroundOutline.enabled && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Thickness</label>
            <Slider
              value={[foregroundOutline.width]}
              onValueChange={([v]) => setForegroundOutlineWidth(v)}
              min={1}
              max={30}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <RadioGroup
              value={foregroundOutline.colorMode}
              onValueChange={(v) => setForegroundOutlineColorMode(v as 'theme' | 'custom')}
              className="flex items-center gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="theme" id="outline-editor-color-theme" />
                <label htmlFor="outline-editor-color-theme" className="text-sm">
                  Theme
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom" id="outline-editor-color-custom" />
                <label htmlFor="outline-editor-color-custom" className="text-sm">
                  Custom
                </label>
              </div>
            </RadioGroup>

            {foregroundOutline.colorMode === 'custom' && (
              <ColorInput value={foregroundOutline.color} onChange={setForegroundOutlineColor} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

