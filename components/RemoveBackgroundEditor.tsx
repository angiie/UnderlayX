'use client';

import { useEditor } from '@/hooks/useEditor';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ColorInput } from '@/components/ColorInput';

export function RemoveBackgroundEditor() {
  const { 
    removeBackground, 
    resetBackground, 
    hasTransparentBackground,
    foregroundOutline,
    setForegroundOutlineEnabled,
    setForegroundOutlineWidth,
    setForegroundOutlineColorMode,
    setForegroundOutlineColor
  } = useEditor();

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Remove the background from your image.
      </p>
      <div className="space-y-2">
        <Button
          onClick={removeBackground}
          className="w-full"
          variant={hasTransparentBackground ? "secondary" : "default"}
        >
          {hasTransparentBackground ? 'Background Removed' : 'Remove Background'}
        </Button>
        <Button
          onClick={resetBackground}
          variant="outline"
          className="w-full"
          disabled={!hasTransparentBackground}
        >
          Reset Background
        </Button>
      </div>

      {/* Foreground outline controls */}
      <div className="pt-2 border-t border-gray-200/60 dark:border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Outline</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add an outline around the cutout subject.
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
                  <RadioGroupItem value="theme" id="outline-color-theme" />
                  <label htmlFor="outline-color-theme" className="text-sm">
                    Theme
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="outline-color-custom" />
                  <label htmlFor="outline-color-custom" className="text-sm">
                    Custom
                  </label>
                </div>
              </RadioGroup>

              {foregroundOutline.colorMode === 'custom' && (
                <ColorInput
                  value={foregroundOutline.color}
                  onChange={setForegroundOutlineColor}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
