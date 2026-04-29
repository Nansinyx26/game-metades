from PIL import Image
import os
import sys

def remove_green(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Skipping {input_path}, not found.")
        return
        
    try:
        img = Image.open(input_path).convert("RGBA")
        data = img.getdata()
        
        new_data = []
        for item in data:
            # item is (R, G, B, A)
            r, g, b, a = item
            
            # Simple green thresholding 
            # If G is significantly higher than R and B, we make it transparent
            if g > 150 and r < 100 and b < 100:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
                
        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Processed and saved: {output_path}")
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

def main():
    assets_dir = r"c:\Users\Usuario1\Downloads\metaDES 3.0\metaDES 3.0\metaDES 2.0\files\assets_background"
    
    # We generated 5 images in the artifact dir, I need the user's artifact dir
    # I'll pass the paths as arguments
    if len(sys.argv) < 2:
        return
        
    for arg in sys.argv[1:]:
        if ":" in arg: 
            # It's an absolute path
            base_name = os.path.basename(arg)
            # Remove timestamp part logic: e.g. bg_act1_mid_12345.png -> bg_act1_mid.png
            parts = base_name.split("_")
            out_name = parts[0] + "_" + parts[1] + "_" + parts[2] + ".png" if len(parts) >= 3 else base_name
            out_path = os.path.join(assets_dir, out_name)
            
            # If it's a 'far' layer, just copy it
            if "far" in out_name:
                import shutil
                shutil.copy(arg, out_path)
                print(f"Copied: {out_path}")
            else:
                # Remove green
                remove_green(arg, out_path)

if __name__ == "__main__":
    main()
