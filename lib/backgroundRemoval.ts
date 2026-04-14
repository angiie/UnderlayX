import {
  removeBackground as imglyRemoveBackground,
  type Config as ImglyConfig,
  type ImageSource,
} from '@imgly/background-removal';

export type BackgroundRemovalBackend = 'webgpu' | 'cpu';

export interface BackgroundRemovalResult {
  blob: Blob;
  backend: BackgroundRemovalBackend;
}

const IMGly_PUBLIC_PATH = 'https://staticimgly.com/@imgly/background-removal-data/1.5.5/dist/';

/**
 * 检测当前浏览器环境是否具备 WebGPU 能力。
 */
function canUseWebGPU(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { gpu?: unknown };
  return Boolean(nav.gpu) && window.isSecureContext;
}

/**
 * 封装单次抠图调用，方便统一处理配置与错误。
 */
async function runBackgroundRemoval(image: ImageSource, config: ImglyConfig): Promise<Blob> {
  return imglyRemoveBackground(image, config);
}

/**
 * 客户端抠图降级策略：
 * 1) 优先 WebGPU（性能优先）
 * 2) 失败后自动降级到 CPU（稳定优先）
 */
export async function removeBackgroundWithFallback(image: ImageSource): Promise<BackgroundRemovalResult> {
  const webgpuConfig: ImglyConfig = {
    publicPath: IMGly_PUBLIC_PATH,
    device: 'gpu',
    model: 'isnet_fp16',
    proxyToWorker: true,
  };

  const cpuConfig: ImglyConfig = {
    publicPath: IMGly_PUBLIC_PATH,
    device: 'cpu',
    model: 'isnet_quint8',
    proxyToWorker: true,
  };

  if (canUseWebGPU()) {
    try {
      const blob = await runBackgroundRemoval(image, webgpuConfig);
      return { blob, backend: 'webgpu' };
    } catch (error) {
      console.warn('[background-removal] WebGPU failed, fallback to CPU.', error);
    }
  }

  const blob = await runBackgroundRemoval(image, cpuConfig);
  return { blob, backend: 'cpu' };
}
