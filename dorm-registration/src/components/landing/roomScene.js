// ห้องพักตัวอย่างแบบ 3 มิติ (สร้างจากโค้ดทั้งหมด ไม่ใช้ไฟล์โมเดล) — ห้อง 4 เตียง ขนาด 6 × 4.6 ม.
// แบบบ้านตุ๊กตา: ผนังฝั่งที่บังกล้องจะจางหายเอง จึงหมุนดูได้ทุกมุม
// ใช้ผ่าน Room3DSection.jsx: setProgress(0–1) จากการเลื่อนหน้าจอ → กล้องหมุนรอบห้อง 1 รอบ
import * as THREE from 'three'

const W = 6 // กว้าง (แกน x)
const D = 4.6 // ลึก (แกน z)
const H = 2.8 // สูง
const T = 0.12 // ความหนาผนัง

const COLOR = {
  oak: 0xd4b895,
  oakDark: 0xa98760,
  wall: 0xf4eee5,
  wallAccent: 0xe9dccb,
  terracotta: 0xc86d51,
  charcoal: 0x3d332a,
  linen: 0xfaf7f2,
  sand: 0xefe7da,
  sage: 0x8f9f80,
  metal: 0x5c544c,
  white: 0xffffff,
  leaf: 0x5f7d4f,
}

const materials = new Map()
function mat(color, opts = {}) {
  const key = `${color}|${JSON.stringify(opts)}`
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...opts }))
  return materials.get(key)
}

// กล่องที่วางจากพื้น: (x, z) คือจุดกึ่งกลาง, y คือความสูงของฐาน
function block(parent, w, h, d, x, y, z, material, { cast = true } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y + h / 2, z)
  mesh.castShadow = cast
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function cylinder(parent, rTop, rBottom, h, x, y, z, material, segments = 24) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material)
  mesh.position.set(x, y + h / 2, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  draw(canvas.getContext('2d'), width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

// พื้นไม้ลายแผ่น
function plankTexture() {
  const tones = ['#d8bd99', '#cfb28c', '#dcc4a3', '#c9ab84', '#d4b895']
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    const rows = 10
    const rowH = h / rows
    for (let r = 0; r < rows; r++) {
      let x = -((r * 173) % 300)
      while (x < w) {
        const len = 280 + ((r * 97 + x) % 220)
        ctx.fillStyle = tones[(r * 7 + Math.floor(x)) % tones.length]
        ctx.fillRect(x, r * rowH, len, rowH)
        ctx.fillStyle = 'rgba(80,60,40,0.35)'
        ctx.fillRect(x, r * rowH, 2, rowH)
        x += len
      }
      ctx.fillStyle = 'rgba(80,60,40,0.4)'
      ctx.fillRect(0, r * rowH, w, 2)
    }
  })
}

function skyTexture() {
  return canvasTexture(64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#9cc7e3')
    g.addColorStop(0.65, '#dcebf2')
    g.addColorStop(1, '#f6e3c8')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
}

// ---------- ผนัง ----------
// group: แกน x ตามแนวผนัง, y ขึ้น, +z ชี้เข้าห้อง (ผิวผนังด้านในอยู่ที่ z = 0)
function makeWall(width, color, holes = []) {
  const group = new THREE.Group()
  const shape = new THREE.Shape()
  shape.moveTo(-width / 2, 0)
  shape.lineTo(width / 2, 0)
  shape.lineTo(width / 2, H)
  shape.lineTo(-width / 2, H)
  shape.lineTo(-width / 2, 0)
  for (const { x, y, w, h } of holes) {
    const hole = new THREE.Path()
    hole.moveTo(x - w / 2, y)
    hole.lineTo(x - w / 2, y + h)
    hole.lineTo(x + w / 2, y + h)
    hole.lineTo(x + w / 2, y)
    hole.lineTo(x - w / 2, y)
    shape.holes.push(hole)
  }
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false }), mat(color))
  wall.position.z = -T
  wall.receiveShadow = true
  group.add(wall)
  // บัวพื้น
  block(group, width, 0.08, 0.015, 0, 0, 0.008, mat(COLOR.oakDark), { cast: false })
  return group
}

