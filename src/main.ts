import { PerspectiveCamera, WebGL1Renderer } from "three";
import { BlasterScene } from "./BlasterScene";
import "./style.css";

// RENDERER AND CAMERA
const width = window.innerWidth;
const height = window.innerHeight;

const renderer = new WebGL1Renderer({
  canvas: document.getElementById("app") as HTMLCanvasElement,
});

renderer.setSize(width, height);

const mainCamera = new PerspectiveCamera(60, width / height, 0.1, 100);

const scene = new BlasterScene(mainCamera);
scene.initialize();

function tick() {
  scene.update();
  renderer.render(scene, mainCamera);
  requestAnimationFrame(tick);
}

tick();
// renderer.render(scene, mainCamera);
