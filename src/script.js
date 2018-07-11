import * as THREE from 'three';
import * as webvrui from 'webvr-ui';
import WebVRPolyfill from 'webvr-polyfill';
import VRControls from './VRControls';
import VREffect from './VREffect';
import BoxImage from '../img/box.png';

// new WebVRPolyfill();
// Last time the scene was rendered.
var lastRenderTime = 0;
// Currently active VRDisplay.
var vrDisplay;
// How big of a box to render.
var boxSize = 5;
// Various global THREE.Objects.
var scene;
var cube;
var controls;
var effect;
var camera;
var skybox;
// EnterVRButton for rendering enter/exit UI.
var vrButton;


function onLoad() {
  // Setup three.js WebGL renderer. Note: Antialiasing is a big performance hit.
  // Only enable it if you actually need to.
  // Alpha true to  make the scene a see through and allow background image
  var renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Append the canvas element created by the renderer to document body element.
  document.body.appendChild(renderer.domElement);

  // Create a three.js scene.
  scene = new THREE.Scene();

  // Create a three.js camera.
  var aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);

  controls = new VRControls(camera);
  controls.standing = true;
  camera.position.y = controls.userHeight;

  // Apply VR stereo rendering to renderer.
  effect = new VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);

  // Add a repeating grid as a skybox.
  var loader = new THREE.TextureLoader();
  loader.load(BoxImage, onTextureLoaded);

  // For high end VR devices like Vive and Oculus, take into account the stage
  // parameters provided.
  setupStage();

  // Create 3D objects.
  var geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  var earthGeometry = new THREE.SphereGeometry(10, 64, 64);
  var moonGeometry = new THREE.SphereGeometry(3, 16, 16);
  var sunGeometry = new THREE.SphereGeometry(25, 80, 80);

  var loader = new THREE.TextureLoader()
  loader.crossOrigin = true;
  var earthTexture = loader.load('https://cdn.rawgit.com/josephrexme/csa/b639ba3e/images/earthmap.jpg');
  var moonTexture = loader.load('https://cdn.rawgit.com/josephrexme/csa/09bb2d3c/images/MoonColorMap.png');
  var sunTexture = loader.load('https://cdn.rawgit.com/josephrexme/csa/09bb2d3c/images/sun_texture.jpg');
  var earthMaterial = new THREE.MeshLambertMaterial({ map: earthTexture });
  var moonMaterial = new THREE.MeshLambertMaterial({ map: moonTexture });
  var sunMaterial = new THREE.MeshLambertMaterial({ map: sunTexture });
  var earth = new THREE.Mesh(earthGeometry, earthMaterial);
  var moon = new THREE.Mesh(moonGeometry, moonMaterial);
  var sun = new THREE.Mesh(sunGeometry, sunMaterial);
  var material = new THREE.MeshNormalMaterial();
  cube = new THREE.Mesh(geometry, material);

  // Position cube mesh to be right in front of you.
  cube.position.set(0, controls.userHeight, -1);
  earth.position.set(0, controls.userHeight, -1);
  var hlight = new THREE.HemisphereLight(0xfefefe, 0x000000, 1);
  var dlight = new THREE.DirectionalLight(0xeaeaea);

  // Add cube mesh to your three.js scene
  scene.add(cube);
  scene.add(earth);
  scene.add(dlight);
  scene.add(hlight);

  window.addEventListener('resize', onResize, true);
  window.addEventListener('vrdisplaypresentchange', onResize, true);

  // Initialize the WebVR UI.
  var uiOptions = {
    color: 'black',
    background: 'white',
    corners: 'square'
  };
  vrButton = new webvrui.EnterVRButton(renderer.domElement, uiOptions);
  vrButton.on('exit', function() {
    camera.quaternion.set(0, 0, 0, 1);
    camera.position.set(0, controls.userHeight, 0);
  });
  vrButton.on('hide', function() {
    document.getElementById('ui').style.display = 'none';
  });
  vrButton.on('show', function() {
    document.getElementById('ui').style.display = 'inherit';
  });
  document.getElementById('vr-button').appendChild(vrButton.domElement);
  document.getElementById('magic-window').addEventListener('click', function() {
    vrButton.requestEnterFullscreen();
  });
}

function onTextureLoaded(texture) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(boxSize, boxSize);

  var geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
  var material = new THREE.MeshBasicMaterial({
    map: texture,
    color: 0x01BE00,
    side: THREE.BackSide
  });

  // Align the skybox to the floor (which is at y=0).
  skybox = new THREE.Mesh(geometry, material);
  skybox.position.y = boxSize/2;
  scene.add(skybox);

}



// Request animation frame loop function
function animate(timestamp) {
  var delta = Math.min(timestamp - lastRenderTime, 500);
  lastRenderTime = timestamp;

  // Apply rotation to cube mesh
  cube.rotation.y += delta * 0.0006;

  // Only update controls if we're presenting.
  if (vrButton.isPresenting()) {
    controls.update();
  }
  // Render the scene.
  effect.render(scene, camera);

  vrDisplay.requestAnimationFrame(animate);
}

function onResize(e) {
  effect.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// Get the HMD, and if we're dealing with something that specifies
// stageParameters, rearrange the scene.
function setupStage() {
  navigator.getVRDisplays().then(function(displays) {
    if (displays.length > 0) {
      vrDisplay = displays[0];
      if (vrDisplay.stageParameters) {
        setStageDimensions(vrDisplay.stageParameters);
      }
      vrDisplay.requestAnimationFrame(animate);
    }
  });
}

function setStageDimensions(stage) {
  // Make the skybox fit the stage.
  var material = skybox.material;
  scene.remove(skybox);

  // Size the skybox according to the size of the actual stage.
  var geometry = new THREE.BoxGeometry(stage.sizeX, boxSize, stage.sizeZ);
  skybox = new THREE.Mesh(geometry, material);

  // Place it on the floor.
  skybox.position.y = boxSize/2;
  scene.add(skybox);

  // Place the cube in the middle of the scene, at user height.
  cube.position.set(0, controls.userHeight, 0);
  earth.position.set(0, controls.userHeight, 0);
}

function ready(cb) {
  /in/.test(document.readyState) // in = loadINg
    ? setTimeout(ready.bind(null, cb), 9)
    : cb();
}

ready(onLoad);
// window.addEventListener('load', onLoad);