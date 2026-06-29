const fs = require('fs');
const html = fs.readFileSync('dished_end.html', 'utf8');
const checks = ['<style>', '</style>', '</head>', '<body>', 'canvas3d', 'canvas-wrap', 'panel-left', 'dynFields', 'matRow'];
checks.forEach(c => {
    const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const count = (html.match(new RegExp(escaped, 'g')) || []).length;
    console.log(c + ': ' + count + ' occurrence(s)');
});
