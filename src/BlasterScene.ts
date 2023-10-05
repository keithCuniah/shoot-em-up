import {
  DirectionalLight,
  PerspectiveCamera,
  Group,
  Scene,
  Vector3,
  Box3,
} from "three";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { Bullet } from "./Bullet";

class BlasterScene extends Scene {
  private readonly mtlLoader = new MTLLoader();
  private readonly objLoader = new OBJLoader();

  private readonly camera: THREE.PerspectiveCamera;

  private readonly keyDown = new Set<string>();

  private blaster?: Group;
  private bulletMtl?: MTLLoader.MaterialCreator;

  private directionVector = new Vector3();

  private bullets: Bullet[] = [];

  private targets: Group[] = [];

  constructor(camera: PerspectiveCamera) {
    super();
    this.camera = camera;
  }

  async initialize() {
    // GEOMETRY
    // const geometry = new BoxGeometry();
    // const material = new MeshPhongMaterial({ color: 0xffad00 });

    // const cube = new Mesh(geometry, material);
    // cube.position.z = -5;
    // cube.position.y = -1;
    // this.add(cube);

    // load a shared MTL (Material Template Library) for the targets
    const targetMtl = await this.mtlLoader.loadAsync("assets/targetA.mtl");
    targetMtl.preload();

    this.bulletMtl = await this.mtlLoader.loadAsync("assets/foamBulletB.mtl");
    this.bulletMtl.preload();

    // create 4 targets
    const t1 = await this.createTarget(targetMtl);
    t1.position.x = -1;
    t1.position.z = -3;

    const t2 = await this.createTarget(targetMtl);
    t2.position.x = 1;
    t2.position.z = -3;

    const t3 = await this.createTarget(targetMtl);
    t3.position.x = 2;
    t3.position.z = -3;

    const t4 = await this.createTarget(targetMtl);
    t4.position.x = -2;
    t4.position.z = -3;

    this.add(t1, t2, t3, t4);
    this.targets.push(t1, t2, t3, t4);
    // BLASTER
    this.blaster = await this.createBlaster();
    this.add(this.blaster);

    this.blaster.position.z = 3;
    this.blaster.add(this.camera);

    this.camera.position.z = 1;
    this.camera.position.y = 0.5;

    // LIGHT
    const light = new DirectionalLight(0xffffff, 1);
    light.position.set(0, 4, 2);
    this.add(light);

    // KEY LISTENNER
    document.addEventListener("keydown", (e) =>
      this.handleKeyDown(e, this.keyDown)
    );
    document.addEventListener("keyup", (e) =>
      this.handleKeyUp(e, this.keyDown)
    );
  }

  private handleKeyDown($event: KeyboardEvent, keyDown: Set<string>) {
    keyDown.add($event.key.toLowerCase());
  }

  private handleKeyUp(event: KeyboardEvent, keyDown: Set<string>) {
    keyDown.delete(event.key.toLowerCase());

    if (event.key == " ") {
      this.createBullet();
    }
  }

  private async createTarget(mtl: MTLLoader.MaterialCreator) {
    this.objLoader.setMaterials(mtl);

    const modelRoot = await this.objLoader.loadAsync("assets/targetA.obj");

    modelRoot.rotateY(Math.PI * 0.5);

    return modelRoot;
  }

  private updateInput() {
    if (!this.blaster) {
      return;
    }
    const shiftKey = this.keyDown.has("shift");

    if (!shiftKey) {
      if (this.keyDown.has("a") || this.keyDown.has("arrowleft")) {
        this.blaster.rotateY(0.02);
      } else if (this.keyDown.has("d") || this.keyDown.has("arrowright")) {
        this.blaster.rotateY(-0.02);
      }
    }

    const dir = this.directionVector;

    this.camera.getWorldDirection(dir);

    const speed = 0.1;

    if (this.keyDown.has("w") || this.keyDown.has("arrowup")) {
      this.blaster.position.add(dir.clone().multiplyScalar(speed));
    } else if (this.keyDown.has("s") || this.keyDown.has("arrowdown")) {
      this.blaster.position.add(dir.clone().multiplyScalar(-speed));
    }

    if (shiftKey) {
      const strafeDir = dir.clone();
      const upVector = new Vector3(0, 1, 0);

      if (this.keyDown.has("a") || this.keyDown.has("arrowleft")) {
        this.blaster.position.add(
          strafeDir
            .applyAxisAngle(upVector, Math.PI * 0.5)
            .multiplyScalar(speed)
        );
      } else if (this.keyDown.has("d") || this.keyDown.has("arrowright")) {
        this.blaster.position.add(
          strafeDir
            .applyAxisAngle(upVector, Math.PI * -0.5)
            .multiplyScalar(speed)
        );
      }
    }
  }

  private async createBlaster() {
    const mtl = await this.mtlLoader.loadAsync("assets/blasterG.mtl");
    mtl.preload();

    this.objLoader.setMaterials(mtl);

    const modelRoot = await this.objLoader.loadAsync("assets/blasterG.obj");

    return modelRoot;
  }

  private async createBullet() {
    if (!this.blaster) {
      return;
    }

    if (this.bulletMtl) {
      this.objLoader.setMaterials(this.bulletMtl);
    }

    const bulletModel = await this.objLoader.loadAsync(
      "assets/foamBulletB.obj"
    );

    this.camera.getWorldDirection(this.directionVector);

    const axisAlignedBoundingBox = new Box3().setFromObject(this.blaster);
    const size = axisAlignedBoundingBox.getSize(new Vector3());

    const vec = this.blaster.position.clone();

    vec.y += 0.06;

    bulletModel.position.add(
      vec.add(this.directionVector.clone().multiplyScalar(size.z * 0.5))
    );

    // rotate childrent to match gun for simplicity
    bulletModel.children.forEach((child) => child.rotateX(Math.PI * -0.5));

    // use the same rotation as the blaster
    bulletModel.rotation.copy(this.blaster.rotation);

    this.add(bulletModel);

    const bullets = new Bullet(bulletModel);
    bullets.setVelocity(
      this.directionVector.x * 0.2,
      this.directionVector.y * 0.2,
      this.directionVector.z * 0.2
    );

    this.bullets.push(bullets);
  }

  private updateBullets() {
    this.bullets.forEach((bullet: Bullet, indexBullet: number) => {
      bullet.update();

      if (bullet.shouldRemove) {
        this.remove(bullet.group);
        this.bullets.splice(indexBullet, 1);
      } else {
        this.targets.forEach((target) => {
          if (target.position.distanceToSquared(bullet.group.position) < 0.05) {
            this.remove(bullet.group);
            this.bullets.splice(indexBullet, 1);

            target.visible = false;
            setTimeout(() => {
              target.visible = true;
            }, 1000);
          }
        });
      }
    });
  }

  update() {
    this.updateInput();
    this.updateBullets();
  }
}

export { BlasterScene };