function bookRow(parent, x0, y, z, count, maxWidth) {
  const colors = [COLOR.terracotta, COLOR.sage, COLOR.charcoal, COLOR.sand, COLOR.oakDark]
  let x = x0
  for (let i = 0; i < count && x < x0 + maxWidth; i++) {
    const w = 0.035 + ((i * 13) % 4) * 0.008
    const h = 0.16 + ((i * 7) % 5) * 0.015
    block(parent, w, h, 0.14, x + w / 2, y, z, mat(colors[i % colors.length]))
    x += w + 0.004
  }
}

function plant(parent, x, z, scale = 1) {
  const g = new THREE.Group()
  cylinder(g, 0.16, 0.12, 0.32, 0, 0, 0, mat(COLOR.terracotta))
  const leaf = mat(COLOR.leaf, { roughness: 0.9 })
  ;[[0, 0.62, 0, 0.26], [0.13, 0.5, 0.06, 0.18], [-0.12, 0.52, -0.05, 0.19], [0.02, 0.82, -0.04, 0.17]].forEach(([lx, ly, lz, r]) => {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaf)
    s.position.set(lx, ly, lz)
    s.castShadow = true
    g.add(s)
  })
  g.scale.setScalar(scale)
  g.position.set(x, 0, z)
  parent.add(g)
}

// ---------- เฟอร์นิเจอร์ ----------
// เตียง 2 ชั้น: ยาว 2 ม. ตามแกน x, ด้านหน้า (บันได) หันไปทาง +z
function bunkBed(parent, x, z, ladderX, blankets) {
  const g = new THREE.Group()
  const wood = mat(COLOR.oak)
  for (const px of [-0.98, 0.98]) for (const pz of [-0.45, 0.45]) block(g, 0.07, 1.85, 0.07, px, 0, pz, wood)
  ;[0.25, 1.3].forEach((y, level) => {
    for (const pz of [-0.45, 0.45]) block(g, 1.96, 0.12, 0.05, 0, y, pz, wood)
    for (const px of [-0.98, 0.98]) block(g, 0.05, 0.36, 0.9, px, y, 0, wood)
    block(g, 1.9, 0.03, 0.85, 0, y + 0.05, 0, mat(COLOR.oakDark))
    block(g, 1.9, 0.16, 0.85, 0, y + 0.08, 0, mat(COLOR.linen))
    block(g, 1.25, 0.05, 0.88, 0.3, y + 0.23, 0, mat(blankets[level]))
    block(g, 0.42, 0.1, 0.62, -0.68, y + 0.24, 0, mat(COLOR.white))
  })
  // ราวกันตกชั้นบน
  block(g, 1.3, 0.05, 0.04, 0.3, 1.72, 0.45, wood)
  block(g, 1.96, 0.05, 0.04, 0, 1.72, -0.45, wood)
  // บันได
  for (const lx of [-0.18, 0.18]) block(g, 0.04, 1.6, 0.04, ladderX + lx, 0, 0.5, wood)
  for (let i = 1; i <= 4; i++) block(g, 0.36, 0.03, 0.04, ladderX, i * 0.32, 0.5, wood)
  g.position.set(x, 0, z)
  parent.add(g)
}

