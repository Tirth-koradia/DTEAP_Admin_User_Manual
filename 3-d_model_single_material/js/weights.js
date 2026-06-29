    // ============================================================
    // WEIGHT CALCULATION ENGINE
    // ============================================================
    const WeightCalc = {
      PI: Math.PI,
      getAllow(mat) {
        const code = MATERIALS[mat].allowCode;
        if (["CS", "AS", "MS"].includes(code)) return 10;
        if (["SS", "Duplex", "Inconel"].includes(code)) return 15;
        return 0;
      },
      extraTubeLadder(Q) {
        if (Q <= 1000) return 2;
        if (Q <= 2000) return 4;
        if (Q <= 3000) return 6;
        if (Q <= 4000) return 8;
        if (Q <= 10000) return 10;
        if (Q <= 15000) return 15;
        return 18;
      },
      calc(shape, dims, matKey, densityOverride) {
        const rho = densityOverride !== undefined && densityOverride !== null ? densityOverride : MATERIALS[matKey].density;
        const Q = dims.Q || 1;
        const PI = this.PI;

        switch (shape) {
          case "tube": {
            const basis = 1.0;
            const effThk = dims.nominalThk * basis;
            const ID = dims.OD - 2 * effThk;
            const vol = (PI / 4) * (dims.OD ** 2 - ID ** 2);
            const wpu = vol * rho / 1000 * (dims.L / 1000);
            const extras = this.extraTubeLadder(Q);
            const raw = wpu * (Q + extras);
            const fin = wpu * Q;
            return { raw, finished: fin, formula: `wpu = (π/4)×(OD²−ID²)×ρ/1000×(L/1000)\nRaw = wpu×(Q+${extras} extras)\nFinished = wpu×Q` };
          }
          case "plate": {
            const allow = this.getAllow(matKey);
            const rawL = dims.L + allow, rawW = dims.W + allow;
            const raw = rawL * rawW * dims.T * rho * Q * 1e-6;
            const fin = dims.L * dims.W * dims.T * rho * Q * 1e-6;
            return { raw, finished: fin, formula: `Raw = (L+${allow}) × (W+${allow}) × T × ρ × Q × 10⁻⁶\nFinished = L×W×T×ρ×Q×10⁻⁶` };
          }
          case "shellRolled": {
            const circ = (dims.ID + dims.T) * PI;
            const EB = 1.4 * dims.T * 2;
            const allow = this.getAllow(matKey);
            const rawLen = circ + EB + allow;
            const rawWid = dims.W + allow;
            const raw = rawLen * rawWid * dims.T * rho * Q * 1e-6;
            const fin = circ * dims.W * dims.T * rho * Q * 1e-6;
            return { raw, finished: fin, formula: `circ = (ID+T)×π\nEB = ebAllowance×T×2\nRaw = (circ+EB+${allow})×(W+${allow})×T×ρ×Q×10⁻⁶\nFinished = circ×W×T×ρ×Q×10⁻⁶` };
          }
          case "shellAnnular": {
            const T_d = (dims.OD - dims.ID) / 2;
            const allow = this.getAllow(matKey);
            const k = (PI / 4) * (dims.OD ** 2 - dims.ID ** 2) * rho * T_d * Q * 1e-6;
            const raw = k * dims.L;
            const fin = k * (dims.L + allow);
            return { raw, finished: fin, formula: `T=(OD−ID)/2\nk=(π/4)×(OD²−ID²)×ρ×T×Q×10⁻⁶\nRaw = k×L\nFinished = k×(L+${allow})` };
          }
          case "pipe": {
            const ID = dims.OD - 2 * dims.T;
            const w = (PI / 4) * (dims.OD ** 2 - ID ** 2) * dims.T * rho * Q * 1e-6;
            return { raw: w, finished: w, formula: `ID = OD−2×T\nWeight = (π/4)×(OD²−ID²)×T×ρ×Q×10⁻⁶` };
          }
          case "forging": {
            const w = (PI / 4) * dims.OD ** 2 * dims.T * rho * Q * 1e-6;
            return { raw: w, finished: w, formula: `Weight = (π/4)×OD²×T×ρ×Q×10⁻⁶` };
          }
          case "rod": {
            const w = (PI / 4) * dims.OD ** 2 * dims.L * rho * Q * 1e-6;
            return { raw: w, finished: w, formula: `Weight = (π/4)×OD²×L×ρ×Q×10⁻⁶` };
          }
          case "stud": {
            const w = (PI / 4) * dims.OD ** 2 * dims.L * rho * Q * 1e-6;
            return { raw: w, finished: w, formula: `Weight = (π/4)×OD²×L×ρ×Q×10⁻⁶` };
          }
          case "tubesheet": {
            const disc = (PI / 4) * dims.OD ** 2 * dims.T * rho * Q * 1e-6;
            // Use actual placed holes (capped to max fittable) for weight calc
            const holeR = dims.tubeHoleDia / 2;
            const minPitch = holeR * 3;
            const R = Math.max(0, dims.OD / 2 - holeR * 1.5);
            let maxFittable = 0;
            let rowSp = minPitch * Math.sqrt(3) / 2;
            let maxRow = Math.ceil(R / rowSp);
            for (let row = -maxRow; row <= maxRow; row++) {
              let z = row * rowSp;
              let xOff = (Math.abs(row) % 2 === 1) ? minPitch / 2 : 0;
              let maxCol = Math.ceil(R / minPitch) + 1;
              for (let col = -maxCol; col <= maxCol; col++) {
                let x = col * minPitch + xOff;
                if (x * x + z * z <= R * R + 0.001) maxFittable++;
              }
            }
            const effectiveHoleCount = Math.min(dims.tubeHoleCount || 0, maxFittable);
            const tubeHoles = (PI / 4) * dims.tubeHoleDia ** 2 * dims.T * effectiveHoleCount * rho * 1e-6;
            const raw = disc;
            const fin = disc - tubeHoles;
            const holeNote = (dims.tubeHoleCount || 0) > maxFittable
              ? `\n⚠ Requested ${dims.tubeHoleCount} holes, but only ${maxFittable} fit — using ${effectiveHoleCount} for weight.`
              : ``;
            return { raw, finished: fin, formula: `Disc = (π/4)×OD²×T×ρ×Q×10⁻⁶\nTube holes = (π/4)×holeDia²×T×${effectiveHoleCount} holes×ρ×10⁻⁶\nRaw = Disc (no holes)\nFinished = Disc − Tube holes${holeNote}` };
          }
          case "shellFlange": {
            const ring = (PI / 4) * (dims.OD ** 2 - dims.ID ** 2) * dims.T * rho * Q * 1e-6;
            const bolts = dims.numBolts > 0 ? (PI / 4) * dims.boltDia ** 2 * dims.T * rho * 1e-6 * (dims.numBolts || 0) * Q : 0;
            const G0 = dims.T * 0.15, G1 = dims.T * 0.4;
            const hub = dims.hubLength > 0 ? 0.5 * (G1 + G0) * dims.hubLength * PI * (dims.ID + dims.T * 0.3) * rho * 1e-6 * Q : 0;
            const raw = (PI / 4) * (dims.OD ** 2 - dims.ID ** 2) * (dims.T + (dims.hubLength || 0)) * rho * Q * 1e-6;
            const fin = ring - bolts + hub;
            return { raw, finished: fin, formula: `Ring=(π/4)×(OD²−ID²)×T×ρ×Q×10⁻⁶\nBolts=(π/4)×boltDia²×T×ρ×nBolts×Q×10⁻⁶\nHub=½×(G1+G0)×hubL×π×(ID+2J31)×ρ×10⁻⁶×Q\nRaw=(π/4)×(OD²−ID²)×(T+hubL)×ρ×Q×10⁻⁶\nFinished=Ring−Bolts+Hub` };
          }
          case "cone": {
            // Cone weight from developed-plate geometry (WEIGHT_FORMULAS §10)
            const smallEndID = dims.smallEndID || 0;
            const largeEndID = dims.largeEndID;
            const H = dims.H;
            const T = dims.T;
            const ptc = dims.ptcSize || 0;

            // Cutting allowance (simplified: CS/AS/MS=10, SS/Duplex/Inconel=15, else 0)
            const cutAllow = this.getAllow(matKey);

            // Developed-plate geometry per WEIGHT_FORMULAS
            const midSmallID = smallEndID > 0 ? smallEndID + T : 0;
            const midLargeID = largeEndID + T;

            const slant = H * (1 + midSmallID / (largeEndID - smallEndID));

            const bigRadius = Math.round(Math.sqrt(slant * slant + (midLargeID / 2) ** 2) * 100) / 100;
            const smallRadius = Math.round(Math.sqrt((slant - H) ** 2 + (midSmallID / 2) ** 2) * 100) / 100;

            const surfaceAngle = Math.round((midLargeID / bigRadius) * 180 * 100) / 100;
            const theta = surfaceAngle < 180 ? 0 : (360 - surfaceAngle) / 2;

            let plateLength, plateWidth;
            if (surfaceAngle < 180) {
              const halfAngleRad = (surfaceAngle / 2) * Math.PI / 180;
              plateLength = Math.round((bigRadius - smallRadius * Math.cos(halfAngleRad)) * 100) / 100
                + 2 * cutAllow + ptc;
              plateWidth = Math.round((2 * bigRadius * Math.sin(halfAngleRad)) * 100) / 100
                + 2 * cutAllow;
            } else {
              const thetaRad = theta * Math.PI / 180;
              plateLength = Math.round((bigRadius + bigRadius * Math.cos(thetaRad)) * 100) / 100
                + 2 * cutAllow + ptc;
              plateWidth = Math.round((2 * bigRadius) * 100) / 100
                + 2 * cutAllow;
            }

            const w = Math.round(plateLength * plateWidth * T * rho * 1e-6 * 100) / 100;
            const total = w * Q;
            return { raw: total, finished: total, formula: `Developed-plate geometry:\n  MidSmallID=${midSmallID.toFixed(1)}, MidLargeID=${midLargeID.toFixed(1)}\n  Slant=${slant.toFixed(1)}, BigR=${bigRadius}, SmallR=${smallRadius}\n  SurfAngle=${surfaceAngle}°\n  PlateL=${plateLength.toFixed(1)}, PlateW=${plateWidth.toFixed(1)}\nWeight = PlateL×PlateW×T×ρ×10⁻⁶\n  = ${plateLength.toFixed(1)}×${plateWidth.toFixed(1)}×${T}×${rho}×10⁻⁶\n  = ${w} kg (×${Q} = ${total.toFixed(2)} kg)` };
          }
          case "dishedEnd": {
            // Dished End Single Piece Forming (WEIGHT_FORMULAS §12)
            const ID = dims.ID;
            const t = dims.T;
            const SF = dims.SF || 0;
            const ptc = dims.ptcSize || 0;

            const CR = ID + 2 * t;
            const KR = 0.1 * CR;

            // Arc lengths (convert degrees to radians for multiplication)
            const A1 = (63.6112 * Math.PI / 180) * KR;
            const A2 = (52.7756 * Math.PI / 180) * CR;

            const blankDia = Math.round(2 * SF + 2 * A1 + A2);

            const w = Math.round((blankDia + ptc) * blankDia * t * rho / 1e6 * 100) / 100;
            const total = w * Q;
            return { raw: total, finished: total, formula: `Single Piece Torispherical:\n  CR = ID+2t = ${CR}\n  KR = 0.1×CR = ${KR.toFixed(1)}\n  A1 = 63.6112°×KR = ${A1.toFixed(1)}\n  A2 = 52.7756°×CR = ${A2.toFixed(1)}\n  BlankDia = round(2×SF+2×A1+A2) = ${blankDia}\nWeight = (BlankDia+PTC)×BlankDia×t×ρ/10⁶\n  = (${blankDia}+${ptc})×${blankDia}×${t}×${rho}/10⁶\n  = ${w} kg (×${Q} = ${total.toFixed(2)} kg)` };
          }
          case "nozzle": {
            // Simple nozzle weight (WEIGHT_FORMULAS §11)
            const ID = dims.ID;
            const hubThk = dims.hubThk;
            const neckThk = dims.neckThk;
            const shell = dims.shell;
            const hubHeight = dims.hubHeight || 0;
            const R = dims.R;

            // Derived dimensions
            const D2 = ID;
            const D1 = ID + 2 * neckThk;
            const D = ID + 2 * hubThk;
            const H1 = shell;
            const H2 = shell + hubHeight;
            const H3 = hubThk - neckThk;
            const H = H1 + H2 + H3;
            const H4 = R - Math.sqrt(Math.max(R * R - (D / 2) ** 2, 0));

            // V1
            const V1 = (PI / 4) * (D1 ** 2 - D2 ** 2) * (H1 + H3);
            // V2
            const V2 = (PI / 4) * (D ** 2 - D2 ** 2) * H2;
            // V3 — AS = ½·H3² / ((D/2)·ln(D/D1) − H3)
            let V3 = 0;
            if (H3 > 0 && D > D1 && D1 > 0) {
              const lnRatio = Math.log(D / D1);
              const denom = (D / 2) * lnRatio - H3;
              if (Math.abs(denom) > 0.001) {
                const AS = 0.5 * H3 * H3 / denom;
                V3 = PI * H3 * H3 * AS;
              }
            }
            // V4 — AW, AT, H4
            let V4 = 0;
            const AW = R - Math.sqrt(Math.max(R * R - (D2 / 2) ** 2, 0));
            if (hubThk > 0 && AW > 0 && D > D2 && D2 > 0) {
              const lnRatioD = Math.log(D / D2);
              const denomAT = (AW * D / (2 * hubThk)) * lnRatioD - AW;
              if (Math.abs(denomAT) > 0.001) {
                const AT = 0.5 * AW * hubThk / denomAT;
                V4 = 0.75 * (PI / 4) * (D ** 2 - D2 ** 2) * AW
                  + 0.5 * PI * (H4 - AW) * hubThk * AT;
              }
            }

            const finPerUnit = (V1 + V2 + V3 + V4) * rho * 1.1 * 1e-6;
            const finished = finPerUnit * Q;

            // Raw = hollow cylinder blank
            const totalLen = H + H4;
            const rawPerUnit = (PI / 4) * (D ** 2 - D2 ** 2) * totalLen * rho * 1e-6;
            const raw = rawPerUnit * Q;

            return { raw, finished, formula: `Nozzle Derived Dims:\n  D2=${D2}, D1=${D1}, D=${D}\n  H1=${H1}, H2=${H2}, H3=${H3}, H=${H}, H4=${H4.toFixed(2)}\n  AW=${AW.toFixed(2)}\nFinished = (V1+V2+V3+V4)×ρ×1.1×10⁻⁶\n  V1=${V1.toFixed(0)}, V2=${V2.toFixed(0)}, V3=${V3.toFixed(0)}, V4=${V4.toFixed(0)}\n  = ${finPerUnit.toFixed(4)} kg/pc (×${Q} = ${finished.toFixed(4)} kg)\nRaw = (π/4)×(D²−D2²)×(H+H4)×ρ×10⁻⁶\n  = ${rawPerUnit.toFixed(4)} kg/pc (×${Q} = ${raw.toFixed(4)} kg)` };
          }
          default: return { raw: 0, finished: 0, formula: "" };
        }
      }
    };

    // ============================================================