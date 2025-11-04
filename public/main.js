import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ルート要素
const container = document.getElementById('app')

// シーン
const scene = new THREE.Scene()
scene.background = null // CSSの背景グラデを活かす

// ライト
const ambient = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambient)

const dir = new THREE.DirectionalLight(0xffffff, 1.0)
dir.position.set(3, 4, 5)
scene.add(dir)

// トーラス（ドーナツ）
const params = { radius: 1.2, tube: 0.45, radialSegments: 128, tubularSegments: 256 }
const geometry = new THREE.TorusGeometry(params.radius, params.tube, params.radialSegments, params.tubularSegments)
const material = new THREE.MeshStandardMaterial({
  color: 0x4fb6ff,
  roughness: 0.2,
  metalness: 0.7,
  envMapIntensity: 1.0
})
const torus = new THREE.Mesh(geometry, material)
scene.add(torus)

// カメラ
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
camera.position.set(2.8, 1.8, 3.2)
scene.add(camera)

// レンダラ
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
container.appendChild(renderer.domElement)

// マウス操作（OrbitControls）
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.minDistance = 1.5
controls.maxDistance = 8
controls.enablePan = true

// リサイズ対応
function resize() {
  const w = container.clientWidth
  const h = container.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
}
window.addEventListener('resize', resize)
resize()

// 無操作時のゆるやかな回転
let autoRotate = true
document.addEventListener('pointerdown', () => (autoRotate = false), { passive: true })

function animate() {
  requestAnimationFrame(animate)
  if (autoRotate) {
    torus.rotation.y += 0.003
    torus.rotation.x += 0.0015
  }
  controls.update()
  renderer.render(scene, camera)
}
animate()

// --- Minimal Test Harness (手元診断用) ---
const logEl = document.getElementById('test-log')
const results = []
function check(name, fn) {
  try {
    const ok = !!fn()
    results.push({ name, ok })
  } catch (e) {
    results.push({ name, ok: false, err: e })
  }
}

// テストケース
check('THREE loaded', () => typeof THREE.Scene === 'function')
check('Renderer attached to DOM', () => renderer.domElement.isConnected)
check(
  'Torus geometry parameters',
  () =>
    geometry.parameters &&
    geometry.parameters.radius === params.radius &&
    geometry.parameters.tube === params.tube &&
    geometry.parameters.radialSegments === params.radialSegments &&
    geometry.parameters.tubularSegments === params.tubularSegments
)
check('OrbitControls available', () => typeof controls.update === 'function')

// 表示
const passCount = results.filter((r) => r.ok).length
const total = results.length
logEl.innerHTML =
  `${passCount}/${total} tests passed` +
  '<ul style="margin:6px 0 0 18px; padding:0">' +
  results
    .map(
      (r) =>
        `<li class="${r.ok ? 'pass' : 'fail'}">${r.ok ? 'PASS' : 'FAIL'} - ${r.name}${
          r.err ? ' : ' + (r.err.message || r.err) : ''
        }</li>`
    )
    .join('') +
  '</ul>'
