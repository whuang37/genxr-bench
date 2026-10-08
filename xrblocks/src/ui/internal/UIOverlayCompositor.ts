import * as THREE from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';

interface ViewportSize {
  width: number;
  height: number;
}

interface RendererState {
  activeCubeFace: number;
  activeMipmapLevel: number;
  autoClear: boolean;
  clearAlpha: number;
  renderTarget: THREE.WebGLRenderTarget | null;
  scissor: THREE.Vector4;
  scissorTest: boolean;
  viewport: THREE.Vector4;
  xrPresenting: boolean;
}

/** Renders screen overlays offscreen, then blends them over the world. */
export class UIOverlayCompositor {
  private readonly sourceScene = new THREE.Scene();
  private readonly sourceCamera = new THREE.OrthographicCamera(
    -1,
    1,
    1,
    -1,
    0.01,
    10
  );
  private readonly displayMaterial = new THREE.ShaderMaterial({
    name: 'XR Blocks screen overlay composite',
    uniforms: {overlayTexture: {value: null}},
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D overlayTexture;
      varying vec2 vUv;

      void main() {
        gl_FragColor = texture2D(overlayTexture, vUv);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcColorFactor,
    blendEquation: THREE.AddEquation,
  });
  private readonly displayQuad = new FullScreenQuad(this.displayMaterial);
  private readonly drawingBufferSize = new THREE.Vector2();
  private readonly savedClearColor = new THREE.Color();
  private renderTarget?: THREE.WebGLRenderTarget;

  constructor() {
    this.sourceScene.name = 'XR Blocks screen overlay source';
    this.sourceCamera.position.set(0, 0, 1);
  }

  add(source: THREE.Object3D): void {
    this.sourceScene.add(source);
  }

  /** Returns the logical viewport used to lay out one presented view. */
  getLayoutViewport(
    renderer: THREE.WebGLRenderer,
    viewport: ViewportSize
  ): ViewportSize {
    const viewSize = this.getXRViewSize(renderer);
    if (!viewSize) return viewport;
    const height = Math.max(1, viewport.height);
    return {
      width: height * (viewSize.width / viewSize.height),
      height,
    };
  }

  render(renderer: THREE.WebGLRenderer, viewport: ViewportSize): void {
    if (!this.hasVisibleSource()) return;

    const state = this.captureRendererState(renderer);
    const targetSize = this.getTargetSize(renderer, state.renderTarget);
    const target = this.ensureRenderTarget(targetSize.width, targetSize.height);
    this.updateSourceCamera(viewport);

    try {
      renderer.xr.isPresenting = false;
      renderer.autoClear = false;
      renderer.setRenderTarget(target);
      renderer.setViewport(0, 0, target.width, target.height);
      renderer.setScissor(0, 0, target.width, target.height);
      renderer.setScissorTest(false);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, false, false);
      renderer.render(this.sourceScene, this.sourceCamera);

      this.restoreRendererState(renderer, state);
      renderer.autoClear = false;
      this.displayQuad.render(renderer);
    } finally {
      this.restoreRendererState(renderer, state);
    }
  }

  dispose(): void {
    this.renderTarget?.dispose();
    this.renderTarget = undefined;
    this.displayQuad.dispose();
    this.displayMaterial.dispose();
    this.sourceScene.clear();
  }

  private captureRendererState(renderer: THREE.WebGLRenderer): RendererState {
    renderer.getClearColor(this.savedClearColor);
    return {
      activeCubeFace: renderer.getActiveCubeFace(),
      activeMipmapLevel: renderer.getActiveMipmapLevel(),
      autoClear: renderer.autoClear,
      clearAlpha: renderer.getClearAlpha(),
      renderTarget: renderer.getRenderTarget(),
      scissor: renderer.getScissor(new THREE.Vector4()),
      scissorTest: renderer.getScissorTest(),
      viewport: renderer.getViewport(new THREE.Vector4()),
      xrPresenting: renderer.xr.isPresenting,
    };
  }

  private restoreRendererState(
    renderer: THREE.WebGLRenderer,
    state: RendererState
  ): void {
    renderer.xr.isPresenting = state.xrPresenting;
    renderer.autoClear = state.autoClear;
    renderer.setRenderTarget(
      state.renderTarget,
      state.activeCubeFace,
      state.activeMipmapLevel
    );
    renderer.setViewport(state.viewport);
    renderer.setScissor(state.scissor);
    renderer.setScissorTest(state.scissorTest);
    renderer.setClearColor(this.savedClearColor, state.clearAlpha);
  }

  private getTargetSize(
    renderer: THREE.WebGLRenderer,
    currentTarget: THREE.WebGLRenderTarget | null
  ): ViewportSize {
    const viewSize = this.getXRViewSize(renderer);
    if (viewSize) return viewSize;
    const size =
      currentTarget ?? renderer.getDrawingBufferSize(this.drawingBufferSize);
    return {
      width: Math.max(1, Math.floor(size.width)),
      height: Math.max(1, Math.floor(size.height)),
    };
  }

  private getXRViewSize(renderer: THREE.WebGLRenderer): ViewportSize | null {
    if (!renderer.xr.isPresenting) return null;
    const cameras = renderer.xr.getCamera()
      .cameras as readonly THREE.PerspectiveCamera[];
    if (cameras.length === 0) return null;
    const width = Math.max(
      ...cameras.map((camera) => camera.viewport?.width ?? 0)
    );
    const height = Math.max(
      ...cameras.map((camera) => camera.viewport?.height ?? 0)
    );
    return width > 0 && height > 0 ? {width, height} : null;
  }

  private ensureRenderTarget(
    width: number,
    height: number
  ): THREE.WebGLRenderTarget {
    if (!this.renderTarget) {
      this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
        colorSpace: THREE.LinearSRGBColorSpace,
        depthBuffer: false,
        stencilBuffer: false,
      });
      this.renderTarget.texture.name = 'XR Blocks screen overlay texture';
      this.displayMaterial.uniforms.overlayTexture.value =
        this.renderTarget.texture;
    } else if (
      this.renderTarget.width !== width ||
      this.renderTarget.height !== height
    ) {
      this.renderTarget.setSize(width, height);
    }
    return this.renderTarget;
  }

  private updateSourceCamera(viewport: ViewportSize): void {
    const halfWidth = viewport.width * 0.0005;
    const halfHeight = viewport.height * 0.0005;
    this.sourceCamera.left = -halfWidth;
    this.sourceCamera.right = halfWidth;
    this.sourceCamera.top = halfHeight;
    this.sourceCamera.bottom = -halfHeight;
    this.sourceCamera.updateProjectionMatrix();
  }

  private hasVisibleSource(): boolean {
    return this.sourceScene.children.some((source) => source.visible);
  }
}
