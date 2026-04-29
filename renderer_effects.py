import re

path = "js/renderer.js"

with open(path, "r", encoding="windows-1252") as f:
    content = f.read()

# Replace drawBox
new_drawBox = """  function drawBox(box, ox, oy) {
    if (!box.active) return;
    const x = Math.round(box.x + ox);
    const y = Math.round(box.y + oy);

    const grad = ctx.createLinearGradient(x, y, x, y + box.h);
    grad.addColorStop(0, '#4a4a6a');
    grad.addColorStop(1, '#2d2d4c');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, box.w, box.h);

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, box.w, box.h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x+2, y+2, box.w-4, box.h-4);

    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4);
    ctx.lineTo(x + box.w - 4, y + box.h - 4);
    ctx.moveTo(x + box.w - 4, y + 4);
    ctx.lineTo(x + 4, y + box.h - 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }"""

# Replace drawButton
new_drawButton = """  function drawButton(btn, ox, oy) {
    const x = Math.round(btn.x + ox);
    const y = Math.round(btn.y + oy);
    const col = btn.pressed ? COLOR.button : COLOR.buttonOff;

    ctx.fillStyle = '#22222a';
    ctx.fillRect(x, y, btn.w, btn.h);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, btn.w, btn.h);

    if (btn.pressed) { glow(COLOR.button, 15); }
    ctx.fillStyle = col;
    const pad = btn.pressed ? 8 : 4;
    ctx.fillRect(x + pad, y + pad, btn.w - pad*2, btn.h - pad*2);
    noGlow();
  }"""

# Replace drawPortal
new_drawPortal = """  function drawPortal(portal, ox, oy, time) {
    const x = Math.round(portal.x + ox + portal.w / 2);
    const y = Math.round(portal.y + oy + portal.h / 2);
    const r = portal.w / 2;
    
    const col = portal.active ? COLOR.mergedGlow : COLOR.lightGlow;
    glow(col, 30);
    
    let grad = ctx.createRadialGradient(x, y, 0, x, y, r * 1.5);
    grad.addColorStop(0, portal.active ? 'rgba(255,255,255,1)' : 'rgba(200,200,200,0.8)');
    grad.addColorStop(0.2, portal.active ? 'rgba(155,107,255,0.8)' : 'rgba(90,180,255,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x, y, r * (1 + 0.15 * Math.sin(time * 3)), 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (portal.active) {
       ctx.beginPath();
       ctx.arc(x, y, r * (0.8 + 0.1 * Math.cos(time * 5)), 0, Math.PI * 2);
       ctx.strokeStyle = 'rgba(255,255,255,0.5)';
       ctx.lineWidth = 4;
       ctx.stroke();
    }
    noGlow();
  }"""

content = re.sub(r'  function drawBox\(box, ox, oy\) \{.+?  \}', new_drawBox, content, flags=re.DOTALL)
content = re.sub(r'  function drawButton\(btn, ox, oy\) \{.+?  \}', new_drawButton, content, flags=re.DOTALL)
content = re.sub(r'  function drawPortal\(portal, ox, oy, time\) \{.+?  \}', new_drawPortal, content, flags=re.DOTALL)

with open(path, "w", encoding="windows-1252") as f:
    f.write(content)

print("Done updating renderer.js with regex")
