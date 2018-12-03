import THREE from '../third_party/three.js';

import { getFBO } from './fbo.js';
import ShaderPass from '../modules/shader-pass.js';

import orthoVertexShader from '../shaders/ortho.js';
import vignette from '../shaders/vignette.js';
import fxaa from '../shaders/fxaa.js';
import rgbShift from '../shaders/rgb-shift.js';
import { gammaCorrect, levelRange, finalLevels } from '../shaders/levels.js';

const antialiasFragmentShader = `
precision highp float;

uniform vec2 resolution;

uniform sampler2D inputTexture;
uniform float minLevel;
uniform float maxLevel;

varying vec2 vUv;
${fxaa}
${gammaCorrect}
${levelRange}
${finalLevels}

void main() {
  vec4 color = fxaa(inputTexture, vUv );
  color.rgb = finalLevels(color.rgb, vec3(0.) / 255., vec3(1.5), vec3(255.)/ 255.);
  gl_FragColor = color;
}
`;

const rgbFragmentShader = `
precision highp float;

uniform vec2 resolution;

uniform sampler2D inputTexture;

varying vec2 vUv;
${rgbShift}

void main() {
  gl_FragColor = rgbShift(inputTexture, vUv,resolution/20.);
}
`;


function Post(renderer, params = {}) {

  const w = renderer.getSize().width;
  const h = renderer.getSize().height;

  const colorFBO = getFBO(w, h);

  const antialiasShader = new THREE.RawShaderMaterial({
    uniforms: {
      resolution: { value: new THREE.Vector2(w, h) },
      inputTexture: { value: colorFBO.texture },
      minLevel: { value: 0 },
      maxLevel: { value: .8 }
    },
    vertexShader: orthoVertexShader,
    fragmentShader: antialiasFragmentShader,
  });
  const antialiasPass = new ShaderPass(renderer, antialiasShader, w, h, THREE.RGBAFormat, THREE.UnsignedByteType, THREE.LinearFilter, THREE.LinearFilter, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping);

  const rgbShader = new THREE.RawShaderMaterial({
    uniforms: {
      resolution: { value: new THREE.Vector2(w, h) },
      inputTexture: { value: antialiasPass.fbo.texture },
      minLevel: { value: 0 },
      maxLevel: { value: .8 }
    },
    vertexShader: orthoVertexShader,
    fragmentShader: rgbFragmentShader,
  });
  const rgbPass = new ShaderPass(renderer, rgbShader, w, h, THREE.RGBAFormat, THREE.UnsignedByteType, THREE.LinearFilter, THREE.LinearFilter, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping);

  function render(scene, camera) {
    renderer.render(scene, camera, colorFBO);
    antialiasPass.render();
    rgbPass.render(true);
  }

  return {
    render
  }
}

export { Post };