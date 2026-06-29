    const MATERIALS = {
      steel: { label: "Carbon Steel", density: 7.85, color: 0x6e7e8c, roughness: 0.25, metalness: 0.75, allowCode: "CS" },
      ss: { label: "Stainless Steel", density: 8.00, color: 0xa8bcc8, roughness: 0.20, metalness: 0.92, allowCode: "SS" },
      inconel: { label: "Inconel", density: 8.50, color: 0x8b9ca8, roughness: 0.22, metalness: 0.88, allowCode: "INC" },
      aluminium: { label: "Aluminium", density: 2.71, color: 0xc0cad4, roughness: 0.28, metalness: 0.85, allowCode: "AL" },
      copper: { label: "Copper", density: 8.96, color: 0xb87333, roughness: 0.15, metalness: 0.90, allowCode: "CU" },
    };
    const MAT_DOTS = { steel: "#6e7e8c", ss: "#c0d0dc", inconel: "#8b9ca8", aluminium: "#dde6ec", copper: "#B87333" };

    // ============================================================