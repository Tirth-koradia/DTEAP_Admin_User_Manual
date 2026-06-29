    // ============================================================
    // VALIDATION MANAGER
    // ============================================================
    const ValidationManager = {
      validate(shapeCfg, dims) {
        const errors = [];
        shapeCfg.inputs.forEach(inp => {
          if (inp.isQty) return;
          const v = dims[inp.id];
          if (v === undefined || v === null || isNaN(v)) { errors.push(`${inp.label} is required`); return; }
          if (v <= 0 && inp.min > 0) errors.push(`${inp.label} must be > 0`);
          if (v < inp.min) errors.push(`${inp.label} must be ≥ ${inp.min}`);
        });
        const crossErr = shapeCfg.validate(dims);
        if (crossErr) errors.push(crossErr);
        return errors;
      }
    };

    // ============================================================