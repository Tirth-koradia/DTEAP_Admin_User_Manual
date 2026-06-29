    const SHAPE_CONFIG = {
      tube: {
        label: "Tube",
        inputs: [
          { id: "OD", label: "Outer Diameter (OD)", unit: "mm", min: 0.1 },
          { id: "nominalThk", label: "Nominal Thickness", unit: "mm", min: 0.01 },
          { id: "L", label: "Length", unit: "mm", min: 1 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) { const id = v.OD - 2 * v.nominalThk; return id > 0 ? "" : "ID must be > 0 (OD too small for Thickness)"; },
        geo3d: "tube"
      },
      plate: {
        label: "Plate",
        inputs: [
          { id: "L", label: "Length", unit: "mm", min: 1 },
          { id: "W", label: "Width", unit: "mm", min: 1 },
          { id: "T", label: "Thickness", unit: "mm", min: 0.1 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) { return ""; },
        geo3d: "plate"
      },
      shellPlateRolled: {
        label: "Shell Plate (Rolled)",
        inputs: [
          { id: "ID", label: "Inner Diameter (ID)", unit: "mm", min: 1 },
          { id: "T", label: "Thickness", unit: "mm", min: 0.1 },
          { id: "W", label: "Width (Height)", unit: "mm", min: 1 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) { return ""; },
        geo3d: "shellRolled"
      },
      shellPlateAnnular: {
        label: "Shell Plate (Annular)",
        inputs: [
          { id: "OD", label: "Outer Diameter (OD)", unit: "mm", min: 1 },
          { id: "ID", label: "Inner Diameter (ID)", unit: "mm", min: 1 },
          { id: "L", label: "Length", unit: "mm", min: 1 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) { return v.OD > v.ID ? "" : "OD must be > ID"; },
        geo3d: "shellAnnular"
      },
      pipe: {
        label: "Pipe",
        inputs: [
          { id: "OD", label: "Outer Diameter (OD)", unit: "mm", min: 0.1 },
          { id: "T", label: "Wall Thickness", unit: "mm", min: 0.01 },
          { id: "L", label: "Length", unit: "mm", min: 1 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) { return v.OD - 2 * v.T > 0 ? "" : "Wall too thick — ID would be ≤ 0"; },
        geo3d: "pipe"
      },
      forging: {
        label: "Forging",
        inputs: [
          { id: "OD", label: "Outer Diameter (OD)", unit: "mm", min: 0.1 },
          { id: "T", label: "Thickness / Height", unit: "mm", min: 0.1 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) { return ""; },
        geo3d: "forging"
      },
      rod: {
        label: "Rod",
        inputs: [
          { id: "OD", label: "Diameter (OD)", unit: "mm", min: 0.1 },
          { id: "L", label: "Length", unit: "mm", min: 1 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) { return ""; },
        geo3d: "rod"
      },
      stud: {
        label: "Stud",
        inputs: [
          { id: "OD", label: "Stud Diameter (OD)", unit: "mm", min: 0.1 },
          { id: "L", label: "Total Length", unit: "mm", min: 1 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) { return ""; },
        geo3d: "stud"
      },
      tubesheet: {
        label: "Tubesheet",
        inputs: [
          { id: "OD", label: "Outer Diameter (OD)", unit: "mm", min: 1 },
          { id: "T", label: "Thickness (T)", unit: "mm", min: 1 },
          { id: "tubeHoleDia", label: "Tube Hole Dia", unit: "mm", min: 0.1 },
          { id: "tubeHoleCount", label: "Tube Hole Count", unit: "pcs", min: 0, integer: true },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) {
          if (v.tubeHoleDia >= v.OD) return "Tube hole Dia must be < OD";
          return "";
        },
        warn(v) {
          // Non-blocking warning: requested holes exceed what can physically fit
          if (!v.tubeHoleDia || !v.OD || v.tubeHoleDia <= 0) return "";
          const holeR = v.tubeHoleDia / 2;
          const minPitch = holeR * 3;
          const R = Math.max(0, v.OD / 2 - holeR * 1.5);
          let maxFit = 0;
          let rowSp = minPitch * Math.sqrt(3) / 2;
          let maxRow = Math.ceil(R / rowSp);
          for (let row = -maxRow; row <= maxRow; row++) {
            let z = row * rowSp;
            let xOff = (Math.abs(row) % 2 === 1) ? minPitch / 2 : 0;
            let maxCol = Math.ceil(R / minPitch) + 1;
            for (let col = -maxCol; col <= maxCol; col++) {
              let x = col * minPitch + xOff;
              if (x * x + z * z <= R * R + 0.001) maxFit++;
            }
          }
          if ((v.tubeHoleCount || 0) > maxFit)
            return `⚠ Hole count (${v.tubeHoleCount}) exceeds max that fit (${maxFit}). Displaying & calculating with ${maxFit} holes.`;
          return "";
        },
        geo3d: "tubesheet"
      },
      shellFlange: {
        label: "Shell Flange",
        inputs: [
          { id: "OD", label: "Flange OD", unit: "mm", min: 1 },
          { id: "ID", label: "Bore ID", unit: "mm", min: 1 },
          { id: "T", label: "Flange Thickness", unit: "mm", min: 1 },
          { id: "hubLength", label: "Hub Length", unit: "mm", min: 0 },
          { id: "numBolts", label: "No. of Bolts", unit: "pcs", min: 0, integer: true },
          { id: "boltDia", label: "Bolt Dia", unit: "mm", min: 0 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) { return v.OD > v.ID ? "" : "OD must be > ID"; },
        geo3d: "flange"
      },
      cone: {
        label: "Cone",
        inputs: [
          { id: "smallEndID", label: "Small End ID", unit: "mm", min: 0 },
          { id: "largeEndID", label: "Large End ID", unit: "mm", min: 1 },
          { id: "H", label: "Height", unit: "mm", min: 1 },
          { id: "T", label: "Thickness", unit: "mm", min: 0.1 },
          { id: "ptcSize", label: "PTC (Points of Tangency Circle)", unit: "mm", min: 0 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) {
          if (v.largeEndID <= v.smallEndID) return "Large End ID must be > Small End ID";
          return "";
        },
        geo3d: "cone"
      },
      dishedEnd: {
        label: "Dished End",
        inputs: [
          { id: "ID", label: "Dished End ID", unit: "mm", min: 1 },
          { id: "T", label: "Thickness", unit: "mm", min: 0.1 },
          { id: "SF", label: "Straight Face", unit: "mm", min: 0 },
          { id: "ptcSize", label: "PTC (Points of Tangency Circle)", unit: "mm", min: 0 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) { return ""; },
        geo3d: "dishedEnd"
      },
      nozzle: {
        label: "Nozzle",
        inputs: [
          { id: "ID", label: "Inner Diameter (ID)", unit: "mm", min: 1 },
          { id: "hubThk", label: "Hub Thickness", unit: "mm", min: 0.1 },
          { id: "neckThk", label: "Neck Thickness", unit: "mm", min: 0.1 },
          { id: "shell", label: "Shell (H1)", unit: "mm", min: 1 },
          { id: "hubHeight", label: "Hub Height", unit: "mm", min: 0 },
          { id: "R", label: "R (Crown/Shell Radius)", unit: "mm", min: 1 },
          { id: "Q", label: "Quantity", unit: "pcs", min: 1, integer: true, isQty: true },
        ],
        validate(v) {
          if (v.hubThk < v.neckThk) return "Hub Thickness must be ≥ Neck Thickness";
          const D = v.ID + 2 * v.hubThk;
          if (v.R < D / 2) return "R must be ≥ OD/2 (" + (D / 2).toFixed(1) + " mm)";
          return "";
        },
        geo3d: "nozzle"
      }
    };

    // ============================================================
    // MATERIAL PRESETS
    // ============================================================