// โต๊ะอ่านหนังสือ + เก้าอี้: ขอบหลังโต๊ะชิดผนังที่ z = 0, หันเข้าห้อง (+z)
function studyDesk(parent, position, rotationY, seatColor) {
  const g = new THREE.Group()
  const wood = mat(COLOR.oak)
  const dark = mat(COLOR.charcoal)
  block(g, 1.2, 0.04, 0.6, 0, 0.72, 0.3, wood)
  for (const lx of [-0.57, 0.57]) for (const lz of [0.04, 0.56]) block(g, 0.04, 0.72, 0.04, lx, 0, lz, dark)
  block(g, 0.4, 0.5, 0.55, 0.36, 0.08, 0.3, wood)
  block(g, 0.36, 0.01, 0.01, 0.36, 0.4, 0.58, dark)
  // โคมไฟ
  cylinder(g, 0.07, 0.08, 0.02, -0.42, 0.76, 0.12, dark)
  const arm = cylinder(g, 0.01, 0.01, 0.38, -0.42, 0.78, 0.12, dark, 8)
  arm.rotation.z = 0.25
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 20, 1, true), mat(COLOR.terracotta, { side: THREE.DoubleSide }))
  shade.position.set(-0.36, 1.14, 0.16)
  shade.castShadow = true
  g.add(shade)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffd99a, emissiveIntensity: 1.6 }))
  bulb.position.set(-0.36, 1.08, 0.16)
  g.add(bulb)
  // แล็ปท็อป
  block(g, 0.34, 0.015, 0.23, 0, 0.76, 0.32, dark)
  const screen = block(g, 0.34, 0.22, 0.012, 0, 0.775, 0.205, dark)
  screen.rotation.x = -0.25
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.18), new THREE.MeshStandardMaterial({ color: 0x9ec1d9, emissive: 0x6c94b3, emissiveIntensity: 0.5 }))
  display.position.set(0, 0.885, 0.217)
  display.rotation.x = -0.25
  g.add(display)
  bookRow(g, 0.24, 0.76, 0.12, 5, 0.3)
  cylinder(g, 0.04, 0.035, 0.09, 0.25, 0.76, 0.42, mat(COLOR.white))
  // เก้าอี้
  const chair = new THREE.Group()
  block(chair, 0.46, 0.06, 0.46, 0, 0.44, 0, mat(seatColor))
  block(chair, 0.46, 0.42, 0.05, 0, 0.52, 0.23, mat(seatColor))
  for (const cx of [-0.2, 0.2]) for (const cz of [-0.2, 0.2]) block(chair, 0.035, 0.44, 0.035, cx, 0, cz, dark)
  chair.position.set(-0.05, 0, 0.82)
  chair.rotation.y = 0.12
  g.add(chair)
  g.position.copy(position)
  g.rotation.y = rotationY
  parent.add(g)
}

// ตู้เสื้อผ้าแยก 4 บาน ชิดผนังด้านหน้า (ฝั่ง +z) — ด้านหน้าตู้หันไปทาง -z
function wardrobes(parent, x0, x1, zBack) {
  const width = x1 - x0
  const depth = 0.6
  const zFront = zBack - depth
  block(parent, width, 2.2, depth, (x0 + x1) / 2, 0, zBack - depth / 2, mat(COLOR.oak))
  block(parent, width, 0.06, depth + 0.02, (x0 + x1) / 2, 0, zBack - depth / 2, mat(COLOR.charcoal))
  const doors = 4
  for (let i = 1; i < doors; i++) block(parent, 0.012, 2.1, 0.01, x0 + (width / doors) * i, 0.06, zFront - 0.005, mat(COLOR.charcoal))
  for (let i = 0; i < doors; i++) {
    const cx = x0 + (width / doors) * (i + 0.5) + (i % 2 ? -0.22 : 0.22)
    block(parent, 0.02, 0.3, 0.025, cx, 1.0, zFront - 0.015, mat(COLOR.metal, { metalness: 0.6, roughness: 0.4 }))
  }
}

