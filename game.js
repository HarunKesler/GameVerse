
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const container = document.querySelector('#game-container');

container.innerHTML = `
  <div id="game-ui">
    <div id="game-info">BLOCK WORLD <span id="block-count">0 blok</span></div>
    <div id="crosshair">+</div>
    <div id="game-message">Yükleniyor...</div>
    <div id="mobile-controls">
      <div class="move-pad">
        <button data-move="forward">▲</button>
        <div>
          <button data-move="left">◀</button>
          <button data-move="backward">▼</button>
          <button data-move="right">▶</button>
        </div>
      </div>
      <div class="action-pad">
        <button id="break-button">KIR</button>
        <button id="place-button">KOY</button>
      </div>
    </div>
    <div id="desktop-help">WASD: Hareket | Fare: Bak | Sol tık: Kır | Sağ tık: Koy</div>
  </div>
`;

const style = document.createElement('style');
style.textContent = `
  #game-container { position:relative; height: min(70vh, 620px); min-height:420px; background:#87ceeb; overflow:hidden; touch-action:none; }
  #game-container canvas { display:block; width:100%; height:100%; touch-action:none; }
  #game-ui { position:absolute; inset:0; pointer-events:none; color:white; font-family:Arial,sans-serif; }
  #game-info { position:absolute; top:12px; left:12px; right:12px; display:flex; justify-content:space-between; font-weight:bold; text-shadow:0 2px 5px #000; }
  #crosshair { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:27px; text-shadow:0 1px 4px black; }
  #game-message { position:absolute; top:48px; left:50%; transform:translateX(-50%); font-size:13px; text-shadow:0 2px 5px black; }
  #desktop-help { position:absolute; bottom:12px; left:12px; font-size:11px; text-shadow:0 2px 5px black; }
  #mobile-controls { display:none; position:absolute; inset:0; align-items:flex-end; justify-content:space-between; padding:15px; }
  #mobile-controls button { pointer-events:auto; border:1px solid #fff8; background:#32105dcc; color:white; border-radius:12px; min-width:48px; min-height:48px; font-weight:bold; touch-action:none; }
  .move-pad { display:flex; flex-direction:column; gap:5px; align-items:center; }
  .move-pad div { display:flex; gap:5px; }
  .action-pad { display:flex; gap:8px; }
  #game-ui button:active { background:#a855f7; }
  @media (pointer:coarse) {
    #mobile-controls { display:flex; }
    #desktop-help { display:none; }
  }
`;
document.head.appendChild(style);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 18, 45);

const camera = new THREE.PerspectiveCamera(
  75, container.clientWidth / container.clientHeight, 0.1, 100
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
container.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x667755, 2));

const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(10, 20, 10);
sunlight.castShadow = true;
scene.add(sunlight);

const materials = {
  grass: new THREE.MeshLambertMaterial({ color: 0x58a83d }),
  dirt: new THREE.MeshLambertMaterial({ color: 0x80502d }),
  stone: new THREE.MeshLambertMaterial({ color: 0x888888 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x80502d }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x287b36 })
};

const geometry = new THREE.BoxGeometry(1, 1, 1);
const blocks = new Map();

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function addBlock(x, y, z, type = 'grass') {
  const id = key(x, y, z);
  if (blocks.has(id)) return;

  const mesh = new THREE.Mesh(geometry, materials[type] || materials.grass);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { x, y, z, type };
  scene.add(mesh);
  blocks.set(id, mesh);

  updateCount();
}

function removeBlock(mesh) {
  const { x, y, z } = mesh.userData;
  scene.remove(mesh);
  blocks.delete(key(x, y, z));
  updateCount();
}

function updateCount() {
  document.querySelector('#block-count').textContent =
    `${blocks.size} blok`;
}

// Dünya oluştur
for (let x = -12; x <= 12; x++) {
  for (let z = -12; z <= 12; z++) {
    addBlock(x, 0, z, 'grass');
    addBlock(x, -1, z, 'dirt');

    if (Math.random() < 0.035) {
      addBlock(x, 1, z, 'stone');
    }
  }
}

// Ağaçlar
function makeTree(x, z) {
  for (let y = 1; y <= 3; y++) addBlock(x, y, z, 'wood');

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let y = 3; y <= 4; y++) {
        addBlock(x + dx, y, z + dz, 'leaves');
      }
    }
  }
}

