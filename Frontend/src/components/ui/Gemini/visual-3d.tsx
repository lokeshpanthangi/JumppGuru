import React, { FC, useEffect, useRef } from 'react';
import { Analyser } from './analyser';

import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { fs as backdropFS, vs as backdropVS } from './backdrop-shader';
import { vs as sphereVS } from './sphere-shader';

interface GdmLiveAudioVisuals3DProps {
  inputNode: AudioNode | null;
  outputNode: AudioNode | null;
}

export const GdmLiveAudioVisuals3D: FC<GdmLiveAudioVisuals3DProps> = ({
  inputNode,
  outputNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // STEP 1: Create a ref for the parent container div.
  const containerRef = useRef<HTMLDivElement>(null);
  const threeObjects = useRef<any>({});

  useEffect(() => {
    // Check for both the container and canvas refs
    if (!canvasRef.current || !containerRef.current || !inputNode || !outputNode) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Use the container's dimensions for initial setup
    const { clientWidth, clientHeight } = container;

    const inputAnalyser = new Analyser(inputNode);
    const outputAnalyser = new Analyser(outputNode);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x100c14);

    const backdrop = new THREE.Mesh(
      new THREE.IcosahedronGeometry(10, 5),
      new THREE.RawShaderMaterial({
        uniforms: { resolution: { value: new THREE.Vector2(1, 1) }, rand: { value: 0 } },
        vertexShader: backdropVS, fragmentShader: backdropFS, glslVersion: THREE.GLSL3,
      })
    );
    backdrop.material.side = THREE.BackSide;
    scene.add(backdrop);

    // Use container dimensions for the camera's aspect ratio
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
    camera.position.set(2, -2, 5);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    // Use container dimensions for the renderer's size
    renderer.setSize(clientWidth, clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const geometry = new THREE.IcosahedronGeometry(1, 10);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x000010, metalness: 0.5, roughness: 0.1, emissive: 0x000010, emissiveIntensity: 1.5,
    });
    sphereMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };
      shader.uniforms.inputData = { value: new THREE.Vector4() };
      shader.uniforms.outputData = { value: new THREE.Vector4() };
      sphereMaterial.userData.shader = shader;
      shader.vertexShader = sphereVS;
    };
    const sphere = new THREE.Mesh(geometry, sphereMaterial);
    scene.add(sphere);
    sphere.visible = false;

    new EXRLoader().load('piz_compressed.exr', (texture: THREE.Texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      sphereMaterial.envMap = pmremGenerator.fromEquirectangular(texture).texture;
      sphere.visible = true;
    });

    const renderPass = new RenderPass(scene, camera);
    // Use container dimensions for post-processing passes
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(clientWidth, clientHeight), 5, 0.5, 0);
    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);

    threeObjects.current = {
      camera, renderer, composer, backdrop, sphere, inputAnalyser, outputAnalyser, rotation: new THREE.Vector3(0, 0, 0),
    };

    let prevTime = performance.now();
    let animationFrameId: number;

    // STEP 2: Replace the window resize handler with a ResizeObserver.
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      
      // This is the logic from your old onWindowResize function,
      // but now using the container's dimensions.
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const dPR = renderer.getPixelRatio();
      (backdrop.material as THREE.RawShaderMaterial).uniforms.resolution.value.set(
        width * dPR, height * dPR
      );
      
      renderer.setSize(width, height);
      composer.setSize(width, height);
    });

    // Start observing the container element
    resizeObserver.observe(container);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      // Animation logic remains the same...
      const { composer, backdrop, sphere, inputAnalyser, outputAnalyser, rotation, camera: animCamera } = threeObjects.current;
      inputAnalyser.update();
      outputAnalyser.update();
      const t = performance.now();
      const dt = (t - prevTime) / (1000 / 60);
      prevTime = t;
      (backdrop.material as THREE.RawShaderMaterial).uniforms.rand.value = Math.random() * 10000;
      if (sphere.material.userData.shader) {
        sphere.scale.setScalar(1 + (0.2 * outputAnalyser.data[1]) / 255);
        const f = 0.001;
        rotation.x += (dt * f * 0.5 * outputAnalyser.data[1]) / 255;
        rotation.z += (dt * f * 0.5 * inputAnalyser.data[1]) / 255;
        rotation.y += (dt * f * 0.25 * inputAnalyser.data[2]) / 255;
        rotation.y += (dt * f * 0.25 * outputAnalyser.data[2]) / 255;
        const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z);
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        const vector = new THREE.Vector3(0, 0, 5);
        vector.applyQuaternion(quaternion);
        animCamera.position.copy(vector);
        animCamera.lookAt(sphere.position);
        const shader = sphere.material.userData.shader;
        shader.uniforms.time.value += (dt * 0.1 * outputAnalyser.data[0]) / 255;
        shader.uniforms.inputData.value.set((1 * inputAnalyser.data[0]) / 255, (0.1 * inputAnalyser.data[1]) / 255, (10 * inputAnalyser.data[2]) / 255, 0);
        shader.uniforms.outputData.value.set((2 * outputAnalyser.data[0]) / 255, (0.1 * outputAnalyser.data[1]) / 255, (10 * outputAnalyser.data[2]) / 255, 0);
      }
      composer.render();
    };

    animate();

    return () => {
      // STEP 3: Clean up the observer, animation, and Three.js resources.
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      pmremGenerator.dispose();
      geometry.dispose();
      sphereMaterial.dispose();
    };
  }, [inputNode, outputNode]);

  // STEP 4: Render the container div and place the canvas inside it.
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};