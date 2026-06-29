const fs = require('fs');

const content = fs.readFileSync('3_d_model.html', 'utf8');
const lines = content.split('\n');

if (!fs.existsSync('js')) fs.mkdirSync('js');

function extract(start, end) {
    return lines.slice(start - 1, end).join('\n');
}

fs.writeFileSync('js/config.js', extract(1245, 1433));
fs.writeFileSync('js/materials.js', extract(1434, 1443));
fs.writeFileSync('js/shapes.js', extract(1692, 2291));
fs.writeFileSync('js/weights.js', extract(2291, 2529));
fs.writeFileSync('js/validation.js', extract(2529, 2548));

let mainJS = '';
mainJS += 'let weldMode = false;\nlet weldAssemblyGroup = null;\n';

// Add the proxy interceptor directly here safely:
mainJS += `
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
`;

mainJS += extract(1444, 1691);  
mainJS += '\n';
mainJS += extract(2549, 3219);  
mainJS += '\n';
mainJS += extract(4903, 4915);  

fs.writeFileSync('js/main.js', mainJS);

console.log('JS files written:');
['config.js', 'materials.js', 'shapes.js', 'weights.js', 'validation.js', 'main.js'].forEach(f => {
    const stat = fs.statSync('js/' + f);
    console.log('  js/' + f + ': ' + stat.size + ' bytes');
});

const cssBlock = extract(9, 1025);

let bodyPart1 = extract(1028, 1082); 
let bodyPart2 = extract(1136, 1240); 

bodyPart1 = bodyPart1.replace(/<button class="weld-mode-btn" id="weldModeBtn".*?<\/button>/s, '');
bodyPart1 = bodyPart1.replace(/<button class="weld-mode-btn" id="coordModeBtn".*?<\/button>\s*<div class="topbar-divider"><\/div>/s, '');
bodyPart1 = bodyPart1.replace(/<div class="panel-section">\s*<div class="panel-section-title">Category<\/div>[\s\S]*?<\/select>\s*<\/div>/m, '');
bodyPart1 = bodyPart1.replace(/<div class="panel-section">\s*<div class="panel-section-title">Material<\/div>\s*<div class="mat-row" id="matRow"><\/div>\s*<\/div>/m, '');
bodyPart2 = bodyPart2.replace(/\s*<!-- COORD PANEL -->[\s\S]*?<\/div>\s*<\/div>/m, '');

const bodyHTML = bodyPart1 + '\n' + bodyPart2;

const components = [
    { key: 'tube', file: 'tube.html', title: 'Tube - 3D Material Estimator' },
    { key: 'pipe', file: 'pipe.html', title: 'Pipe - 3D Material Estimator' },
    { key: 'plate', file: 'plate.html', title: 'Plate - 3D Material Estimator' },
    { key: 'shellPlateRolled', file: 'shell_plate_rolled.html', title: 'Shell Plate (Rolled) - 3D Material Estimator' },
    { key: 'shellPlateAnnular', file: 'shell_plate_annular.html', title: 'Shell Plate (Annular) - 3D Material Estimator' },
    { key: 'forging', file: 'forging.html', title: 'Forging - 3D Material Estimator' },
    { key: 'rod', file: 'rod.html', title: 'Rod - 3D Material Estimator' },
    { key: 'stud', file: 'stud.html', title: 'Stud - 3D Material Estimator' },
    { key: 'tubesheet', file: 'tubesheet.html', title: 'Tubesheet - 3D Material Estimator' },
    { key: 'shellFlange', file: 'shell_flange.html', title: 'Shell Flange - 3D Material Estimator' },
    { key: 'cone', file: 'cone.html', title: 'Cone - 3D Material Estimator' },
    { key: 'dishedEnd', file: 'dished_end.html', title: 'Dished End - 3D Material Estimator' },
    { key: 'nozzle', file: 'nozzle.html', title: 'Nozzle - 3D Material Estimator' }
];

components.forEach(comp => {
    const html = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${comp.title}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
  ${cssBlock}
</head>

${bodyHTML}

  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
  <script src="js/config.js"><\/script>
  <script src="js/materials.js"><\/script>
  <script src="js/shapes.js"><\/script>
  <script src="js/weights.js"><\/script>
  <script src="js/validation.js"><\/script>
  <script src="js/main.js"><\/script>
  <script>
    currentShape = "${comp.key}";
  <\/script>
</body>
</html>
`;
    fs.writeFileSync(comp.file, html);
    console.log('Created ' + comp.file + ' (' + html.length + ' bytes)');
});