function buildRoom() {
  const room = new THREE.Group()

  // ฐานแบบโมเดลจำลอง + พื้นไม้
  block(room, W + 0.5, 0.3, D + 0.5, 0, -0.3, 0, mat(COLOR.charcoal))
  const floorTex = plankTexture()
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping
  floorTex.repeat.set(1.6, 1.2)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.24, D + 0.24), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.001
  floor.receiveShadow = true
  room.add(floor)

  // พรม + บีนแบ็ก
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.15, 48), mat(0xd9a48e, { roughness: 1 }))
  rug.rotation.x = -Math.PI / 2
  rug.position.set(0, 0.006, 0.25)
  rug.receiveShadow = true
  room.add(rug)
  const beanbag = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 16), mat(COLOR.sand, { roughness: 1 }))
  beanbag.scale.set(1, 0.62, 1)
  beanbag.position.set(0.55, 0.23, 0.55)
  beanbag.castShadow = true
  room.add(beanbag)

  // ---------- ผนัง 4 ด้าน (เก็บไว้สำหรับซ่อนเมื่อบังกล้อง) ----------
  const walls = []
  const addWall = (group, position, rotationY, normal) => {
    group.position.copy(position)
    group.rotation.y = rotationY
    room.add(group)
    walls.push({ group, position, normal, opacity: 1 })
  }

  // ผนังหลัง (z−): หน้าต่างบานใหญ่ — แกน x ของผนัง = x ของห้อง
  const back = makeWall(W + 2 * T, COLOR.wallAccent, [{ x: 0, y: 0.9, w: 1.4, h: 1.4 }])
  const frame = mat(COLOR.oakDark)
  block(back, 1.52, 0.06, T + 0.04, 0, 0.84, -T / 2, frame)
  block(back, 1.52, 0.06, T + 0.04, 0, 2.3, -T / 2, frame)
  for (const fx of [-0.73, 0, 0.73]) block(back, 0.06, 1.4, T + 0.04, fx, 0.9, -T / 2, frame)
  block(back, 1.6, 0.04, 0.24, 0, 0.86, 0.08, mat(COLOR.oak))
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshStandardMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.22, roughness: 0.05 }))
  glass.position.set(0, 1.6, -T / 2)
  back.add(glass)
  // ท้องฟ้านอกหน้าต่าง: ต่ำกว่าขอบผนังและชิดผนัง จึงไม่โผล่พ้นผนังเมื่อมองจากด้านบน
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.7), new THREE.MeshBasicMaterial({ map: skyTexture() }))
  sky.position.set(0, 1.6, -T - 0.25)
  back.add(sky)
  const rod = cylinder(back, 0.015, 0.015, 2.3, 0, 0, 0, mat(COLOR.metal))
  rod.rotation.z = Math.PI / 2
  rod.position.set(0, 2.45, 0.14)
  for (const cx of [-0.95, 0.95]) block(back, 0.34, 1.65, 0.06, cx, 0.78, 0.14, mat(COLOR.linen, { roughness: 1 }))
  addWall(back, new THREE.Vector3(0, 0, -D / 2), 0, new THREE.Vector3(0, 0, 1))

  // ผนังหน้า (z+): ประตูเข้าห้อง — แกน x ของผนัง = −x ของห้อง
  const front = makeWall(W + 2 * T, COLOR.wall, [{ x: -2.0, y: 0, w: 0.92, h: 2.1 }])
  block(front, 0.88, 2.08, 0.05, -2.0, 0, -T / 2, mat(COLOR.oakDark))
  block(front, 1.04, 0.07, 0.03, -2.0, 2.1, 0.015, mat(COLOR.oak))
  for (const fx of [-2.49, -1.51]) block(front, 0.07, 2.17, 0.03, fx, 0, 0.015, mat(COLOR.oak))
  cylinder(front, 0.025, 0.025, 0.05, -1.68, 1.0, -0.02, mat(COLOR.metal, { metalness: 0.7, roughness: 0.3 }))
  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 32), mat(COLOR.linen))
  clock.rotation.x = Math.PI / 2
  clock.position.set(-0.55, 2.3, 0.02)
  front.add(clock)
  block(front, 0.015, 0.12, 0.01, -0.55, 2.3, 0.04, mat(COLOR.charcoal))
  block(front, 0.09, 0.012, 0.01, -0.51, 2.3, 0.04, mat(COLOR.charcoal))
  addWall(front, new THREE.Vector3(0, 0, D / 2), Math.PI, new THREE.Vector3(0, 0, -1))

  // ผนังซ้าย (x−): ชั้นวางหนังสือเหนือโต๊ะ — แกน x ของผนัง = −z ของห้อง
  const left = makeWall(D, COLOR.wall)
  for (const sx of [0.55, -0.7]) {
    block(left, 0.95, 0.03, 0.22, sx, 1.5, 0.11, mat(COLOR.oak))
    bookRow(left, sx - 0.42, 1.53, 0.1, 9, 0.6)
  }
  // กรอบรูประหว่างชั้นวาง
  block(left, 0.62, 0.44, 0.03, -0.08, 1.85, 0.015, mat(COLOR.oakDark))
  block(left, 0.54, 0.36, 0.01, -0.08, 1.89, 0.035, mat(0xd9a48e, { roughness: 1 }))
  addWall(left, new THREE.Vector3(-W / 2, 0, 0), Math.PI / 2, new THREE.Vector3(1, 0, 0))

  // ผนังขวา (x+): แอร์ + ชั้นวาง + กระจก — แกน x ของผนัง = z ของห้อง
  const right = makeWall(D, COLOR.wall)
  block(right, 0.95, 0.3, 0.22, 0.05, 2.25, 0.11, mat(COLOR.white))
  block(right, 0.85, 0.02, 0.01, 0.05, 2.3, 0.225, mat(0xc9c2b8))
  for (const sx of [-0.55, 0.7]) {
    block(right, 0.95, 0.03, 0.22, sx, 1.5, 0.11, mat(COLOR.oak))
    bookRow(right, sx - 0.4, 1.53, 0.1, 8, 0.55)
  }
  block(right, 0.46, 1.36, 0.03, 1.8, 0.55, 0.015, mat(COLOR.oakDark))
  block(right, 0.4, 1.3, 0.01, 1.8, 0.58, 0.035, new THREE.MeshStandardMaterial({ color: 0xd3e2e8, metalness: 0.1, roughness: 0.12 }))
  addWall(right, new THREE.Vector3(W / 2, 0, 0), -Math.PI / 2, new THREE.Vector3(-1, 0, 0))

  // ---------- เฟอร์นิเจอร์ในห้อง ----------
  bunkBed(room, -1.95, -D / 2 + 0.5, 0.75, [COLOR.terracotta, COLOR.sage])
  bunkBed(room, 1.95, -D / 2 + 0.5, -0.75, [COLOR.sand, COLOR.charcoal])
  plant(room, 0, -D / 2 + 0.35, 0.85)

  studyDesk(room, new THREE.Vector3(-W / 2, 0, -0.55), Math.PI / 2, COLOR.terracotta)
  studyDesk(room, new THREE.Vector3(-W / 2, 0, 0.7), Math.PI / 2, COLOR.sage)
  studyDesk(room, new THREE.Vector3(W / 2, 0, -0.55), -Math.PI / 2, COLOR.charcoal)
  studyDesk(room, new THREE.Vector3(W / 2, 0, 0.7), -Math.PI / 2, COLOR.sand)

  wardrobes(room, -W / 2 + 0.05, -0.55, D / 2)
  // ตู้เย็นเล็ก + ต้นไม้ข้างประตู
  block(room, 0.5, 0.85, 0.5, 0.95, 0, D / 2 - 0.28, mat(COLOR.white, { roughness: 0.4 }))
  block(room, 0.02, 0.25, 0.02, 0.75, 0.5, D / 2 - 0.54, mat(COLOR.metal))
  plant(room, 0.15, D / 2 - 0.3, 1.25)

  return { room, walls }
}

