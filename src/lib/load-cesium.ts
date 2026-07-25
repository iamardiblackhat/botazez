/**
 * Load CesiumJS from the static build at /cesium.
 *
 * Cesium is deliberately NOT imported through the bundler. Its shipped
 * bundle contains octal escape sequences which throw
 * "Octal escape sequences are not allowed in template strings" once
 * webpack reprocesses it as a module, and its Workers expect to be
 * fetched from a real URL. Loading the prebuilt IIFE via a script tag
 * sidesteps both problems and is the integration path Cesium documents
 * for frameworks that pre-process modules.
 *
 * Resolves to the global `Cesium` namespace. Concurrent callers share
 * one in-flight load.
 */

const CESIUM_BASE_URL = '/cesium';

let pending: Promise<any> | null = null;

export function loadCesium(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cesium can only load in the browser.'));
  }
  const existing = (window as any).Cesium;
  if (existing) return Promise.resolve(existing);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    // Cesium reads this to locate Workers, Assets and Widgets at runtime.
    (window as any).CESIUM_BASE_URL = CESIUM_BASE_URL;

    if (!document.querySelector('link[data-cesium-widgets]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${CESIUM_BASE_URL}/Widgets/widgets.css`;
      link.setAttribute('data-cesium-widgets', '');
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = `${CESIUM_BASE_URL}/Cesium.js`;
    script.async = true;
    script.onload = () => {
      const Cesium = (window as any).Cesium;
      if (Cesium) resolve(Cesium);
      else reject(new Error('Cesium.js loaded but did not expose a global.'));
    };
    script.onerror = () => {
      pending = null;
      reject(new Error(`Failed to load ${CESIUM_BASE_URL}/Cesium.js — run "npm run cesium:assets".`));
    };
    document.head.appendChild(script);
  });

  return pending;
}
