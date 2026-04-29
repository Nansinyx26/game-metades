from PIL import Image
import sys

def process_mid_layer(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
        W, H = img.size
        pixels = img.load()

        # Let's find common 'sky' colors by sampling the top row
        sky_colors = []
        for x in range(0, W, 10):
            r, g, b, a = pixels[x, 0]
            sky_colors.append((r, g, b))

        def is_sky(r, g, b):
            # check if it's close to any top edge color or generally dark blue/black
            for (sr, sg, sb) in sky_colors:
                if abs(r - sr) < 40 and abs(g - sg) < 40 and abs(b - sb) < 40:
                    return True
            return False

        # BFS from the top edge to remove contiguous sky
        q = []
        visited = set()
        for x in range(W):
            if is_sky(*pixels[x, 0][:3]):
                q.append((x, 0))
                visited.add((x, 0))

        while q:
            curr_q = q
            q = []
            for x, y in curr_q:
                pixels[x, y] = (0, 0, 0, 0)
                # neighbors
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y + 1)):
                    if 0 <= nx < W and 0 <= ny < H:
                        if (nx, ny) not in visited:
                            r, g, b, a = pixels[nx, ny]
                            if is_sky(r, g, b) or (r < 30 and g < 30 and b < 40):  # very dark
                                visited.add((nx, ny))
                                q.append((nx, ny))

        img.save(output_path, "PNG")
        print(f"Successfully removed sky and saved to {output_path}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    in_file = r"c:\Users\Usuario1\Desktop\files\assets_background\act1\bg_act1_mid.png"
    process_mid_layer(in_file, in_file)