export function createRoomScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  const target = new THREE.Vector3(0, 0.75, 0)

  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x8a7a68, 1.6))
  const sun = new THREE.DirectionalLight(0xffeedd, 2.2)
  sun.position.set(5, 9, 4)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -6
  sun.shadow.camera.right = 6
  sun.shadow.camera.top = 6
  sun.shadow.camera.bottom = -6
  sun.shadow.bias = -0.0004
  sun.shadow.radius = 4
  scene.add(sun)
  const warm = new THREE.PointLight(0xffd9a8, 6, 8, 2)
  warm.position.set(0, 2.5, 0.3)
  scene.add(warm)

  // เงาตกบนพื้นรอบโมเดล
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.12 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.3
  ground.receiveShadow = true
  scene.add(ground)

  const { room, walls } = buildRoom()
  scene.add(room)
  // ผนังแต่ละด้านใช้วัสดุของตัวเอง เพื่อจางหายแยกกันได้
  for (const wall of walls) {
    wall.materials = []
    wall.group.traverse((obj) => {
      if (!obj.isMesh) return
      obj.material = obj.material.clone()
      obj.material.transparent = true
      obj.castShadow = false
      wall.materials.push(obj.material)
    })
  }

  const START = Math.PI / 4 // เริ่มมองจากมุมหน้า-ขวา
  let angle = START
  let targetAngle = START
  let radius = 11
  let running = false
  let frame = 0
  let dirty = true

  function placeCamera() {
    camera.position.set(Math.sin(angle) * radius, radius * 0.62, Math.cos(angle) * radius)
    camera.lookAt(target)
  }

  // ผนังที่อยู่ระหว่างกล้องกับห้อง → จางหาย / ผนังอื่นค่อย ๆ กลับมา
  const toCamera = new THREE.Vector3()
  function updateWalls() {
    let changed = false
    for (const wall of walls) {
      toCamera.copy(camera.position).sub(wall.position).setY(0).normalize()
      const want = toCamera.dot(wall.normal) < -0.15 ? 0 : 1
      if (Math.abs(wall.opacity - want) > 0.005) {
        wall.opacity += (want - wall.opacity) * 0.18
        changed = true
      } else wall.opacity = want
      for (const m of wall.materials) {
        m.opacity = wall.opacity * (m.userData.baseOpacity ??= m.opacity || 1)
        m.depthWrite = wall.opacity > 0.98
      }
      wall.group.visible = wall.opacity > 0.01
    }
    return changed
  }

  function tick() {
    if (!running) return
    frame = requestAnimationFrame(tick)
    const diff = targetAngle - angle
    const moving = Math.abs(diff) > 0.0005
    if (moving) angle += diff * 0.09
    if (!moving && !dirty) return
    placeCamera()
    const fading = updateWalls()
    dirty = fading
    renderer.render(scene, camera)
  }

  placeCamera()
  updateWalls()

  return {
    setProgress(p) {
      targetAngle = START + Math.min(Math.max(p, 0), 1) * Math.PI * 2
    },
    resize(width, height) {
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      // จอแนวตั้ง (มือถือ) ถอยกล้องออกให้เห็นทั้งห้อง
      radius = 11.5 * Math.max(1, 0.95 / camera.aspect)
      camera.updateProjectionMatrix()
      dirty = true
      if (!running) {
        placeCamera()
        updateWalls()
        renderer.render(scene, camera)
      }
    },
    start() {
      if (running) return
      running = true
      dirty = true
      frame = requestAnimationFrame(tick)
    },
    stop() {
      running = false
      cancelAnimationFrame(frame)
    },
    dispose() {
      this.stop()
      scene.traverse((obj) => {
        obj.geometry?.dispose()
        const list = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []
        list.forEach((m) => {
          m.map?.dispose()
          m.dispose()
        })
      })
      materials.clear()
      renderer.dispose()
    },
  }
}
