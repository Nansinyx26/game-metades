from PIL import Image
import os

def make_transparent(input_path, output_path, threshold=30):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        # Calculate brightness
        brightness = (r + g + b) / 3
        
        # If it's very dark, make it transparent
        if brightness < threshold:
            # Gradually increase alpha for a softer transition
            alpha = int((brightness / threshold) * 255) if brightness > (threshold / 2) else 0
            new_data.append((r, g, b, alpha))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Processed: {output_path}")

# Source paths from the generated assets
mid_src = r"C:\Users\Usuario1\.gemini\antigravity\brain\46e99def-8ded-4737-b165-c0541fc9de5c\bg_act2_mid_new_1777386951611.png"
near_src = r"C:\Users\Usuario1\.gemini\antigravity\brain\46e99def-8ded-4737-b165-c0541fc9de5c\bg_act2_near_new_1777387064022.png"

# Destination paths
mid_dst = r"c:\Users\Usuario1\Downloads\Two to One 3.0 (2)\Two to One 2.0\files\assets_background\act2\bg_act2_mid.png"
near_dst = r"c:\Users\Usuario1\Downloads\Two to One 3.0 (2)\Two to One 2.0\files\assets_background\act2\bg_act2_near.png"

make_transparent(mid_src, mid_dst, threshold=40)
make_transparent(near_src, near_dst, threshold=50)