makeTree(-5, -5);
makeTree(6, -4);
makeTree(4, 7);
makeTree(-8, 6);

// Oyuncu
let yaw = 0;
let pitch = 0;
const player = new THREE.Vector3(0, 2.5, 5);
const direction = new THREE.Vector3();

camera.position.copy(player);

function updateCamera() {
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}
updateCamera();

const keys = {};
const movement = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

window.addEventListener('keydown', e => {
  keys[e.code] = true;
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

// Bilgisayar fare kontrolü
renderer.domElement.addEventListener('click', () => {
  if (matchMedia('(pointer:fine)').matches) {
    renderer.domElement.requestPointerLock?.();
  }
});

document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement) return;

  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = THREE.MathUtils.clamp(pitch, -1.5, 1.5);
  updateCamera();
});

renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

renderer.domElement.addEventListener('mousedown', e => {
  if (e.button === 0) breakBlock();
  if (e.button === 2) placeBlock();
});

// Telefon ekranında sürükleyerek bak
let touchX = 0;
let touchY = 0;
let looking = false;

renderer.domElement.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') {
    looking = true;
    touchX = e.clientX;
    touchY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  }
});

renderer.domElement.addEventListener('pointermove', e => {
  if (!looking || e.pointerType !== 'touch') return;

  const dx = e.clientX - touchX;
  const dy = e.clientY - touchY;

  yaw -= dx * 0.006;
  pitch -= dy * 0.006;
  pitch = THREE.MathUtils.clamp(pitch, -1.5, 1.5);

  touchX = e.clientX;
  touchY = e.clientY;
  updateCamera();
});

renderer.domElement.addEventListener('pointerup', () => {
  looking = false;
});

// Mobil hareket butonları
document.querySelectorAll('[data-move]').forEach(button => {
  const name = button.dataset.move;

  button.addEventListener('pointerdown', e => {
    e.preventDefault();
    movement[name] = true;
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(event => {
    button.addEventListener(event, () => movement[name] = false);
  });
});

// Blok seçme ve işlem
const raycaster = new THREE.Raycaster();
raycaster.far = 6;

function getTarget() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects([...blocks.values()]);
  return hits[0] || null;
}

function breakBlock() {
  const hit = getTarget();
  if (!hit) return;

  if (hit.object.position.y <= -1) return;
  removeBlock(hit.object);
}

function placeBlock() {
  const hit = getTarget();
  if (!hit || !hit.face) return;

  const normal = hit.face.normal.clone();
  normal.transformDirection(hit.object.matrixWorld);

  const p = hit.object.position.clone().add(normal);
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const z = Math.round(p.z);

  if (Math.abs(x - player.x) < 1 &&
      Math.abs(z - player.z) < 1 &&
      Math.abs(y - player.y) < 2) return;

  addBlock(x, y, z, 'grass');
}

document.querySelector('#break-button').addEventListener('click', breakBlock);
document.querySelector('#place-button').addEventListener('click', placeBlock);

// Hareket
function movePlayer(delta) {
  const speed = 5 * delta;

  direction.set(0, 0, 0);

  if (keys.KeyW || movement.forward) direction.z -= 1;
  if (keys.KeyS || movement.backward) direction.z += 1;
  if (keys.KeyA || movement.left) direction.x -= 1;
  if (keys.KeyD || movement.right) direction.x += 1;

  if (direction.lengthSq() > 0) {
    direction.normalize();

    const dx = direction.x * Math.cos(yaw) +
               direction.z * Math.sin(yaw);
    const dz = -direction.x * Math.sin(yaw) +
                direction.z * Math.cos(yaw);

    player.x += dx * speed;
    player.z += dz * speed;
  }

  // Basit zemin yüksekliği
  player.y = 2.5;
  camera.position.copy(player);
}

// Ekran boyutu
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// Oyun döngüsü
let previousTime = 0;

function animate(time) {
  requestAnimationFrame(animate);

  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;

  movePlayer(delta);
  renderer.render(scene, camera);
}

document.querySelector('#game-message').textContent =
  'Dünyaya hoş geldin!';

requestAnimationFrame(animate);
