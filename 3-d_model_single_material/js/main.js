let weldMode = false;
let weldAssemblyGroup = null;

// Safe getElementById to avoid crashes when UI panels are missing
const _originalGetElementById = document.getElementById.bind(document);
document.getElementById = function(id) {
  const el = _originalGetElementById(id);
  if (el) return el;
  // Return a dummy element to absorb assignments
  return { 
    value: '', textContent: '', innerHTML: '', 
    style: {}, classList: { add:()=>{}, remove:()=>{}, toggle:()=>{} },
    appendChild: () => {}, removeChild: () => {},
    options: []
  };
};
    // STATE
    // ============================================================
    let currentShape = "rod";
    let currentMat = "steel";
    let customDensity = null;
    let currentMesh = null;
    let currentDims = {};
    let scene, camera, renderer, orbitControls, animId;
    let gridHelper, axesHelper, floorMesh;

    let coordMode = false;
    let coordCount = 0;
    const coordMarkers = [];

    // ============================================================
    // THREE.JS ORBIT CONTROLS (inline, r128 compatible)
    // ============================================================
    function buildOrbitControls(camera, domEl) {
      const ctrl = {
        camera, domEl,
        target: new THREE.Vector3(),
        _spherical: new THREE.Spherical(),
        _sphericalDelta: new THREE.Spherical(),
        _scale: 1,
        _panOffset: new THREE.Vector3(),
        enabled: true,
        minDistance: 1, maxDistance: 50000,
        _rotateStart: new THREE.Vector2(), _rotateEnd: new THREE.Vector2(), _rotateDelta: new THREE.Vector2(),
        _panStart: new THREE.Vector2(), _panEnd: new THREE.Vector2(), _panDelta: new THREE.Vector2(),
        _dollyStart: new THREE.Vector2(), _dollyEnd: new THREE.Vector2(),
        _state: -1,
        STATE: { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2 }
      };
      const EPS = 0.000001;
      function getZoomScale() { return Math.pow(0.95, 1); }
      function rotateLeft(a) { ctrl._sphericalDelta.theta -= a; }
      function rotateUp(a) { ctrl._sphericalDelta.phi -= a; }
      function panLeft(d, m) { const v = new THREE.Vector3().setFromMatrixColumn(m, 0); v.multiplyScalar(-d); ctrl._panOffset.add(v); }
      function panUp(d, m) { const v = new THREE.Vector3().setFromMatrixColumn(m, 1); v.multiplyScalar(d); ctrl._panOffset.add(v); }
      function pan(dx, dy) {
        const el = ctrl.domEl; const pos = ctrl.camera.position; const offset = pos.clone().sub(ctrl.target);
        let targetDist = offset.length() * Math.tan((ctrl.camera.fov / 2) * Math.PI / 180);
        panLeft(2 * dx * targetDist / el.clientHeight, ctrl.camera.matrix);
        panUp(2 * dy * targetDist / el.clientHeight, ctrl.camera.matrix);
      }
      ctrl.update = function () {
        const offset = camera.position.clone().sub(ctrl.target);
        ctrl._spherical.setFromVector3(offset);
        ctrl._spherical.theta += ctrl._sphericalDelta.theta;
        ctrl._spherical.phi += ctrl._sphericalDelta.phi;
        ctrl._spherical.phi = Math.max(EPS, Math.min(Math.PI - EPS, ctrl._spherical.phi));
        ctrl._spherical.radius *= ctrl._scale;
        ctrl._spherical.radius = Math.max(ctrl.minDistance, Math.min(ctrl.maxDistance, ctrl._spherical.radius));
        ctrl.target.add(ctrl._panOffset);
        offset.setFromSpherical(ctrl._spherical);
        camera.position.copy(ctrl.target).add(offset);
        camera.lookAt(ctrl.target);
        ctrl._sphericalDelta.set(0, 0, 0);
        ctrl._scale = 1;
        ctrl._panOffset.set(0, 0, 0);
      };
      ctrl.reset = function (pos, tgt) { camera.position.copy(pos); ctrl.target.copy(tgt || new THREE.Vector3()); ctrl.update(); };
      function onMouseDown(e) {
        if (!ctrl.enabled) return;
        e.preventDefault();
        if (e.button === 0) { ctrl._state = ctrl.STATE.ROTATE; ctrl._rotateStart.set(e.clientX, e.clientY); }
        else if (e.button === 2) { ctrl._state = ctrl.STATE.PAN; ctrl._panStart.set(e.clientX, e.clientY); }
        else if (e.button === 1) { ctrl._state = ctrl.STATE.DOLLY; ctrl._dollyStart.set(e.clientX, e.clientY); }
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      }
      function onMouseMove(e) {
        if (!ctrl.enabled) return;
        const el = ctrl.domEl;
        if (ctrl._state === ctrl.STATE.ROTATE) {
          ctrl._rotateEnd.set(e.clientX, e.clientY);
          ctrl._rotateDelta.subVectors(ctrl._rotateEnd, ctrl._rotateStart);
          rotateLeft(2 * Math.PI * ctrl._rotateDelta.x / el.clientHeight * 0.8);
          rotateUp(2 * Math.PI * ctrl._rotateDelta.y / el.clientHeight * 0.8);
          ctrl._rotateStart.copy(ctrl._rotateEnd);
        } else if (ctrl._state === ctrl.STATE.PAN) {
          ctrl._panEnd.set(e.clientX, e.clientY);
          ctrl._panDelta.subVectors(ctrl._panEnd, ctrl._panStart);
          pan(ctrl._panDelta.x * 1.8, ctrl._panDelta.y * 1.8);
          ctrl._panStart.copy(ctrl._panEnd);
        } else if (ctrl._state === ctrl.STATE.DOLLY) {
          ctrl._dollyEnd.set(e.clientX, e.clientY);
          const dy = ctrl._dollyEnd.y - ctrl._dollyStart.y;
          if (dy > 0) ctrl._scale /= 0.97;
          else ctrl._scale *= 0.97;
          ctrl._dollyStart.copy(ctrl._dollyEnd);
        }
        ctrl.update();
      }
      function onMouseUp() { ctrl._state = ctrl.STATE.NONE; window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); }
      function onWheel(e) { e.preventDefault(); if (e.deltaY > 0) ctrl._scale /= 0.93; else ctrl._scale *= 0.93; ctrl.update(); }
      domEl.addEventListener('mousedown', onMouseDown);
      domEl.addEventListener('wheel', onWheel, { passive: false });
      domEl.addEventListener('contextmenu', e => e.preventDefault());
      return ctrl;
    }

    // ============================================================
    // SCENE INIT
    // ============================================================
    function generateSkyboxEnvMap(renderer) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Gradient representing sky, studio walls, horizon, and floor
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#ffffff');      // bright light studio ceiling
      grad.addColorStop(0.25, '#e2e8f0');   // soft sky gradient
      grad.addColorStop(0.5, '#94a3b8');    // grey horizon
      grad.addColorStop(0.7, '#64748b');    // ground gradient
      grad.addColorStop(1, '#0f172a');      // dark floor reflections

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bright rectangular lights for premium reflections on metallic model edges
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(80, 20, 70, 80);
      ctx.fillRect(360, 30, 50, 90);
      ctx.fillRect(200, 10, 100, 30); // overhead panel light

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;

      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      pmremGenerator.dispose();
      texture.dispose();
      return envMap;
    }

    function initScene() {
      const wrap = document.getElementById('canvasWrap');
      const canvas = document.getElementById('canvas3d');

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setClearColor(0xe8eef5);
      renderer.physicallyCorrectLights = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      scene = new THREE.Scene();
      // scene.fog = new THREE.FogExp2(0xe8eef5, 0.0004);

      // Apply procedural HDRI environment mapping
      const envMap = generateSkyboxEnvMap(renderer);
      scene.environment = envMap;

      camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200000);
      camera.position.set(200, 150, 300);
      camera.lookAt(0, 0, 0);

      // Ambient fill light
      const ambient = new THREE.AmbientLight(0xffffff, 0.45);
      scene.add(ambient);

      // Shadow casting directional light
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
      dirLight.position.set(300, 600, 200);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(2048, 2048);
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 4000;
      dirLight.shadow.bias = -0.0008;
      const d = 1500;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      scene.add(dirLight);

      const fillLight = new THREE.DirectionalLight(0xdce8f8, 0.4);
      fillLight.position.set(-200, 150, -150);
      scene.add(fillLight);

      // Dual Engineering Grid: major grid (100mm spacing) + minor grid (20mm spacing)
      const gridGroup = new THREE.Group();

      const majorGrid = new THREE.GridHelper(4000, 40, 0x64748b, 0x94a3b8);
      majorGrid.position.y = 0;
      majorGrid.material.transparent = true;
      majorGrid.material.opacity = 0.65;
      gridGroup.add(majorGrid);

      const minorGrid = new THREE.GridHelper(4000, 200, 0xcbd5e1, 0xe2e8f0);
      minorGrid.position.y = -0.2;
      minorGrid.material.transparent = true;
      minorGrid.material.opacity = 0.40;
      gridGroup.add(minorGrid);

      gridHelper = gridGroup;
      scene.add(gridHelper);

      // Transparent shadow floor mesh below the grid
      const floorGeo = new THREE.PlaneGeometry(50000, 50000);
      const floorMat = new THREE.ShadowMaterial({ opacity: 0.18 });
      floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.y = -0.5;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      // Axes
      axesHelper = new THREE.AxesHelper(100);
      scene.add(axesHelper);

      // Orbit controls
      orbitControls = buildOrbitControls(camera, canvas);

      // Add click listener to select nozzles via raycasting
      window.addEventListener('click', onCanvasClick);
      window.addEventListener('mousemove', onCanvasMouseMove);

      // Resize
      function resize() {
        const w = wrap.clientWidth, h = wrap.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener('resize', resize);

      // Render loop with real-time annotation tracker
      function animate() {
        animId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
        if (weldMode) {
          if (weldAssemblyGroup) updateWeldAnnotations();
        } else {
          if (currentMesh) updateAnnotations(currentMesh);
        }
      }
      animate();
    }

    // UI BUILDERS
    // ============================================================
    function buildCategoryGrid() {
      const select = document.getElementById('catSelect');
      if (!select) return;
      if (select.options.length === 0) {
        Object.keys(SHAPE_CONFIG).forEach(key => {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = SHAPE_CONFIG[key].label;
          select.appendChild(opt);
        });
      }
      select.value = currentShape;
    }

    function buildMaterialRow() {
      const row = document.getElementById('matRow');
      row.innerHTML = '';
      Object.keys(MATERIALS).forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'mat-btn' + (key === currentMat ? ' active' : '');
        btn.innerHTML = `<span class="mat-dot" style="background:${MAT_DOTS[key]}"></span>${MATERIALS[key].label}`;
        btn.onclick = () => { currentMat = key; buildMaterialRow(); updateDensityDisplay(); generateModel(); };
        row.appendChild(btn);
      });
    }

    function buildDynFields() {
      const cfg = SHAPE_CONFIG[currentShape];
      const container = document.getElementById('dynFields');
      container.innerHTML = '';
      const qtyInput = document.getElementById('qtyInput');
      qtyInput.style.display = 'none';
      qtyInput.parentElement.style.display = 'none';

      cfg.inputs.forEach(inp => {
        if (inp.isQty) {
          qtyInput.style.display = '';
          qtyInput.parentElement.style.display = '';
          return;
        }
        const fg = document.createElement('div');
        fg.className = 'field-group';
        fg.innerHTML = `
      <div class="field-label">${inp.label} <span class="field-unit">${inp.unit}</span></div>
      <input type="number" class="field-input" id="dim_${inp.id}" min="${inp.min}" step="any" 
             value="${getDefaultDim(inp.id, inp)}" onchange="onDimChange()" oninput="onDimChange()" onkeydown="if(event.key==='ArrowUp'){this.value=Number(this.value)+1;onDimChange();event.preventDefault();}if(event.key==='ArrowDown'){this.value=Number(this.value)-1;onDimChange();event.preventDefault();}">
      <div class="field-error" id="err_${inp.id}"></div>
    `;
        container.appendChild(fg);
      });
    }

    function getDefaultDim(id, inp) {
      const defaults = {
        OD: 100, ID: 80, T: 10, L: 300, W: 200, nominalThk: 5, hubLength: 40,
        numBolts: 8, boltDia: 20, tubeHoleDia: 20, tubeHoleCount: 37, COD: 120, CT: 20,
        smallEndID: 200, largeEndID: 500, H: 300, ptcSize: 0, SF: 25,
        hubThk: 20, neckThk: 12, shell: 30, hubHeight: 50, R: 500
      };
      // Shape-specific overrides
      if (currentShape === 'shellFlange' && id === 'OD') return 200;
      if (currentShape === 'dishedEnd' && id === 'ID') return 500;
      if (currentShape === 'cone' && id === 'T') return 10;
      if (currentShape === 'nozzle' && id === 'ID') return 100;
      return defaults[id] || inp.min || 1;
    }

    function getDims() {
      const cfg = SHAPE_CONFIG[currentShape];
      const d = {};
      cfg.inputs.forEach(inp => {
        if (inp.isQty) {
          d[inp.id] = parseFloat(document.getElementById('qtyInput').value) || 1;
        } else {
          const el = document.getElementById('dim_' + inp.id);
          d[inp.id] = el ? parseFloat(el.value) : 0;
        }
      });
      return d;
    }

    function updateDensityDisplay() {
      const m = MATERIALS[currentMat];
      document.getElementById('densityLabel').textContent = m.label;
      customDensity = null;
      document.getElementById('densityInput').value = m.density;
    }

    function onCustomDensityChange() {
      const val = parseFloat(document.getElementById('densityInput').value);
      if (!isNaN(val) && val > 0) {
        customDensity = val;
        // Check if user entered a custom value not matching the base material
        if (val !== MATERIALS[currentMat].density) {
          document.getElementById('densityLabel').textContent = MATERIALS[currentMat].label + " (Custom)";
        } else {
          document.getElementById('densityLabel').textContent = MATERIALS[currentMat].label;
        }

        clearTimeout(_liveGenTimer);
        _liveGenTimer = setTimeout(() => generateModel(), 120);
      }
    }

    // Debounce timer for live model generation
    let _liveGenTimer = null;

    function onDimChange() {
      const dims = getDims();
      const cfg = SHAPE_CONFIG[currentShape];
      const errors = ValidationManager.validate(cfg, dims);
      const notice = document.getElementById('validationNotice');

      // Clear field errors
      cfg.inputs.forEach(inp => {
        const el = document.getElementById('err_' + inp.id);
        if (el) el.textContent = '';
        const inp_el = document.getElementById('dim_' + inp.id);
        if (inp_el) inp_el.classList.remove('error');
      });

      if (errors.length > 0) {
        notice.innerHTML = `<div class="val-notice err">⚠ ${errors.join(' · ')}</div>`;
        setStatus('warn', 'Validation errors');
      } else {
        // Check for non-blocking shape warnings (e.g. tubesheet hole count overflow)
        const warnMsg = cfg.warn ? cfg.warn(dims) : '';
        if (warnMsg) {
          notice.innerHTML = `<div class="val-notice warn">${warnMsg}</div>`;
          setStatus('warn', 'Note: hole count capped');
        } else {
          notice.innerHTML = '';
          setStatus('ok', 'Live updating\u2026');
        }
        // Live regenerate model — debounced so rapid typing doesn't stutter
        clearTimeout(_liveGenTimer);
        _liveGenTimer = setTimeout(() => generateModel(), 120);
      }
    }

    function getWeightKey() {
      const map = {
        rod: 'rod', tube: 'tube', pipe: 'pipe', plate: 'plate',
        shellPlateRolled: 'shellRolled', shellPlateAnnular: 'shellAnnular',
        forging: 'forging', stud: 'stud', tubesheet: 'tubesheet', shellFlange: 'shellFlange',
        cone: 'cone', dishedEnd: 'dishedEnd', nozzle: 'nozzle'
      };
      return map[currentShape] || currentShape;
    }

    function displayWeights(result) {
      if (!result) return;
      const fmt = v => v >= 1000 ? (v / 1000).toFixed(3) + ' t' : v.toFixed(4);
      document.getElementById('wRaw').textContent = fmt(result.raw);
      document.getElementById('wRawUnit').textContent = result.raw >= 1000 ? 'tonnes' : 'kg';
      document.getElementById('wFinished').textContent = fmt(result.finished);
      document.getElementById('wFinishedUnit').textContent = result.finished >= 1000 ? 'tonnes' : 'kg';
      document.getElementById('formulaDisplay').textContent = result.formula;
    }

    // ============================================================
    // SCENE SCALE — fit camera to model
    // ============================================================
    function fitCamera(group) {
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let dist = Math.abs(maxDim / Math.sin(fov / 2)) * 0.7;
      dist = Math.max(dist, maxDim * 1.5);

      camera.position.set(center.x + dist * 0.7, center.y + dist * 0.5, center.z + dist * 0.8);
      camera.lookAt(center);
      orbitControls.target.copy(center);
      orbitControls.update();

      // Adjust grid and fog
      gridHelper.scale.setScalar(Math.max(maxDim / 2000, 1));
      const pos = center.y - size.y / 2;
      gridHelper.position.y = pos;
      if (floorMesh) floorMesh.position.y = pos - 0.5;
    }

    function focusOnObject(object) {
      if (!object) return;
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let dist = Math.abs(maxDim / Math.sin(fov / 2)) * 1.1;
      dist = Math.max(dist, maxDim * 2.0);

      const dir = camera.position.clone().sub(orbitControls.target).normalize();
      camera.position.copy(center).add(dir.multiplyScalar(dist));
      camera.lookAt(center);
      orbitControls.target.copy(center);
      orbitControls.update();
    }

    // ============================================================
    // DIMENSION ANNOTATIONS
    // ============================================================
    function updateAnnotations(group) {
      const container = document.getElementById('dimAnnotations');
      container.innerHTML = '';
      if (!group || !group._dims) return;

      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Project 3D points to 2D screen positions
      function project(v3) {
        const v = v3.clone().project(camera);
        const canvas = document.getElementById('canvas3d');
        return {
          x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
          y: (-v.y * 0.5 + 0.5) * canvas.clientHeight
        };
      }

      const entries = Object.entries(group._dims);
      entries.forEach(([key, val], i) => {
        const offset = (i - entries.length / 2) * size.x * 0.4;
        const pt = new THREE.Vector3(center.x + offset, center.y + size.y / 2 + size.y * 0.25, center.z);
        const p2d = project(pt);

        if (p2d.x > 0 && p2d.x < document.getElementById('canvasWrap').clientWidth &&
          p2d.y > 0 && p2d.y < document.getElementById('canvasWrap').clientHeight) {
          const el = document.createElement('div');
          el.className = 'dim-annotation';
          el.style.left = p2d.x + 'px';
          el.style.top = p2d.y + 'px';
          el.textContent = `${key}: ${val}`;
          container.appendChild(el);
        }
      });
    }

    function selectWeldConnection(idx, forceFocus = true) {
      if (idx < 0 || idx >= weldConnections.length) return;
      activeConnIndex = idx;

      // Re-highlight cards in UI
      document.querySelectorAll('.weld-connection-item').forEach((item, i) => {
        item.classList.toggle('selected', i === idx);
      });

      // Scroll selected card into view
      const items = document.querySelectorAll('.weld-connection-item');
      if (items[idx]) {
        items[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Rebuild 3D model to update highlights
      buildWeldAssembly(true);

      if (forceFocus) {
        const conn = weldConnections[idx];
        if (conn && weldAssemblyGroup) {
          const connGroup = weldAssemblyGroup.getObjectByName(`ConnectionGroup_${conn._id}`);
          if (connGroup) {
            focusOnObject(connGroup);
          }
        }
      }
    }

    function toggleCoordMode() {
      coordMode = !coordMode;
      const btn = document.getElementById('coordModeBtn');
      const panel = document.getElementById('coordPanel');
      const canvas = document.getElementById('canvas3d');

      if (coordMode) {
        btn.classList.add('active');
        panel.style.display = 'flex';
        document.body.classList.add('coord-mode-active');
      } else {
        btn.classList.remove('active');
        panel.style.display = 'none';
        document.body.classList.remove('coord-mode-active');
        clearCoordMarkers();
      }
    }

    function clearCoordMarkers() {
      coordMarkers.forEach(m => scene.remove(m));
      coordMarkers.length = 0;
      coordCount = 0;
      const list = document.getElementById('coordList');
      if (list) list.innerHTML = '<div style="color:var(--text-muted);">Click anywhere on the model...</div>';
    }

    function addCoordMarker(pt) {
      coordCount++;
      const geo = new THREE.SphereGeometry(2, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pt);
      mesh.renderOrder = 999;
      scene.add(mesh);
      coordMarkers.push(mesh);

      const list = document.getElementById('coordList');
      if (coordCount === 1) list.innerHTML = '';

      const div = document.createElement('div');
      div.style.background = 'var(--bg-input)';
      div.style.padding = '6px';
      div.style.borderRadius = '4px';
      div.style.borderLeft = '3px solid #ff0000';
      div.style.display = 'flex';
      div.style.justifyContent = 'space-between';
      div.style.alignItems = 'center';

      const textDiv = document.createElement('div');
      textDiv.innerHTML = `<strong style="color:var(--text-primary);">P${coordCount}</strong>: X=${pt.x.toFixed(1)}, Y=${pt.y.toFixed(1)}, Z=${pt.z.toFixed(1)}`;

      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '✕';
      removeBtn.style.background = 'transparent';
      removeBtn.style.border = 'none';
      removeBtn.style.color = 'var(--text-muted)';
      removeBtn.style.cursor = 'pointer';
      removeBtn.style.fontSize = '12px';
      removeBtn.style.padding = '0 4px';
      removeBtn.title = 'Remove Coordinate';

      removeBtn.onmouseover = () => removeBtn.style.color = 'var(--danger)';
      removeBtn.onmouseout = () => removeBtn.style.color = 'var(--text-muted)';

      removeBtn.onclick = function(e) {
        e.stopPropagation();
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
        
        const index = coordMarkers.indexOf(mesh);
        if (index > -1) coordMarkers.splice(index, 1);
        
        div.remove();
        if (coordMarkers.length === 0) {
          list.innerHTML = '<div style="color:var(--text-muted);">Click anywhere on the model...</div>';
          coordCount = 0;
        }
      };

      div.appendChild(textDiv);
      div.appendChild(removeBtn);
      list.appendChild(div);
      list.scrollTop = list.scrollHeight;
    }

    function onCanvasClick(e) {
      const canvas = document.getElementById('canvas3d');
      if (e.target !== canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1,
        -((e.clientY - rect.top) / canvas.clientHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      if (coordMode) {
        const objectsToTest = [];
        if (currentMesh) objectsToTest.push(currentMesh);
        if (weldAssemblyGroup) objectsToTest.push(weldAssemblyGroup);
        const intersects = raycaster.intersectObjects(objectsToTest, true);
        if (intersects.length > 0) {
          addCoordMarker(intersects[0].point);
        }
        return;
      }

      if (!weldMode || !weldAssemblyGroup) return;

      const intersects = raycaster.intersectObjects(weldAssemblyGroup.children, true);
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && obj !== scene) {
          if (obj.name && obj.name.startsWith("ConnectionGroup_")) {
            if (obj.userData && typeof obj.userData.connIndex === 'number') {
              selectWeldConnection(obj.userData.connIndex);
              return;
            }
          }
          obj = obj.parent;
        }
      }
    }

    let hoveredConnIndex = -1;
    function onCanvasMouseMove(e) {
      if (!weldMode || !weldAssemblyGroup) return;
      const canvas = document.getElementById('canvas3d');
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / canvas.clientWidth) * 2 - 1,
        -((e.clientY - rect.top) / canvas.clientHeight) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      let foundIdx = -1;
      const intersects = raycaster.intersectObjects(weldAssemblyGroup.children, true);
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && obj !== scene) {
          if (obj.name && obj.name.startsWith("ConnectionGroup_")) {
            if (obj.userData && typeof obj.userData.connIndex === 'number') {
              foundIdx = obj.userData.connIndex;
              break;
            }
          }
          obj = obj.parent;
        }
      }

      if (foundIdx !== hoveredConnIndex) {
        hoveredConnIndex = foundIdx;
        document.querySelectorAll('.dim-annotation').forEach(el => {
          const idx = parseInt(el.dataset.connIdx);
          if (idx === hoveredConnIndex) {
            el.classList.add('hovered');
          } else {
            el.classList.remove('hovered');
          }
        });
      }
    }

    function updateWeldAnnotations() {
      const container = document.getElementById('dimAnnotations');
      if (!container) return;
      if (!weldMode || !weldAssemblyGroup) return;
      container.innerHTML = '';
      const canvas = document.getElementById('canvas3d');
      const wrap = document.getElementById('canvasWrap');

      function project(v3) {
        const v = v3.clone().project(camera);
        return {
          x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
          y: (-v.y * 0.5 + 0.5) * canvas.clientHeight
        };
      }

      function addLabel(text, worldPos, isActive, connIdx) {
        const p2d = project(worldPos);
        if (p2d.x > 0 && p2d.x < wrap.clientWidth &&
          p2d.y > 0 && p2d.y < wrap.clientHeight) {
          const el = document.createElement('div');
          el.className = 'dim-annotation';
          if (isActive) el.classList.add('active');
          if (connIdx !== undefined) el.dataset.connIdx = connIdx;
          el.style.left = p2d.x + 'px';
          el.style.top = p2d.y + 'px';
          el.textContent = text;
          container.appendChild(el);
        }
      }

      // 1. Base Dimensions
      weldAssemblyGroup.updateMatrixWorld(true);
      const baseInfo = getBaseDimsAndType(weldBaseType, weldBaseDims);
      if (baseInfo.isCylindrical) {
        const ID = (baseInfo.radius - baseInfo.thickness) * 2;
        const T = baseInfo.thickness;
        const H = baseInfo.length;
        const OR = baseInfo.radius;
        const loc1 = new THREE.Vector3(OR + 40, H / 2, 0).applyMatrix4(weldAssemblyGroup.matrixWorld);
        const loc2 = new THREE.Vector3(0, 0, OR + 20).applyMatrix4(weldAssemblyGroup.matrixWorld);
        const labelLengthText = H > 2000 ? `Shell Length: ${H.toFixed(0)} mm` : `Base Height: ${H.toFixed(0)} mm`;
        addLabel(labelLengthText, loc1);
        addLabel(`Base ID: ${ID.toFixed(0)} mm (T: ${T.toFixed(0)} mm)`, loc2);
      } else {
        const L = baseInfo.length;
        const W = baseInfo.width;
        const T = baseInfo.thickness;
        const locPlate = new THREE.Vector3(0, T / 2 + 20, 0).applyMatrix4(weldAssemblyGroup.matrixWorld);
        addLabel(`Base Plate: ${L.toFixed(0)}L x ${W.toFixed(0)}W x ${T.toFixed(0)}T mm`, locPlate);
      }

      // 2. Connection/Nozzle Annotations
      weldAssemblyGroup.traverse(obj => {
        if (obj.name && obj.name.startsWith("ConnectionGroup_")) {
          const connId = obj.userData.connId;
          const connIdx = obj.userData.connIndex;
          const conn = weldConnections[connIdx];
          if (conn) {
            let tipZ = conn.len || 100;
            if (conn.type === 'ring' || conn.type === 'plate' || conn.type === 'tubesheet') {
              tipZ = conn.t !== undefined ? conn.t : 15;
            } else if (conn.type === 'cone') {
              tipZ = conn.len || 120;
            } else if (conn.type === 'buttering') {
              tipZ = conn.t !== undefined ? conn.t : 10;
            }

            const localTip = new THREE.Vector3(0, 0, tipZ + 20); // slightly offset outwards
            const tipWorld = localTip.clone().applyMatrix4(obj.matrixWorld);

            const isActive = (connIdx === activeConnIndex);
            const labelText = `${conn.name || `Connection #${connIdx + 1}`}` + (isActive ? ' 🔍' : '');
            addLabel(labelText, tipWorld, isActive, connIdx);
          }
        }
      });
    }

    // ============================================================
    // MAIN GENERATE
    // ============================================================
    function generateModel(preventFitCamera = true) {
      const cfg = SHAPE_CONFIG[currentShape];
      const dims = getDims();
      currentDims = dims;

      // Validate
      const errors = ValidationManager.validate(cfg, dims);
      if (errors.length > 0) {
        document.getElementById('validationNotice').innerHTML = `<div class="val-notice err">⚠ ${errors.join('<br>')}</div>`;
        setStatus('err', 'Cannot generate — fix errors');
        return;
      }
      document.getElementById('validationNotice').innerHTML = '<div class="val-notice ok">✓ Dimensions valid</div>';

      // Check for non-blocking warnings (e.g. tubesheet hole overflow)
      const warnMsg = cfg.warn ? cfg.warn(dims) : '';
      if (warnMsg) {
        document.getElementById('validationNotice').innerHTML += `<div class="val-notice warn">${warnMsg}</div>`;
      }

      // Remove old mesh
      if (currentMesh) {
        scene.remove(currentMesh);
        ShapeFactory._disposeGroup(currentMesh);
        currentMesh = null;
      }

      // Create new mesh
      const matPreset = MATERIALS[currentMat];
      const geoKey = cfg.geo3d;
      const group = ShapeFactory.create(geoKey, dims, matPreset);

      // Handle orientation
      const orient = document.getElementById('orientationSelect') ? document.getElementById('orientationSelect').value : 'auto';
      let isHorizontal = false;
      if (orient === 'horizontal') {
        isHorizontal = true;
      } else if (orient === 'vertical') {
        isHorizontal = false;
      } else {
        if (['tube', 'pipe', 'shellPlateRolled', 'shellPlateAnnular'].includes(currentShape)) {
          isHorizontal = true;
        }
      }

      if (isHorizontal) {
        group.rotation.z = -Math.PI / 2;
        group.updateMatrixWorld(true);
      }

      // Ensure the object always sits perfectly on the grid plane (Y=0)
      const box = new THREE.Box3().setFromObject(group);
      group.position.y = -box.min.y;

      scene.add(group);
      currentMesh = group;

      // Fit camera only when switching shapes, not on live dimension edits
      if (!preventFitCamera) fitCamera(group);

      // Update annotations (after a frame for positions)
      setTimeout(() => updateAnnotations(group), 100);

      // Bounding box info
      const bb = group._bbox;
      document.getElementById('bboxRows').innerHTML = `
    <div class="meta-row"><span class="meta-key">Length</span><span class="meta-val accent">${bb.L.toFixed(1)} mm</span></div>
    <div class="meta-row"><span class="meta-key">Width</span><span class="meta-val accent">${bb.W.toFixed(1)} mm</span></div>
    <div class="meta-row"><span class="meta-key">Height</span><span class="meta-val accent">${bb.H.toFixed(1)} mm</span></div>
  `;

      // Shape info
      const dimEntries = Object.entries(group._dims).map(([k, v]) =>
        `<div class="meta-row"><span class="meta-key">${k}</span><span class="meta-val">${v}</span></div>`).join('');
      document.getElementById('shapeInfoRows').innerHTML = `
    <div class="meta-row"><span class="meta-key">Type</span><span class="meta-val success">${cfg.label}</span></div>
    <div class="meta-row"><span class="meta-key">Material</span><span class="meta-val">${MATERIALS[currentMat].label}</span></div>
    ${dimEntries}
  `;

      // Weight
      const wkey = getWeightKey();
      const effDensity = customDensity !== null ? customDensity : MATERIALS[currentMat].density;
      const result = WeightCalc.calc(wkey, dims, currentMat, effDensity);
      displayWeights(result);

      // Polygon count
      let poly = 0;
      group.traverse(o => { if (o.geometry) poly += (o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3) | 0; });
      document.getElementById('polyInfo').textContent = `${poly.toLocaleString()} triangles`;

      setStatus('ok', `${cfg.label} generated`);
    }

    // ============================================================
    // VIEW MODES
    // ============================================================
    function setView(mode) {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('vb-' + mode).classList.add('active');

      const targetGroup = weldMode ? weldAssemblyGroup : currentMesh;
      const box = targetGroup ? new THREE.Box3().setFromObject(targetGroup) : null;
      const center = box ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3();
      const size = box ? box.getSize(new THREE.Vector3()) : new THREE.Vector3(200, 200, 200);
      const d = Math.max(size.x, size.y, size.z) * 2.5;

      switch (mode) {
        case 'iso':
          camera.position.set(center.x + d * 0.6, center.y + d * 0.5, center.z + d * 0.7);
          break;
        case 'front':
          camera.position.set(center.x, center.y, center.z + d);
          break;
        case 'side':
          camera.position.set(center.x + d, center.y, center.z);
          break;
        case 'top':
          camera.position.set(center.x, center.y + d, center.z + 0.001);
          break;
      }
      camera.lookAt(center);
      orbitControls.target.copy(center);
      orbitControls.update();

      if (currentMesh) setTimeout(() => updateAnnotations(currentMesh), 50);
    }

    // ============================================================
    // SHAPE SELECTION
    // ============================================================
    function selectShape(key) {
      currentShape = key;
      buildCategoryGrid();
      buildDynFields();
      generateModel(false);
    }

    // ============================================================
    // STATUS
    // ============================================================
    function setStatus(type, msg) {
      const dot = document.getElementById('statusDot');
      dot.className = 'status-dot' + (type === 'warn' ? ' warn' : (type === 'err' ? ' err' : ''));
      document.getElementById('statusText').textContent = msg;
    }

    // ============================================================
    // INIT
    // ============================================================
    window.addEventListener('load', () => {
      initScene();
      buildCategoryGrid();
      buildMaterialRow();
      buildDynFields();
      updateDensityDisplay();
      onDimChange();
      // Auto generate default shape
      generateModel(false);
    });