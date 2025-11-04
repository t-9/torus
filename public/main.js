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
const params = { radius: 0.48, tube: 0.15, radialSegments: 96, tubularSegments: 168 }
const geometry = new THREE.TorusGeometry(params.radius, params.tube, params.radialSegments, params.tubularSegments)
const material = new THREE.MeshStandardMaterial({
  color: 0x4fb6ff,
  roughness: 0.2,
  metalness: 0.7,
  envMapIntensity: 1.0
})
const torus = new THREE.Mesh(geometry, material)
const torusGroup = new THREE.Group()
torusGroup.add(torus)
scene.add(torusGroup)
geometry.computeBoundingSphere()
const objectRadius = geometry.boundingSphere ? geometry.boundingSphere.radius : params.radius + params.tube

const infoLabel = createLabel(['穴あきドーナツトーラス'])
infoLabel.position.set(0, objectRadius + 0.2, 0)
infoLabel.renderOrder = 1
const desiredLabelHeight = objectRadius * 0.4
const currentLabelHeight = infoLabel.scale.y
if (currentLabelHeight > 0) {
  const adjust = desiredLabelHeight / currentLabelHeight
  infoLabel.scale.multiplyScalar(adjust)
}
torusGroup.add(infoLabel)

// カメラ
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
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
controls.target.set(0, 0, 0)

const tmpVec3 = new THREE.Vector3()
const rightVec = new THREE.Vector3()
const upVec = new THREE.Vector3()
const forwardVec = new THREE.Vector3()
const desiredNdcDesktop = new THREE.Vector2(0.28, 0.18)
const desiredNdcMobile = new THREE.Vector2(0.5, 0.22)

function createLabel(lines) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const fontSize = 24
  const lineHeight = fontSize * 1.25
  const paddingX = 18
  const paddingY = 14

  context.font = `${fontSize}px "Noto Sans JP", "Segoe UI", sans-serif`
  const metrics = lines.map((line) => context.measureText(line))
  const maxWidth = Math.max(...metrics.map((m) => m.width))

  canvas.width = Math.ceil(maxWidth + paddingX * 2)
  canvas.height = Math.ceil(lineHeight * lines.length + paddingY * 2)

  context.font = `${fontSize}px "Noto Sans JP", "Segoe UI", sans-serif`
  context.textBaseline = 'top'
  context.textAlign = 'left'
  context.fillStyle = 'rgba(5, 11, 23, 0.78)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#e7f1ff'
  lines.forEach((line, index) => {
    context.fillText(line, paddingX, paddingY + index * lineHeight)
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
  const sprite = new THREE.Sprite(material)
  const scaleFactor = 0.008
  sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1)
  sprite.center.set(0.5, 0)
  return sprite
}

// リサイズ対応
function resize() {
  torusGroup.position.set(0, 0, 0)
  controls.target.set(0, 0, 0)

  const w = container.clientWidth || window.innerWidth || 1
  const h = container.clientHeight || window.innerHeight || 1
  camera.aspect = w / h
  camera.updateProjectionMatrix()

  const isMobile = w < 768
  const fitMargin = isMobile ? 3.2 : 2.4
  const vFov = THREE.MathUtils.degToRad(camera.fov)
  const halfHeightTan = Math.tan(vFov / 2)
  const halfWidthTan = halfHeightTan * camera.aspect
  const distVertical = (objectRadius * fitMargin) / halfHeightTan
  const distHorizontal = (objectRadius * fitMargin) / Math.max(halfWidthTan, 0.0001)
  const fitDistance = Math.max(distVertical, distHorizontal)

  const desiredNdc = isMobile ? desiredNdcMobile : desiredNdcDesktop

  const cameraDirection = new THREE.Vector3(0, 0.4, 1).normalize()
  const horizontalScale = fitDistance * Math.tan(vFov / 2) * camera.aspect
  const verticalScale = fitDistance * Math.tan(vFov / 2)

  torusGroup.updateMatrixWorld()
  for (let i = 0; i < 2; i += 1) {
    camera.position.copy(cameraDirection.clone().multiplyScalar(fitDistance).add(controls.target))
    camera.lookAt(controls.target)
    camera.updateMatrixWorld()

    camera.matrixWorld.extractBasis(rightVec, upVec, forwardVec)
    const worldCenter = torusGroup.getWorldPosition(tmpVec3)
    const projected = worldCenter.clone().project(camera)
    const ndcDelta = desiredNdc.clone().sub(projected)

    const worldOffset = new THREE.Vector3()
    worldOffset.addScaledVector(rightVec, THREE.MathUtils.clamp(ndcDelta.x, -0.9, 0.9) * horizontalScale * 0.9)
    worldOffset.addScaledVector(upVec, THREE.MathUtils.clamp(ndcDelta.y, -0.9, 0.9) * verticalScale * 0.9)

    torusGroup.position.add(worldOffset)
    controls.target.add(worldOffset)
    torusGroup.updateMatrixWorld()
  }

  controls.target.copy(torusGroup.position)
  camera.position.copy(cameraDirection.clone().multiplyScalar(fitDistance).add(controls.target))
  camera.lookAt(controls.target)
  camera.updateProjectionMatrix()

  controls.minDistance = fitDistance * 0.6
  controls.maxDistance = fitDistance * 3

  renderer.setSize(w, h, false)
  controls.update()
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
check('Info label sprite added', () => infoLabel.parent === torusGroup)

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
