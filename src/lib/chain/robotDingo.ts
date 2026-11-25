import {
  CanvasTexture,
  CapsuleGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  type Object3D,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { lightScene } from "./studio";

interface Options {
  reducedMotion: boolean;
  /** Text printed on the power brick. */
  label: string;
}

/**
 * A robot dingo standing on a power brick, its tail a cable plugged into it.
 * Nothing moves on its own: the head turns toward the pointer and settles.
 */
export function createRobotDingo(canvas: HTMLCanvasElement, options: Options) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.toneMapping = NeutralToneMapping;

  const scene = new Scene();
  const environment = lightScene(renderer, scene, new Color(0xffe2c4), new Color(0xffffff), () =>
    render(),
  );
  scene.environmentIntensity = 0.5;
  const camera = new PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0.5, 2.9, 8.6);
  camera.lookAt(0, 1.62, 0);

  const key = new DirectionalLight(0xffffff, 1.5);
  key.position.set(4, 6, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -1;
  key.shadow.radius = 5;
  scene.add(key);
  const rim = new DirectionalLight(0xffe2c4, 1.4);
  rim.position.set(-5, 3.5, -5);
  scene.add(rim);

  const owned: { dispose(): void }[] = [environment];
  const keep = <T extends { dispose(): void }>(item: T) => {
    owned.push(item);
    return item;
  };
  const gloss = { clearcoat: 1, clearcoatRoughness: 0.08 };
  const shell = keep(new MeshPhysicalMaterial({ color: 0xf08a24, roughness: 0.3, metalness: 0.3, ...gloss }));
  const earShell = keep(new MeshPhysicalMaterial({ color: 0xf08a24, roughness: 0.5, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.3 }));
  const cream = keep(new MeshPhysicalMaterial({ color: 0xf6e7cf, roughness: 0.35, metalness: 0.1, ...gloss }));
  const earInner = keep(new MeshPhysicalMaterial({ color: 0xf6e7cf, roughness: 0.6, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.4 }));
  const dark = keep(new MeshPhysicalMaterial({ color: 0x10181a, roughness: 0.15, metalness: 0.8, ...gloss }));
  const brickFinish = keep(new MeshPhysicalMaterial({ color: 0x1a2325, roughness: 0.35, metalness: 0.6, ...gloss }));
  const white = keep(new MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 }));
  const metal = keep(new MeshPhysicalMaterial({ color: 0xd9dee0, roughness: 0.25, metalness: 1 }));
  // Matte, so no reflections smear across the symbol.
  const buttonFace = keep(new MeshStandardMaterial({ color: 0x0b1113, roughness: 1, metalness: 0, envMapIntensity: 0 }));
  const POWER_ON = 1.7;
  const power = keep(new MeshStandardMaterial({ color: 0x1f6f63, emissive: 0x2fd6bc, emissiveIntensity: POWER_ON }));

  const box = (w: number, h: number, d: number, r: number, material: Material) =>
    new Mesh(keep(new RoundedBoxGeometry(w, h, d, 5, r)), material);
  const ball = (r: number, material: Material) =>
    new Mesh(keep(new SphereGeometry(r, 32, 24)), material);
  const add = <T extends Object3D>(parent: Object3D, mesh: T, x: number, y: number, z: number) => {
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // The brick it stands on.
  const brick = add(scene, box(3, 0.66, 1.7, 0.16, brickFinish), 0, 0.33, 0);
  brick.receiveShadow = true;
  const sign = document.createElement("canvas");
  sign.width = 1024;
  sign.height = 160;
  const signTexture = keep(new CanvasTexture(sign));
  signTexture.colorSpace = SRGBColorSpace;
  function paintSign() {
    const pen = sign.getContext("2d")!;
    pen.clearRect(0, 0, sign.width, sign.height);
    pen.fillStyle = "#eef4f2";
    pen.font = '600 84px "Geist Variable", system-ui, sans-serif';
    pen.textBaseline = "middle";
    pen.fillText(options.label, 40, 84);
    // Charge level, as on a power bank: three of four lights on.
    for (let i = 0; i < 4; i += 1) {
      pen.fillStyle = i < 3 ? "#45e0c8" : "#2c3a42";
      pen.beginPath();
      pen.roundRect(800 + i * 48, 66, 34, 28, 8);
      pen.fill();
    }
    signTexture.needsUpdate = true;
  }
  paintSign();
  const signPlate = new Mesh(
    keep(new PlaneGeometry(2.6, 2.6 * (160 / 1024))),
    keep(new MeshBasicMaterial({ map: signTexture, transparent: true, toneMapped: false })),
  );
  signPlate.position.set(0, 0.33, 0.852);
  scene.add(signPlate);

  const bot = new Group();
  bot.position.set(-0.3, 0.66, 0.05);
  bot.rotation.y = 0.32;
  bot.scale.setScalar(0.9);
  scene.add(bot);

  const bodyGeometry = keep(new RoundedBoxGeometry(1.05, 0.9, 0.95, 5, 0.28));
  add(bot, new Mesh(bodyGeometry, shell), 0, 0.68, 0);
  // Chest plate: a rounded cream panel standing slightly proud of the body.
  add(bot, box(0.68, 0.72, 0.2, 0.09, cream), 0, 0.7, 0.425);
  const leg = keep(new CapsuleGeometry(0.12, 0.16, 6, 16));
  for (const side of [-0.33, 0.33]) {
    add(bot, new Mesh(leg, shell), side, 0.24, 0.3);
    add(bot, new Mesh(leg, shell), side, 0.24, -0.3);
    add(bot, box(0.34, 0.2, 0.46, 0.1, cream), side, 0.09, 0.36);
    add(bot, box(0.36, 0.2, 0.42, 0.1, cream), side, 0.09, -0.28);
  }

  // Power button on the chest.
  const button = new Group();
  button.position.set(0, 0.78, 0.53);
  bot.add(button);
  button.add(new Mesh(keep(new CylinderGeometry(0.15, 0.15, 0.03, 48).rotateX(Math.PI / 2)), buttonFace));
  const ringStart = Math.PI / 2 + Math.PI * 0.28;
  const ringSweep = Math.PI * 1.44;
  const standby = new Mesh(keep(new TorusGeometry(0.07, 0.014, 16, 64, ringSweep).rotateZ(ringStart)), power);
  standby.position.z = 0.018;
  // Round off both ends of the open ring.
  const tip = keep(new SphereGeometry(0.014, 16, 12));
  for (const angle of [ringStart, ringStart + ringSweep]) {
    const end = new Mesh(tip, power);
    end.position.set(Math.cos(angle) * 0.07, Math.sin(angle) * 0.07, 0.018);
    button.add(end);
  }
  const bar = box(0.028, 0.08, 0.028, 0.013, power);
  bar.position.set(0, 0.052, 0.018);
  button.add(standby, bar);
  // A soft halo on the chest plate around the button. Painted, not a light, so
  // it leaves no reflections on the glossy shell.
  const haloCanvas = document.createElement("canvas");
  haloCanvas.width = haloCanvas.height = 128;
  const haloPen = haloCanvas.getContext("2d")!;
  const fade = haloPen.createRadialGradient(64, 64, 20, 64, 64, 64);
  fade.addColorStop(0, "rgba(47, 214, 188, 0.55)");
  fade.addColorStop(1, "rgba(47, 214, 188, 0)");
  haloPen.fillStyle = fade;
  haloPen.fillRect(0, 0, 128, 128);
  const haloFinish = keep(new MeshBasicMaterial({
    map: keep(new CanvasTexture(haloCanvas)),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }));
  const halo = new Mesh(keep(new PlaneGeometry(0.62, 0.62)), haloFinish);
  halo.position.z = -0.002;
  button.add(halo);
  const setPower = (level: number) => {
    power.emissiveIntensity = level;
    haloFinish.opacity = level / POWER_ON;
  };

  add(bot, new Mesh(keep(new CylinderGeometry(0.18, 0.22, 0.2, 24)), cream), 0, 1.18, 0.02);
  const head = new Group();
  head.position.set(0, 1.8, 0.05);
  bot.add(head);
  const headGeometry = keep(new RoundedBoxGeometry(1.5, 1.1, 1.15, 5, 0.36));
  add(head, new Mesh(headGeometry, shell), 0, 0, 0);
  add(head, box(0.6, 0.4, 0.74, 0.18, cream), 0, -0.27, 0.56);
  add(head, ball(0.11, dark), 0, -0.11, 0.93);
  // Cheeks: a soft rounded pad set into each lower corner of the head.
  for (const side of [-1, 1]) {
    const cheek = add(head, ball(0.3, cream), side * 0.55, -0.27, 0.2);
    cheek.scale.set(0.82, 0.95, 1.1);
  }

  // The stripe from the nose up over the head: one solid piece whose
  // underside traces the head's outline, extruded sideways.
  const path: { y: number; z: number; ny: number; nz: number }[] = [];
  for (let i = 0; i <= 8; i++) path.push({ y: -0.14 + (0.33 * i) / 8, z: 0.575, ny: 0, nz: 1 });
  for (let i = 1; i <= 16; i++) {
    const a = (Math.PI / 2) * (i / 16);
    path.push({ y: 0.19 + 0.36 * Math.sin(a), z: 0.215 + 0.36 * Math.cos(a), ny: Math.sin(a), nz: Math.cos(a) });
  }
  for (let i = 1; i <= 8; i++) path.push({ y: 0.55, z: 0.215 - (0.2 * i) / 8, ny: 1, nz: 0 });
  const last = path.length - 1;
  const rise = (i: number) => 0.05 * Math.min(1, (last - i) / 6);
  const profile = new Shape();
  path.forEach((p, i) => {
    const z = p.z + p.nz * rise(i);
    const y = p.y + p.ny * rise(i);
    if (i === 0) profile.moveTo(z, y);
    else profile.lineTo(z, y);
  });
  for (let i = last; i >= 0; i--) profile.lineTo(path[i].z - path[i].nz * 0.04, path[i].y - path[i].ny * 0.04);
  profile.closePath();
  const stripe = keep(new ExtrudeGeometry(profile, { depth: 0.26, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 4, curveSegments: 4 }));
  stripe.rotateY(-Math.PI / 2);
  stripe.translate(0.13, 0, 0);
  head.add(new Mesh(stripe, cream));

  const eye = keep(new SphereGeometry(0.105, 32, 24));
  const glint = keep(new SphereGeometry(0.03, 16, 12));
  const lids: Mesh[] = [];
  const shines: Mesh[] = [];
  for (const side of [-0.3, 0.3]) {
    const pupil = new Mesh(eye, dark);
    pupil.scale.set(1, 1.25, 0.3);
    pupil.position.set(side, 0.1, 0.565);
    const shine = new Mesh(glint, white);
    shine.scale.z = 0.3;
    shine.position.set(side + 0.035, 0.155, 0.6);
    head.add(pupil, shine);
    lids.push(pupil);
    shines.push(shine);
  }
  const earGeometry = keep(new LatheGeometry(
    Array.from({ length: 25 }, (_, i) => {
      const t = i / 24;
      return new Vector2(0.33 * Math.pow(1 - Math.pow(t, 1.7), 0.75), t * 0.64);
    }),
    40,
  ));
  for (const side of [-1, 1]) {
    const ear = new Group();
    ear.position.set(side * 0.36, 0.3, -0.05);
    ear.rotation.z = -side * 0.28;
    const outer = new Mesh(earGeometry, earShell);
    outer.scale.z = 0.6;
    outer.castShadow = true;
    const inner = new Mesh(earGeometry, earInner);
    inner.scale.set(0.62, 0.62, 0.6 * 0.62);
    inner.position.set(0, 0.16, 0.085);
    ear.add(outer, inner);
    head.add(ear);
  }

  // A small pile of chain blocks beside it, in the power light's blue.
  const blockFinish = keep(new MeshPhysicalMaterial({ color: 0x3f9bff, roughness: 0.18, metalness: 0.1, ...gloss }));
  const pile: [number, number, number, number, number][] = [
    [-1.2, 0.13, 0.32, 0.26, 0.2],
    [-1.12, 0.11, 0.62, 0.22, -0.35],
    [-1.19, 0.37, 0.36, 0.22, -0.25],
  ];
  for (const [x, y, z, size, turn] of pile) {
    const block = add(scene, box(size, size, size, size * 0.22, blockFinish), x, 0.66 + y, z);
    block.rotation.y = turn;
    block.castShadow = true;
  }

  // The tail is the power cable: out of the back, a short sag, then into the back of the plug.
  bot.updateMatrixWorld(true);
  const socket = bot.localToWorld(new Vector3(0, 0.78, -0.44));
  const plugAt = new Vector3(1.12, 0.66, 0.3);
  const route = new CatmullRomCurve3([
    socket,
    socket.clone().add(new Vector3(0.03, -0.03, -0.16)),
    new Vector3(0.5, 0.82, -0.36),
    new Vector3(0.92, 0.76, -0.12),
    plugAt.clone().add(new Vector3(0, 0.14, -0.08)),
  ]);
  const cable = new Mesh(keep(new TubeGeometry(route, 160, 0.04, 12)), dark);
  cable.castShadow = true;
  scene.add(cable);
  add(scene, box(0.24, 0.26, 0.18, 0.05, shell), plugAt.x, plugAt.y + 0.14, plugAt.z);
  add(scene, box(0.03, 0.08, 0.1, 0.01, metal), plugAt.x - 0.05, plugAt.y + 0.01, plugAt.z);
  add(scene, box(0.03, 0.08, 0.1, 0.01, metal), plugAt.x + 0.05, plugAt.y + 0.01, plugAt.z);

  // Shadows only change when the head moves, so the flicker repaints without them.
  renderer.shadowMap.autoUpdate = false;
  function render(shadows = true) {
    renderer.shadowMap.needsUpdate = shadows;
    renderer.render(scene, camera);
  }
  function frame() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }

  // The head turns toward the pointer, then comes to rest. No idle loop.
  const aim = { x: -0.28, y: 0 };
  let raf = 0;
  function tick() {
    const dx = aim.x - head.rotation.y;
    const dy = aim.y - head.rotation.x;
    head.rotation.y += dx * 0.12;
    head.rotation.x += dy * 0.12;
    render();
    raf = Math.abs(dx) + Math.abs(dy) > 0.002 ? requestAnimationFrame(tick) : 0;
  }
  function onMove(event: PointerEvent) {
    if (asleep) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - (rect.left + rect.width / 2)) / window.innerWidth;
    const y = (event.clientY - (rect.top + rect.height / 2)) / window.innerHeight;
    aim.x = Math.max(-0.75, Math.min(0.45, x * 1.1 - 0.28));
    aim.y = Math.max(-0.3, Math.min(0.2, y * 0.5));
    if (!raf) raf = requestAnimationFrame(tick);
  }
  // The power light holds steady, then stutters a few times like a tired LED.
  let flickerTimer = 0;
  let dips = 0;
  function flicker() {
    let wait: number;
    if (dips > 0) {
      const dim = power.emissiveIntensity === POWER_ON;
      setPower(dim ? 0.1 + Math.random() * 0.3 : POWER_ON);
      if (!dim) dips -= 1;
      wait = 50 + Math.random() * 90;
    } else {
      dips = 2 + Math.floor(Math.random() * 3);
      wait = 1400 + Math.random() * 2600;
    }
    if (!document.hidden && !raf) render(false);
    flickerTimer = window.setTimeout(flicker, wait);
  }
  function startFlicker() {
    window.clearTimeout(flickerTimer);
    dips = 0;
    if (!options.reducedMotion) flickerTimer = window.setTimeout(flicker, 1200);
  }
  startFlicker();

  // Pressing the chest button powers it down: light off, eyes shut, head lowered.
  let asleep = false;
  const buttonAt = new Vector3();
  function overButton(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    button.getWorldPosition(buttonAt).project(camera);
    const x = rect.left + ((buttonAt.x + 1) / 2) * rect.width;
    const y = rect.top + ((1 - buttonAt.y) / 2) * rect.height;
    return Math.hypot(event.clientX - x, event.clientY - y) < 16;
  }
  function onPress(event: MouseEvent) {
    if (!overButton(event)) return;
    asleep = !asleep;
    for (const lid of lids) lid.scale.y = asleep ? 0.16 : 1.25;
    for (const shine of shines) shine.visible = !asleep;
    if (asleep) {
      window.clearTimeout(flickerTimer);
      setPower(0.04);
      aim.x = 0;
      aim.y = 0.52;
    } else {
      setPower(POWER_ON);
      aim.x = -0.28;
      aim.y = 0;
      startFlicker();
    }
    if (options.reducedMotion) {
      head.rotation.set(aim.y, aim.x, 0);
      render();
    } else if (!raf) raf = requestAnimationFrame(tick);
  }
  function onHover(event: MouseEvent) {
    canvas.style.cursor = overButton(event) ? "pointer" : "";
  }
  canvas.addEventListener("click", onPress);
  canvas.addEventListener("mousemove", onHover);
  head.rotation.y = aim.x;
  if (!options.reducedMotion) window.addEventListener("pointermove", onMove, { passive: true });
  const resize = new ResizeObserver(frame);
  resize.observe(canvas);
  // Repaint the label once the interface font has loaded.
  void document.fonts.ready.then(() => {
    paintSign();
    render();
  });

  return {
    dispose() {
      cancelAnimationFrame(raf);
      window.clearTimeout(flickerTimer);
      canvas.removeEventListener("click", onPress);
      canvas.removeEventListener("mousemove", onHover);
      resize.disconnect();
      window.removeEventListener("pointermove", onMove);
      for (const item of owned) item.dispose();
      renderer.dispose();
    },
  };
}
