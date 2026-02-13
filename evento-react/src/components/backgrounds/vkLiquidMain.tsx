'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type VkLiquidMainBackgroundProps = {
  fullScreen?: boolean;
};

type TouchPoint = {
  age: number;
  force: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type MousePoint = {
  x: number;
  y: number;
};

type ColorScheme = {
  color1: THREE.Vector3;
  color2: THREE.Vector3;
  color3?: THREE.Vector3;
  color4?: THREE.Vector3;
  color5?: THREE.Vector3;
  color6?: THREE.Vector3;
};

type ColorSchemes = Record<number, ColorScheme>;

type GradientUniforms = {
  uColor1: THREE.IUniform<THREE.Vector3>;
  uColor1Weight: THREE.IUniform<number>;
  uColor2: THREE.IUniform<THREE.Vector3>;
  uColor2Weight: THREE.IUniform<number>;
  uColor3: THREE.IUniform<THREE.Vector3>;
  uColor4: THREE.IUniform<THREE.Vector3>;
  uColor5: THREE.IUniform<THREE.Vector3>;
  uColor6: THREE.IUniform<THREE.Vector3>;
  uDarkNavy: THREE.IUniform<THREE.Vector3>;
  uGradientCount: THREE.IUniform<number>;
  uGradientSize: THREE.IUniform<number>;
  uGrainIntensity: THREE.IUniform<number>;
  uIntensity: THREE.IUniform<number>;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uSpeed: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uTouchTexture: THREE.IUniform<THREE.Texture | null>;
  uZoom: THREE.IUniform<number>;
};

class TouchTexture {
  readonly maxAge = 64;
  readonly radius: number;
  readonly speed: number;
  readonly size = 64;
  readonly texture: THREE.Texture;
  readonly width: number;
  readonly height: number;

  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private last: MousePoint | null = null;
  private trail: TouchPoint[] = [];

  constructor() {
    this.width = this.size;
    this.height = this.size;
    this.radius = 0.25 * this.size;
    this.speed = 1 / this.maxAge;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to init touch texture context');
    }

    this.context = context;
    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.texture = new THREE.Texture(this.canvas);
  }

  addTouch(point: MousePoint) {
    let force = 0;
    let vx = 0;
    let vy = 0;

    const last = this.last;
    if (last) {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx === 0 && dy === 0) {
        return;
      }

      const squaredDistance = dx * dx + dy * dy;
      const distance = Math.sqrt(squaredDistance);
      vx = dx / distance;
      vy = dy / distance;
      force = Math.min(squaredDistance * 20000, 2.0);
    }

    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  update() {
    this.clear();
    const speed = this.speed;

    for (let index = this.trail.length - 1; index >= 0; index -= 1) {
      const point = this.trail[index];
      const factor = point.force * speed * (1 - point.age / this.maxAge);
      point.x += point.vx * factor;
      point.y += point.vy * factor;
      point.age += 1;

      if (point.age > this.maxAge) {
        this.trail.splice(index, 1);
      } else {
        this.drawPoint(point);
      }
    }

    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }

  private clear() {
    this.context.fillStyle = 'black';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawPoint(point: TouchPoint) {
    const position = {
      x: point.x * this.width,
      y: (1 - point.y) * this.height,
    };

    let intensity = 1;
    if (point.age < this.maxAge * 0.3) {
      intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2));
    } else {
      const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
      intensity = -t * (t - 2);
    }

    intensity *= point.force;

    const color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`;
    const offset = this.size * 5;

    this.context.shadowOffsetX = offset;
    this.context.shadowOffsetY = offset;
    this.context.shadowBlur = this.radius;
    this.context.shadowColor = `rgba(${color},${0.2 * intensity})`;

    this.context.beginPath();
    this.context.fillStyle = 'rgba(255,0,0,1)';
    this.context.arc(position.x - offset, position.y - offset, this.radius, 0, Math.PI * 2);
    this.context.fill();
  }
}

class GradientBackground {
  private mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;

  readonly uniforms: GradientUniforms;

  private readonly sceneManager: LiquidApp;

  constructor(sceneManager: LiquidApp, width: number, height: number) {
    this.sceneManager = sceneManager;

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uColor1: { value: new THREE.Vector3(0.2, 0.2, 0.6) }, // #333399
      uColor2: { value: new THREE.Vector3(0.0392156863, 0.0549019608, 0.1529411765) }, // #0A0E27
      uColor3: { value: new THREE.Vector3(0.2039215686, 0.5254901961, 0.9960784314) }, // #8593a7
      uColor4: { value: new THREE.Vector3(0.0392156863, 0.0549019608, 0.1529411765) }, // #0A0E27
      uColor5: { value: new THREE.Vector3(0.2, 0.2, 0.6) }, // #0e0e66
      uColor6: { value: new THREE.Vector3(0.0392156863, 0.0549019608, 0.1529411765) }, // #0A0E27
      uSpeed: { value: 1.2 },
      uIntensity: { value: 1.8 },
      uTouchTexture: { value: null },
      uGrainIntensity: { value: 0.08 },
      uZoom: { value: 1.0 },
      uDarkNavy: { value: new THREE.Vector3(0.0392156863, 0.0549019608, 0.1529411765) }, // #0A0E27
      uGradientSize: { value: 1.0 },
      uGradientCount: { value: 6.0 },
      uColor1Weight: { value: 1.0 },
      uColor2Weight: { value: 1.0 },
    };
  }

  init() {
    const viewSize = this.sceneManager.getViewSize();
    const geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vec3 pos = position.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
          vUv = uv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec3 uColor4;
        uniform vec3 uColor5;
        uniform vec3 uColor6;
        uniform float uSpeed;
        uniform float uIntensity;
        uniform sampler2D uTouchTexture;
        uniform float uGrainIntensity;
        uniform float uZoom;
        uniform vec3 uDarkNavy;
        uniform float uGradientSize;
        uniform float uGradientCount;
        uniform float uColor1Weight;
        uniform float uColor2Weight;

        varying vec2 vUv;

        #define PI 3.14159265359

        float grain(vec2 uv, float time) {
          vec2 grainUv = uv * uResolution * 0.5;
          float grainValue = fract(sin(dot(grainUv + time, vec2(12.9898, 78.233))) * 43758.5453);
          return grainValue * 2.0 - 1.0;
        }

        vec3 getGradientColor(vec2 uv, float time) {
          float gradientRadius = uGradientSize;

          vec2 center1 = vec2(
            0.5 + sin(time * uSpeed * 0.4) * 0.4,
            0.5 + cos(time * uSpeed * 0.5) * 0.4
          );
          vec2 center2 = vec2(
            0.5 + cos(time * uSpeed * 0.6) * 0.5,
            0.5 + sin(time * uSpeed * 0.45) * 0.5
          );
          vec2 center3 = vec2(
            0.5 + sin(time * uSpeed * 0.35) * 0.45,
            0.5 + cos(time * uSpeed * 0.55) * 0.45
          );
          vec2 center4 = vec2(
            0.5 + cos(time * uSpeed * 0.5) * 0.4,
            0.5 + sin(time * uSpeed * 0.4) * 0.4
          );
          vec2 center5 = vec2(
            0.5 + sin(time * uSpeed * 0.7) * 0.35,
            0.5 + cos(time * uSpeed * 0.6) * 0.35
          );
          vec2 center6 = vec2(
            0.5 + cos(time * uSpeed * 0.45) * 0.5,
            0.5 + sin(time * uSpeed * 0.65) * 0.5
          );

          vec2 center7 = vec2(
            0.5 + sin(time * uSpeed * 0.55) * 0.38,
            0.5 + cos(time * uSpeed * 0.48) * 0.42
          );
          vec2 center8 = vec2(
            0.5 + cos(time * uSpeed * 0.65) * 0.36,
            0.5 + sin(time * uSpeed * 0.52) * 0.44
          );
          vec2 center9 = vec2(
            0.5 + sin(time * uSpeed * 0.42) * 0.41,
            0.5 + cos(time * uSpeed * 0.58) * 0.39
          );
          vec2 center10 = vec2(
            0.5 + cos(time * uSpeed * 0.48) * 0.37,
            0.5 + sin(time * uSpeed * 0.62) * 0.43
          );
          vec2 center11 = vec2(
            0.5 + sin(time * uSpeed * 0.68) * 0.33,
            0.5 + cos(time * uSpeed * 0.44) * 0.46
          );
          vec2 center12 = vec2(
            0.5 + cos(time * uSpeed * 0.38) * 0.39,
            0.5 + sin(time * uSpeed * 0.56) * 0.41
          );

          float dist1 = length(uv - center1);
          float dist2 = length(uv - center2);
          float dist3 = length(uv - center3);
          float dist4 = length(uv - center4);
          float dist5 = length(uv - center5);
          float dist6 = length(uv - center6);
          float dist7 = length(uv - center7);
          float dist8 = length(uv - center8);
          float dist9 = length(uv - center9);
          float dist10 = length(uv - center10);
          float dist11 = length(uv - center11);
          float dist12 = length(uv - center12);

          float influence1 = 1.0 - smoothstep(0.0, gradientRadius, dist1);
          float influence2 = 1.0 - smoothstep(0.0, gradientRadius, dist2);
          float influence3 = 1.0 - smoothstep(0.0, gradientRadius, dist3);
          float influence4 = 1.0 - smoothstep(0.0, gradientRadius, dist4);
          float influence5 = 1.0 - smoothstep(0.0, gradientRadius, dist5);
          float influence6 = 1.0 - smoothstep(0.0, gradientRadius, dist6);
          float influence7 = 1.0 - smoothstep(0.0, gradientRadius, dist7);
          float influence8 = 1.0 - smoothstep(0.0, gradientRadius, dist8);
          float influence9 = 1.0 - smoothstep(0.0, gradientRadius, dist9);
          float influence10 = 1.0 - smoothstep(0.0, gradientRadius, dist10);
          float influence11 = 1.0 - smoothstep(0.0, gradientRadius, dist11);
          float influence12 = 1.0 - smoothstep(0.0, gradientRadius, dist12);

          vec2 rotatedUv1 = uv - 0.5;
          float angle1 = time * uSpeed * 0.15;
          rotatedUv1 = vec2(
            rotatedUv1.x * cos(angle1) - rotatedUv1.y * sin(angle1),
            rotatedUv1.x * sin(angle1) + rotatedUv1.y * cos(angle1)
          );
          rotatedUv1 += 0.5;

          vec2 rotatedUv2 = uv - 0.5;
          float angle2 = -time * uSpeed * 0.12;
          rotatedUv2 = vec2(
            rotatedUv2.x * cos(angle2) - rotatedUv2.y * sin(angle2),
            rotatedUv2.x * sin(angle2) + rotatedUv2.y * cos(angle2)
          );
          rotatedUv2 += 0.5;

          float radialGradient1 = length(rotatedUv1 - 0.5);
          float radialGradient2 = length(rotatedUv2 - 0.5);
          float radialInfluence1 = 1.0 - smoothstep(0.0, 0.8, radialGradient1);
          float radialInfluence2 = 1.0 - smoothstep(0.0, 0.8, radialGradient2);

          vec3 color = vec3(0.0);
          color += uColor1 * influence1 * (0.55 + 0.45 * sin(time * uSpeed)) * uColor1Weight;
          color += uColor2 * influence2 * (0.55 + 0.45 * cos(time * uSpeed * 1.2)) * uColor2Weight;
          color += uColor3 * influence3 * (0.55 + 0.45 * sin(time * uSpeed * 0.8)) * uColor1Weight;
          color += uColor4 * influence4 * (0.55 + 0.45 * cos(time * uSpeed * 1.3)) * uColor2Weight;
          color += uColor5 * influence5 * (0.55 + 0.45 * sin(time * uSpeed * 1.1)) * uColor1Weight;
          color += uColor6 * influence6 * (0.55 + 0.45 * cos(time * uSpeed * 0.9)) * uColor2Weight;

          if (uGradientCount > 6.0) {
            color += uColor1 * influence7 * (0.55 + 0.45 * sin(time * uSpeed * 1.4)) * uColor1Weight;
            color += uColor2 * influence8 * (0.55 + 0.45 * cos(time * uSpeed * 1.5)) * uColor2Weight;
            color += uColor3 * influence9 * (0.55 + 0.45 * sin(time * uSpeed * 1.6)) * uColor1Weight;
            color += uColor4 * influence10 * (0.55 + 0.45 * cos(time * uSpeed * 1.7)) * uColor2Weight;
          }
          if (uGradientCount > 10.0) {
            color += uColor5 * influence11 * (0.55 + 0.45 * sin(time * uSpeed * 1.8)) * uColor1Weight;
            color += uColor6 * influence12 * (0.55 + 0.45 * cos(time * uSpeed * 1.9)) * uColor2Weight;
          }

          color += mix(uColor1, uColor3, radialInfluence1) * 0.45 * uColor1Weight;
          color += mix(uColor2, uColor4, radialInfluence2) * 0.4 * uColor2Weight;

          color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;

          float luminance = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(vec3(luminance), color, 1.35);

          color = pow(color, vec3(0.92));

          float brightness1 = length(color);
          float mixFactor1 = max(brightness1 * 1.2, 0.15);
          color = mix(uDarkNavy, color, mixFactor1);

          float maxBrightness = 1.0;
          float brightness = length(color);
          if (brightness > maxBrightness) {
            color = color * (maxBrightness / brightness);
          }

          return color;
        }

        void main() {
          vec2 uv = vUv;

          vec4 touchTex = texture2D(uTouchTexture, uv);
          float vx = -(touchTex.r * 2.0 - 1.0);
          float vy = -(touchTex.g * 2.0 - 1.0);
          float intensity = touchTex.b;
          uv.x += vx * 0.8 * intensity;
          uv.y += vy * 0.8 * intensity;

          vec2 center = vec2(0.5);
          float dist = length(uv - center);
          float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.04 * intensity;
          float wave = sin(dist * 15.0 - uTime * 2.0) * 0.03 * intensity;
          uv += vec2(ripple + wave);

          vec3 color = getGradientColor(uv, uTime);

          float grainValue = grain(uv, uTime);
          color += grainValue * uGrainIntensity;

          float timeShift = uTime * 0.5;
          color.r += sin(timeShift) * 0.02;
          color.g += cos(timeShift * 1.4) * 0.02;
          color.b += sin(timeShift * 1.2) * 0.02;

          float brightness2 = length(color);
          float mixFactor2 = max(brightness2 * 1.2, 0.15);
          color = mix(uDarkNavy, color, mixFactor2);

          color = clamp(color, vec3(0.0), vec3(1.0));

          float maxBrightness = 1.0;
          float brightness = length(color);
          if (brightness > maxBrightness) {
            color = color * (maxBrightness / brightness);
          }

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.z = 0;
    this.sceneManager.scene.add(this.mesh);
  }

  update(delta: number) {
    this.uniforms.uTime.value += delta;
  }

  onResize(width: number, height: number) {
    const viewSize = this.sceneManager.getViewSize();

    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
    }

    this.uniforms.uResolution.value.set(width, height);
  }

  dispose() {
    if (!this.mesh) {
      return;
    }

    this.sceneManager.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh = null;
  }
}

class LiquidApp {
  readonly camera: THREE.PerspectiveCamera;
  readonly scene: THREE.Scene;

  private readonly colorSchemes: ColorSchemes;
  private readonly clock: THREE.Clock;
  private readonly gradientBackground: GradientBackground;
  private readonly host: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly touchTexture: TouchTexture;

  private animationFrameId = 0;
  private currentScheme = 1;

  private readonly onMouseMoveHandler: (event: MouseEvent) => void;
  private readonly onResizeHandler: () => void;
  private readonly onTouchMoveHandler: (event: TouchEvent) => void;
  private readonly onVisibilityHandler: () => void;

  constructor(host: HTMLElement) {
    this.host = host;

    const size = this.getSize();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: false,
    });
    this.renderer.setSize(size.width, size.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setAnimationLoop(null);
    this.renderer.domElement.id = 'webGLApp';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.host.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, size.width / Math.max(size.height, 1), 0.1, 10000);
    this.camera.position.z = 50;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);

    this.clock = new THREE.Clock();
    this.touchTexture = new TouchTexture();
    this.gradientBackground = new GradientBackground(this, size.width, size.height);
    this.gradientBackground.uniforms.uTouchTexture.value = this.touchTexture.texture;

    this.colorSchemes = {
      1: {
        color1: new THREE.Vector3(0.2, 0.2, 0.6), // #333399
        color2: new THREE.Vector3(0.0392156863, 0.0549019608, 0.1529411765), // #0A0E27
        color3: new THREE.Vector3(0.2039215686, 0.5254901961, 0.9960784314), // #3486FE
        color4: new THREE.Vector3(0.0392156863, 0.0549019608, 0.1529411765), // #0A0E27
      },
      2: {
        color1: new THREE.Vector3(1.0, 0.424, 0.314),
        color2: new THREE.Vector3(0.251, 0.878, 0.816),
      },
      3: {
        color1: new THREE.Vector3(0.945, 0.353, 0.133),
        color2: new THREE.Vector3(0.039, 0.055, 0.153),
        color3: new THREE.Vector3(0.251, 0.878, 0.816),
      },
      4: {
        color1: new THREE.Vector3(0.949, 0.4, 0.2),
        color2: new THREE.Vector3(0.176, 0.42, 0.427),
        color3: new THREE.Vector3(0.82, 0.686, 0.612),
      },
      5: {
        color1: new THREE.Vector3(0.945, 0.353, 0.133),
        color2: new THREE.Vector3(0.0, 0.259, 0.22),
        color3: new THREE.Vector3(0.945, 0.353, 0.133),
        color4: new THREE.Vector3(0.0, 0.0, 0.0),
        color5: new THREE.Vector3(0.945, 0.353, 0.133),
        color6: new THREE.Vector3(0.0, 0.0, 0.0),
      },
    };

    this.onResizeHandler = () => this.onResize();
    this.onMouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event.clientX, event.clientY);
    this.onTouchMoveHandler = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      this.onMouseMove(touch.clientX, touch.clientY);
    };
    this.onVisibilityHandler = () => {
      if (!document.hidden) {
        this.render();
      }
    };

    this.init();
  }

  destroy() {
    window.removeEventListener('resize', this.onResizeHandler);
    window.removeEventListener('mousemove', this.onMouseMoveHandler);
    window.removeEventListener('touchmove', this.onTouchMoveHandler);
    document.removeEventListener('visibilitychange', this.onVisibilityHandler);

    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }

    this.gradientBackground.dispose();
    this.touchTexture.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.host) {
      this.host.removeChild(this.renderer.domElement);
    }
  }

  getViewSize() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;
    const height = Math.abs(this.camera.position.z * Math.tan(fovInRadians / 2) * 2);
    return { width: height * this.camera.aspect, height };
  }

  private getSize() {
    const width = Math.max(this.host.clientWidth, window.innerWidth, 1);
    const height = Math.max(this.host.clientHeight, window.innerHeight, 1);
    return { width, height };
  }

  private init() {
    this.gradientBackground.init();
    this.setColorScheme(1);

    this.render();
    this.tick();

    window.addEventListener('resize', this.onResizeHandler);
    window.addEventListener('mousemove', this.onMouseMoveHandler);
    window.addEventListener('touchmove', this.onTouchMoveHandler, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityHandler);
  }

  private onMouseMove(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;

    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return;
    }

    this.touchTexture.addTouch({ x, y });
  }

  private onResize() {
    const size = this.getSize();
    this.camera.aspect = size.width / Math.max(size.height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(size.width, size.height);
    this.gradientBackground.onResize(size.width, size.height);
  }

  private render() {
    const delta = this.clock.getDelta();
    const clampedDelta = Math.min(delta, 0.1);
    this.renderer.render(this.scene, this.camera);
    this.touchTexture.update();
    this.gradientBackground.update(clampedDelta);
  }

  private setColorScheme(scheme: number) {
    const colors = this.colorSchemes[scheme];
    if (!colors) {
      return;
    }

    this.currentScheme = scheme;
    const uniforms = this.gradientBackground.uniforms;

    if (colors.color3 && colors.color4) {
      uniforms.uColor1.value.copy(colors.color1);
      uniforms.uColor2.value.copy(colors.color2);
      uniforms.uColor3.value.copy(colors.color3);
      uniforms.uColor4.value.copy(colors.color4);
      uniforms.uColor5.value.copy(colors.color5 ?? colors.color1);
      uniforms.uColor6.value.copy(colors.color6 ?? colors.color2);
    } else if (colors.color3) {
      uniforms.uColor1.value.copy(colors.color1);
      uniforms.uColor2.value.copy(colors.color2);
      uniforms.uColor3.value.copy(colors.color3);
      uniforms.uColor4.value.copy(colors.color1);
      uniforms.uColor5.value.copy(colors.color2);
      uniforms.uColor6.value.copy(colors.color3);
    } else {
      uniforms.uColor1.value.copy(colors.color1);
      uniforms.uColor2.value.copy(colors.color2);
      uniforms.uColor3.value.copy(colors.color1);
      uniforms.uColor4.value.copy(colors.color2);
      uniforms.uColor5.value.copy(colors.color1);
      uniforms.uColor6.value.copy(colors.color2);
    }

    if (scheme === 1 || scheme === 5) {
      this.scene.background = new THREE.Color(0x0a0e27);
      uniforms.uDarkNavy.value.set(0.0392156863, 0.0549019608, 0.1529411765);
      uniforms.uGradientSize.value = 0.45;
      uniforms.uGradientCount.value = 12.0;
      uniforms.uSpeed.value = 1.5;
      uniforms.uColor1Weight.value = 0.5;
      uniforms.uColor2Weight.value = 1.8;
    } else if (scheme === 4) {
      this.scene.background = new THREE.Color(0xffffff);
      uniforms.uDarkNavy.value.set(0, 0, 0);
    } else {
      this.scene.background = new THREE.Color(0x0a0e27);
      uniforms.uDarkNavy.value.set(0.0392156863, 0.0549019608, 0.1529411765);
      uniforms.uGradientSize.value = 1.0;
      uniforms.uGradientCount.value = 6.0;
      uniforms.uSpeed.value = 1.2;
      uniforms.uColor1Weight.value = 1.0;
      uniforms.uColor2Weight.value = 1.0;
    }
  }

  private tick = () => {
    this.render();
    this.animationFrameId = window.requestAnimationFrame(this.tick);
  };
}

export default function VkLiquidMainBackground({ fullScreen = false }: VkLiquidMainBackgroundProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const app = new LiquidApp(host);

    return () => {
      app.destroy();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={
        fullScreen
          ? 'pointer-events-none fixed inset-0 z-0 overflow-hidden'
          : 'pointer-events-none absolute inset-0 z-0 overflow-hidden'
      }
    />
  );
}
