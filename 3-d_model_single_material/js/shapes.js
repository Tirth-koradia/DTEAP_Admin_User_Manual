    // ============================================================
    // SHAPE FACTORY
    // ============================================================
    const ShapeFactory = {
      create(type, dims, matPreset) {
        const mat = new THREE.MeshStandardMaterial({
          color: matPreset.color,
          roughness: matPreset.roughness,
          metalness: matPreset.metalness,
          envMapIntensity: 1.2
        });

        switch (type) {
          case "rod": return this._rod(dims, mat);
          case "tube": return this._tube(dims, mat);
          case "pipe": return this._pipe(dims, mat);
          case "plate": return this._plate(dims, mat);
          case "shellRolled": return this._shellRolled(dims, mat);
          case "shellAnnular": return this._shellAnnular(dims, mat);
          case "forging": return this._forging(dims, mat);
          case "stud": return this._stud(dims, mat);
          case "tubesheet": return this._tubesheet(dims, mat);
          case "flange": return this._flange(dims, mat);
          case "cone": return this._cone(dims, mat);
          case "dishedEnd": return this._dishedEnd(dims, mat);
          case "nozzle": return this._nozzle(dims, mat);
          default: return this._rod(dims, mat);
        }
      },

      _disposeGroup(g) {
        g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      },

      _rod(d, mat) {
        const r = d.OD / 2, L = d.L;
        const geo = new THREE.CylinderGeometry(r, r, L, 64, 1);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.rotation.x = Math.PI / 2;
        const g = new THREE.Group(); g.add(mesh);
        g._dims = { "⌀ Diameter": `${d.OD} mm`, "Length": `${d.L} mm` };
        g._bbox = { L: d.OD, W: d.OD, H: d.L };
        return g;
      },

      _tube(d, mat) {
        const OR = d.OD / 2, IR = OR - d.nominalThk, L = d.L;
        const shape = new THREE.Shape();
        shape.absarc(0, 0, OR, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.absarc(0, 0, Math.max(IR, 0.01), 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false, curveSegments: 64 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = L / 2;
        const g = new THREE.Group(); g.add(mesh);
        g._dims = { "⌀ OD": `${d.OD} mm`, "Wall Thk": `${d.nominalThk} mm`, "Length": `${d.L} mm` };
        g._bbox = { L: d.OD, W: d.OD, H: d.L };
        return g;
      },

      _pipe(d, mat) {
        const OD = d.OD !== undefined ? d.OD : (d.ID + 2 * d.T);
        const OR = OD / 2, IR = OR - d.T, L = d.L;
        const shape = new THREE.Shape();
        shape.absarc(0, 0, OR, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.absarc(0, 0, Math.max(IR, 0.01), 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false, curveSegments: 64 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = L / 2;
        const g = new THREE.Group(); g.add(mesh);
        g._dims = { "⌀ OD": `${OD} mm`, "⌀ ID": `${(OD - 2 * d.T).toFixed(2)} mm`, "Wall Thk": `${d.T} mm`, "Length": `${d.L} mm` };
        g._bbox = { L: OD, W: OD, H: d.L };
        return g;
      },

      _plate(d, mat) {
        const geo = new THREE.BoxGeometry(d.W, d.T, d.L);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        const g = new THREE.Group(); g.add(mesh);
        g._dims = { "Length": `${d.L} mm`, "Width": `${d.W} mm`, "Thickness": `${d.T} mm` };
        g._bbox = { L: d.L, W: d.W, H: d.T };
        return g;
      },

      _shellRolled(d, mat) {
        const OR = (d.ID + d.T) / 2 + d.T / 2, IR = d.ID / 2, L = d.W;
        const shape = new THREE.Shape();
        shape.absarc(0, 0, OR, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.absarc(0, 0, IR, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false, curveSegments: 64 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = L / 2;
        const OD = d.ID + 2 * d.T;
        const g = new THREE.Group(); g.add(mesh);
        g._dims = { "⌀ ID": `${d.ID} mm`, "⌀ OD": `${OD} mm`, "Thk": `${d.T} mm`, "Width": `${d.W} mm` };
        g._bbox = { L: OD, W: OD, H: d.W };
        return g;
      },

      _shellAnnular(d, mat) {
        const T_val = (d.OD - d.ID) / 2;
        const shape = new THREE.Shape();
        shape.absarc(0, 0, d.OD / 2, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.absarc(0, 0, d.ID / 2, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        const geo = new THREE.ExtrudeGeometry(shape, { depth: d.L, bevelEnabled: false, curveSegments: 64 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.rotation.x = Math.PI / 2;
        mesh.position.y = d.L / 2;
        const g = new THREE.Group(); g.add(mesh);
        g._dims = { "⌀ OD": `${d.OD} mm`, "⌀ ID": `${d.ID} mm`, "Thk": `${T_val.toFixed(2)} mm`, "Length": `${d.L} mm` };
        g._bbox = { L: d.OD, W: d.OD, H: d.L };
        return g;
      },

      _forging(d, mat) {
        const geo = new THREE.CylinderGeometry(d.OD / 2, d.OD / 2 * 1.05, d.T, 64);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        const g = new THREE.Group(); g.add(mesh);
        g._dims = { "⌀ OD": `${d.OD} mm`, "Thickness": `${d.T} mm` };
        g._bbox = { L: d.OD, W: d.OD, H: d.T };
        return g;
      },

      _stud(d, mat) {
        const g = new THREE.Group();
        const tL = d.L * 0.3; // Thread length scales with total length
        const mL = d.L - 2 * tL;
        const R = d.OD / 2;
        const pitch = Math.max(1, d.OD / 10);
        const innerR = R - pitch * 0.5;

        function createThreadGeo(length) {
          const N = Math.max(1, Math.ceil(length / pitch));
          const heightSegs = Math.min(1200, Math.max(10, N * 12));
          const geo = new THREE.CylinderGeometry(R, R, length, 48, heightSegs);
          const pos = geo.attributes.position;

          for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i);
            let y = pos.getY(i);
            let z = pos.getZ(i);

            const radius2d = Math.sqrt(x * x + z * z);
            if (radius2d < 0.001) continue; // Skip center points of caps

            const distFromTop = (length / 2) - y;
            const distFromBot = y - (-length / 2);

            const theta = Math.atan2(x, z);
            // Phase combines height (y) and angle (theta) to create a helix
            let phase = (y / pitch) - (theta / (Math.PI * 2));
            phase = phase - Math.floor(phase);

            // Trapezoidal thread profile
            let profile = 0;
            if (phase < 0.15) profile = 1;
            else if (phase < 0.4) profile = 1 - (phase - 0.15) / 0.25;
            else if (phase < 0.6) profile = 0;
            else if (phase < 0.85) profile = (phase - 0.6) / 0.25;
            else profile = 1;

            let newR = innerR + (R - innerR) * profile;

            // Chamfer the ends over half a pitch to gracefully fade the thread out
            const chamferR_top = innerR + (R - innerR) * (distFromTop / (pitch * 0.5));
            const chamferR_bot = innerR + (R - innerR) * (distFromBot / (pitch * 0.5));
            const chamferLimit = Math.min(R, Math.max(innerR, Math.min(chamferR_top, chamferR_bot)));

            newR = Math.min(newR, chamferLimit);

            const scale = newR / radius2d;
            pos.setX(i, x * scale);
            pos.setZ(i, z * scale);
          }
          geo.computeVertexNormals();
          return geo;
        }

        // Bottom Thread
        const botGeo = createThreadGeo(tL);
        const botMesh = new THREE.Mesh(botGeo, mat);
        botMesh.position.y = -d.L / 2 + tL / 2;
        botMesh.castShadow = true; botMesh.receiveShadow = true;
        g.add(botMesh);

        // Middle unthreaded body
        if (mL > 0) {
          const midGeo = new THREE.CylinderGeometry(R, R, mL, 64);
          const midMesh = new THREE.Mesh(midGeo, mat);
          midMesh.position.y = 0;
          midMesh.castShadow = true; midMesh.receiveShadow = true;
          g.add(midMesh);
        }

        // Top Thread
        const topGeo = createThreadGeo(tL);
        const topMesh = new THREE.Mesh(topGeo, mat);
        topMesh.position.y = d.L / 2 - tL / 2;
        topMesh.castShadow = true; topMesh.receiveShadow = true;
        g.add(topMesh);

        g._dims = { "⌀ Diameter": `${d.OD} mm`, "Length": `${d.L} mm`, "Thread L": `${tL.toFixed(1)} mm (x2)` };
        g._bbox = { L: d.OD, W: d.OD, H: d.L };
        return g;
      },

      _tubesheet(d, mat) {
        const g = new THREE.Group();
        const holeR = d.tubeHoleDia / 2;
        const discR = d.OD / 2;
        const R = Math.max(0, discR - holeR * 1.5);
        const requested = d.tubeHoleCount || 0;

        let allPositions = [];
        let maxFittable = 0;

        // Calculate max fittable at minimum physical pitch (holeR * 3) using triangular layout
        let minPitch = holeR * 3;
        let minRowSp = minPitch * Math.sqrt(3) / 2;
        let maxRRow = Math.ceil(R / minRowSp);
        for (let row = -maxRRow; row <= maxRRow; row++) {
          let z = row * minRowSp;
          let xOff = (Math.abs(row) % 2 === 1) ? minPitch / 2 : 0;
          let maxC = Math.ceil(R / minPitch) + 1;
          for (let col = -maxC; col <= maxC; col++) {
            let x = col * minPitch + xOff;
            if (x * x + z * z <= R * R + 0.001) maxFittable++;
          }
        }

        const count = Math.min(requested, maxFittable, 200);

        if (count > 0 && R > 0) {
          if (count === 1) {
            allPositions.push({ x: 0, z: 0, distSq: 0 });
          } else {
            // Binary search for the maximum pitch that fits 'count' holes
            let lowP = minPitch;
            let highP = Math.max(minPitch, R * 2);
            let bestP = lowP;

            for (let iter = 0; iter < 20; iter++) {
              let midP = (lowP + highP) / 2;
              let c = 0;
              let rowSp = midP * Math.sqrt(3) / 2;
              let mRow = Math.ceil(R / rowSp);
              for (let row = -mRow; row <= mRow; row++) {
                let z = row * rowSp;
                let xOff = (Math.abs(row) % 2 === 1) ? midP / 2 : 0;
                let mCol = Math.ceil(R / midP) + 1;
                for (let col = -mCol; col <= mCol; col++) {
                  let x = col * midP + xOff;
                  if (x * x + z * z <= R * R + 0.001) c++;
                }
              }
              if (c >= count) {
                bestP = midP;
                lowP = midP;
              } else {
                highP = midP;
              }
            }

            let pitch = bestP * 0.999; // Slightly reduce to avoid boundary exclusion
            let rowSp = pitch * Math.sqrt(3) / 2;
            let mRow = Math.ceil(R / rowSp);
            for (let row = -mRow; row <= mRow; row++) {
              let z = row * rowSp;
              let xOff = (Math.abs(row) % 2 === 1) ? pitch / 2 : 0;
              let mCol = Math.ceil(R / pitch) + 1;
              for (let col = -mCol; col <= mCol; col++) {
                let x = col * pitch + xOff;
                let distSq = x * x + z * z;
                if (distSq <= R * R + 0.001) {
                  allPositions.push({ x, z, distSq });
                }
              }
            }
          }
        }

        allPositions.sort((a, b) => a.distSq - b.distSq);
        const selectedPositions = allPositions.slice(0, count);

        // Build disc shape with tube holes as true through-holes
        const discShape = new THREE.Shape();
        discShape.absarc(0, 0, discR, 0, Math.PI * 2, false);

        for (const pos of selectedPositions) {
          const holePath = new THREE.Path();
          holePath.absarc(pos.x, pos.z, holeR, 0, Math.PI * 2, true);
          discShape.holes.push(holePath);
        }

        const placed = selectedPositions.length;

        const discGeo = new THREE.ExtrudeGeometry(discShape, { depth: d.T, bevelEnabled: false, curveSegments: 64 });
        const disc = new THREE.Mesh(discGeo, mat);
        disc.castShadow = true; disc.receiveShadow = true;
        disc.rotation.x = Math.PI / 2;
        disc.position.y = -d.T / 2;
        g.add(disc);

        // Store actual placed count so weight calc uses the real number
        g._actualHolesPlaced = placed;
        g._maxFittable = maxFittable;
        g._requestedHoles = requested;

        const holesLabel = requested > maxFittable
          ? `${placed} / ${requested} (max ${maxFittable} fit)`
          : `${placed}`;

        g._dims = { "⌀ OD": `${d.OD} mm`, "Thickness": `${d.T} mm`, "Hole ⌀": `${d.tubeHoleDia} mm`, "Holes": holesLabel };
        g._bbox = { L: d.OD, W: d.OD, H: d.T };
        return g;
      },

      _flange(d, mat) {
        const g = new THREE.Group();

        // Build flange ring profile with central bore AND bolt holes as true through-holes
        const ringShape = new THREE.Shape();
        ringShape.absarc(0, 0, d.OD / 2, 0, Math.PI * 2, false);

        // Central bore hole
        const ringHole = new THREE.Path();
        ringHole.absarc(0, 0, d.ID / 2, 0, Math.PI * 2, true);
        ringShape.holes.push(ringHole);

        // Bolt holes as through-holes in the shape profile
        if (d.numBolts > 0 && d.boltDia > 0) {
          const boltR = d.boltDia / 2;
          const boltPCD = (d.OD + d.ID) / 2 * 0.9;
          for (let i = 0; i < d.numBolts; i++) {
            const a = (2 * Math.PI / d.numBolts) * i;
            const cx = Math.cos(a) * boltPCD / 2;
            const cy = Math.sin(a) * boltPCD / 2;
            const boltHole = new THREE.Path();
            boltHole.absarc(cx, cy, boltR, 0, Math.PI * 2, true);
            ringShape.holes.push(boltHole);
          }
        }

        const ringGeo = new THREE.ExtrudeGeometry(ringShape, { depth: d.T, bevelEnabled: false, curveSegments: 64 });
        const ring = new THREE.Mesh(ringGeo, mat);
        ring.castShadow = true; ring.receiveShadow = true;
        ring.rotation.x = Math.PI / 2;
        ring.position.y = d.T / 2;
        g.add(ring);

        // Hub (tapered solid ring extending from the flange face)
        if (d.hubLength > 0) {
          const hubOR_top = d.ID / 2 + d.T * 0.4;
          const hubOR_bot = d.ID / 2 + d.T * 0.15;
          const hubIR = d.ID / 2;

          const pts = [];
          pts.push(new THREE.Vector2(hubIR, 0));
          pts.push(new THREE.Vector2(hubOR_bot, 0));
          pts.push(new THREE.Vector2(hubOR_top, d.hubLength));
          pts.push(new THREE.Vector2(hubIR, d.hubLength));
          pts.push(new THREE.Vector2(hubIR, 0));

          const hubGeo = new THREE.LatheGeometry(pts, 64);
          const hubMesh = new THREE.Mesh(hubGeo, mat);
          hubMesh.castShadow = true; hubMesh.receiveShadow = true;
          hubMesh.position.y = d.T / 2;
          g.add(hubMesh);
        }

        g._dims = { "⌀ OD": `${d.OD} mm`, "⌀ ID (Bore)": `${d.ID} mm`, "Thk": `${d.T} mm`, "Hub L": `${d.hubLength || 0} mm`, "Bolts": `${d.numBolts || 0}` };
        g._bbox = { L: d.OD, W: d.OD, H: d.T + (d.hubLength || 0) };
        return g;
      },

      _cone(d, mat) {
        const g = new THREE.Group();
        const smallR = (d.smallEndID + d.T) / 2;
        const largeR = (d.largeEndID + d.T) / 2;
        const smallIR = d.smallEndID / 2;
        const largeIR = d.largeEndID / 2;
        const H = d.H;

        // Outer cone frustum
        const outerGeo = new THREE.CylinderGeometry(smallR, largeR, H, 64, 1, true);
        const outerMesh = new THREE.Mesh(outerGeo, mat);
        outerMesh.castShadow = true; outerMesh.receiveShadow = true;
        g.add(outerMesh);

        // Inner cone frustum (bore)
        const innerMat = mat.clone();
        innerMat.side = THREE.BackSide;
        const innerGeo = new THREE.CylinderGeometry(Math.max(smallIR, 0.01), largeIR, H, 64, 1, true);
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        g.add(innerMesh);

        // Top annular ring (small end)
        const topRing = new THREE.RingGeometry(Math.max(smallIR, 0.01), smallR, 64);
        const topMesh = new THREE.Mesh(topRing, mat);
        topMesh.position.y = H / 2;
        topMesh.rotation.x = -Math.PI / 2;
        g.add(topMesh);

        // Bottom annular ring (large end)
        const botRing = new THREE.RingGeometry(largeIR, largeR, 64);
        const botMesh = new THREE.Mesh(botRing, mat);
        botMesh.position.y = -H / 2;
        botMesh.rotation.x = Math.PI / 2;
        g.add(botMesh);

        const OD_large = d.largeEndID + 2 * d.T;
        const OD_small = d.smallEndID + 2 * d.T;
        g._dims = { "⌀ Large ID": `${d.largeEndID} mm`, "⌀ Small ID": `${d.smallEndID} mm`, "Height": `${d.H} mm`, "Thk": `${d.T} mm`, "PTC": `${d.ptcSize || 0} mm` };
        g._bbox = { L: OD_large, W: OD_large, H: d.H };
        return g;
      },

      _dishedEnd(d, mat) {
        const g = new THREE.Group();
        const t = d.T;
        const ID = d.ID;
        const SF = d.SF || 0;

        const OD = ID + 2 * t;
        const Ro = OD;           // Crown Radius (outer)
        const ro = 0.1 * Ro;     // Knuckle Radius (outer)

        const R_cyl_o = OD / 2;
        const R_cyl_i = ID / 2;

        const xk = R_cyl_o - ro; // x-center of knuckle arc
        const yk = SF;           // y-center of knuckle arc

        const dy = Math.sqrt((Ro - ro) ** 2 - xk ** 2);
        const yc = yk - dy;      // y-center of crown arc

        const alpha = Math.acos(xk / (Ro - ro)); // transition angle in radians

        const pts = [];
        const numArcPts = 32;

        const ri = Math.max(ro - t, 0.01);
        const Ri = Math.max(Ro - t, 0.01);

        // 1. Inner Crown (from pole down to transition)
        for (let i = 0; i <= numArcPts; i++) {
          const theta = Math.PI / 2 - (Math.PI / 2 - alpha) * (i / numArcPts);
          pts.push(new THREE.Vector2(Ri * Math.cos(theta), yc + Ri * Math.sin(theta)));
        }

        // 2. Inner Knuckle (from transition down to equator)
        for (let i = 1; i <= numArcPts; i++) {
          const theta = alpha - alpha * (i / numArcPts);
          pts.push(new THREE.Vector2(xk + ri * Math.cos(theta), yk + ri * Math.sin(theta)));
        }

        // 3. Inner Straight Flange (down to 0)
        if (SF > 0) {
          pts.push(new THREE.Vector2(R_cyl_i, 0));
        }

        // 4. Bottom edge (across to outer)
        pts.push(new THREE.Vector2(R_cyl_o, 0));

        // 5. Outer Straight Flange (up to SF)
        if (SF > 0) {
          pts.push(new THREE.Vector2(R_cyl_o, SF));
        }

        // 6. Outer Knuckle (from equator up to transition)
        for (let i = 1; i <= numArcPts; i++) {
          const theta = alpha * (i / numArcPts);
          pts.push(new THREE.Vector2(xk + ro * Math.cos(theta), yk + ro * Math.sin(theta)));
        }

        // 7. Outer Crown (from transition up to pole)
        for (let i = 1; i <= numArcPts; i++) {
          const theta = alpha + (Math.PI / 2 - alpha) * (i / numArcPts);
          pts.push(new THREE.Vector2(Ro * Math.cos(theta), yc + Ro * Math.sin(theta)));
        }

        // Generate Lathe
        const geo = new THREE.LatheGeometry(pts, 64);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;

        // Rotate 180 degrees to make it a dome instead of a bowl
        mesh.rotation.x = Math.PI;

        const totalH = (yc + Ro);
        // Center the inverted dished end vertically
        mesh.position.y = totalH / 2;
        g.add(mesh);

        const depthOfHead = totalH - SF - t;
        g._dims = {
          "⌀ ID": `${ID} mm`,
          "Thk": `${t} mm`,
          "Straight Face": `${SF} mm`,
          "CR": `${Ro.toFixed(1)} mm`,
          "KR": `${ro.toFixed(1)} mm`,
          "Depth": `${depthOfHead.toFixed(1)} mm`
        };
        g._bbox = { L: OD, W: OD, H: totalH };
        return g;
      },

      _nozzle(d, mat) {
        const g = new THREE.Group();
        const ID = d.ID;
        const hubThk = d.hubThk;
        const neckThk = d.neckThk;
        const shell = d.shell;       // H1
        const hubHeight = d.hubHeight; // feeds H2
        const R = d.R;

        // Derived dimensions per WEIGHT_FORMULAS
        const D2 = ID;                           // Inner diameter
        const D1 = ID + 2 * neckThk;             // Neck OD
        const D = ID + 2 * hubThk;               // Hub OD (full OD)
        const H1 = shell;
        const H2 = shell + hubHeight;
        const H3 = hubThk - neckThk;
        const H = H1 + H2 + H3;
        const H4 = R - Math.sqrt(Math.max(R * R - (D / 2) * (D / 2), 0));

        // Outer profile points (counter-clockwise relative to Y axis, from top inner to top outer to bottom outer)
        const outerPts = [];
        const innerR = D2 / 2;
        const neckR = D1 / 2;
        const hubR = D / 2;
        
        // y(x) function for the vessel surface curve (negative Y to reach the curving away cylinder)
        const curveY = (x) => Math.sqrt(Math.max(R * R - x * x, 0)) - R;

        // Top inner
        outerPts.push(new THREE.Vector2(innerR, H));
        
        // Down the inner bore
        outerPts.push(new THREE.Vector2(innerR, curveY(innerR)));

        // Curve outwards from innerR to hubR along the vessel surface
        const numArcPts = 16;
        for (let i = 1; i <= numArcPts; i++) {
          const frac = i / numArcPts;
          const x = innerR + (hubR - innerR) * frac;
          outerPts.push(new THREE.Vector2(x, curveY(x)));
        }
        
        // Up the hub outside
        outerPts.push(new THREE.Vector2(hubR, H2));
        
        // Taper to neck
        outerPts.push(new THREE.Vector2(neckR, H2 + H3));
        
        // Up the neck outside
        outerPts.push(new THREE.Vector2(neckR, H));
        
        // Close loop at top
        outerPts.push(new THREE.Vector2(innerR, H));

        const nozzleGeo = new THREE.LatheGeometry(outerPts, 64);
        const nozzleMesh = new THREE.Mesh(nozzleGeo, mat);
        nozzleMesh.castShadow = true; nozzleMesh.receiveShadow = true;
        // No Y-shift here. The mathematical base (Y=0) is exactly where the center of the curve sits.
        g.add(nozzleMesh);

        // Inner bore is already formed by the LatheGeometry profile.

        g._dims = {
          "⌀ ID (D2)": `${D2.toFixed(1)} mm`,
          "⌀ Neck OD (D1)": `${D1.toFixed(1)} mm`,
          "⌀ Hub OD (D)": `${D.toFixed(1)} mm`,
          "H (total)": `${H.toFixed(1)} mm`,
          "H4 (sagitta)": `${H4.toFixed(1)} mm`,
          "R": `${R} mm`
        };
        g._bbox = { L: D, W: D, H: H + H4 };
        return g;
      }
    };

    // ============================================================