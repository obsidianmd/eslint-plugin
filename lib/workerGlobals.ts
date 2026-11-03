import type { Linter } from "eslint";
import globals from "globals";

// The globals.browser names that a dedicated worker has as well, although the
// `worker` list of globals 14 (the version this plugin depends on) leaves them
// out; globals 17's `worker` list has every one. `Intl` is an ECMAScript
// built-in, which globals 14 only lists under `browser`. Switching any of these
// off would make no-undef report code that works in a worker.
const BROWSER_GLOBALS_ALSO_IN_WORKERS = new Set([
    "AbortController", "AbortSignal", "CacheStorage", "cancelAnimationFrame",
    "CanvasGradient", "CanvasPattern", "CloseEvent", "createImageBitmap", "CSS",
    "CSSMatrixComponent", "CSSPerspective", "CSSRotate", "CSSScale", "CSSSkew", "CSSSkewX",
    "CSSSkewY", "CSSTransformValue", "CSSTranslate", "dispatchEvent", "DOMException",
    "DOMMatrix", "DOMMatrixReadOnly", "DOMPoint", "DOMPointReadOnly", "DOMQuad", "DOMRect",
    "DOMRectReadOnly", "DOMStringList", "EventSource", "EventTarget", "FileList",
    "FileReader", "FontFace", "FontFaceSetLoadEvent", "ImageBitmap",
    "ImageBitmapRenderingContext", "Intl", "isSecureContext", "MediaSource",
    "NavigationPreloadManager", "NavigatorUAData", "NetworkInformation", "OffscreenCanvas",
    "OffscreenCanvasRenderingContext2D", "onmessageerror", "origin", "Path2D",
    "Permissions", "PermissionStatus", "ProgressEvent", "PromiseRejectionEvent",
    "PushManager", "PushSubscription", "PushSubscriptionOptions", "requestAnimationFrame",
    "RTCDataChannel", "SecurityPolicyViolationEvent", "ServiceWorker",
    "ServiceWorkerContainer", "SourceBuffer", "SourceBufferList", "StorageManager",
    "structuredClone", "TextMetrics", "WebGL2RenderingContext", "WebGLActiveInfo",
    "WebGLBuffer", "WebGLContextEvent", "WebGLFramebuffer", "WebGLProgram", "WebGLQuery",
    "WebGLRenderbuffer", "WebGLRenderingContext", "WebGLSampler", "WebGLShader",
    "WebGLShaderPrecisionFormat", "WebGLSync", "WebGLTexture", "WebGLTransformFeedback",
    "WebGLUniformLocation", "WebGLVertexArrayObject", "XMLHttpRequestEventTarget",
    "XMLHttpRequestUpload",
]);

/**
 * The browser globals a web worker does not have -- `window`, `document`,
 * `localStorage`, `alert`, the DOM element classes and the rest -- each set to
 * "off". Flat config merges `languageOptions.globals` across the blocks that
 * match a file, so a block for worker files cannot take a browser global away
 * by leaving it out; it has to switch it off.
 */
export const browserOnlyGlobalsOff: Linter.Globals = Object.fromEntries(
    Object.keys(globals.browser)
        .filter((name) => !Object.hasOwn(globals.worker, name) && !BROWSER_GLOBALS_ALSO_IN_WORKERS.has(name))
        .map((name) => [name, "off"]),
);
