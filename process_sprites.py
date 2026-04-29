import os
import cv2
import numpy as np

def process_spritesheet(input_path, output_dir):
    print(f"Loading image from {input_path}")
    img = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Failed to load image.")
        return

    # Add alpha channel if missing
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    print("Making white/bright background transparent...")
    # Convert to grayscale to find bright background pixels
    gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    
    # Create mask for white and very light gray pixels (the background)
    _, bg_mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
    
    # Set those pixels to transparent
    img[bg_mask > 0] = [0, 0, 0, 0]

    # Find the non-transparent pixels to extract sprites
    alpha_channel = img[:, :, 3]
    _, fg_mask = cv2.threshold(alpha_channel, 10, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    bounding_boxes = [cv2.boundingRect(c) for c in contours]
    bounding_boxes = [b for b in bounding_boxes if b[2] > 20 and b[3] > 20]

    if not bounding_boxes:
        print("No sprites found!")
        return

    print(f"Found {len(bounding_boxes)} sprite components.")

    # Group by rows based on y coordinate
    bounding_boxes.sort(key=lambda b: b[1])

    rows = []
    current_row = [bounding_boxes[0]]
    for b in bounding_boxes[1:]:
        # If the vertical difference is small, it's likely the same row
        if abs(b[1] - current_row[-1][1]) < 60:
            current_row.append(b)
        else:
            rows.append(current_row)
            current_row = [b]
    rows.append(current_row)

    # Sort each row by x coordinate
    for row in rows:
        row.sort(key=lambda b: b[0])

    print(f"Found {len(rows)} rows of animations.")

    anim_names = ["idle", "walk", "jump"]
    for anim in anim_names:
        os.makedirs(os.path.join(output_dir, anim), exist_ok=True)
        
    frames_per_anim = 30
    
    max_w = max(b[2] for b in bounding_boxes)
    max_h = max(b[3] for b in bounding_boxes)
    
    # Add padding so sprites have some breathing room
    max_w = int(max_w * 1.2)
    max_h = int(max_h * 1.2)

    # Round max_w and max_h to even numbers
    if max_w % 2 != 0:
        max_w += 1
    if max_h % 2 != 0:
        max_h += 1

    print(f"Standardizing frames to size: {max_w}x{max_h}")
    
    final_sheet_width = max_w * frames_per_anim
    final_sheet_height = max_h * 3
    final_sheet = np.zeros((final_sheet_height, final_sheet_width, 4), dtype=np.uint8)

    for i, anim_name in enumerate(anim_names):
        if i < len(rows):
            row_boxes = rows[i]
        else:
            # If not enough rows generated, wrap around to last available row
            row_boxes = rows[-1] if rows else []

        print(f"Row '{anim_name}' has {len(row_boxes)} original unique frames.")
        
        extracted_frames = []
        for x, y, w, h in row_boxes:
            sprite = img[y:y+h, x:x+w]
            frame = np.zeros((max_h, max_w, 4), dtype=np.uint8)
            y_off = (max_h - h) // 2
            # Align horizontally a bit higher (so ground level matches roughly)
            y_off = max_h - h - int(max_h * 0.1)
            x_off = (max_w - w) // 2
            
            # bounds check to be safe
            y_off = max(0, y_off)
            x_off = max(0, x_off)
            
            frame[y_off:y_off+h, x_off:x_off+w] = sprite
            extracted_frames.append(frame)
            
        if not extracted_frames:
            extracted_frames = [np.zeros((max_h, max_w, 4), dtype=np.uint8)]
            
        # Distribute into 30 frames using cyclically stretching
        for f_idx in range(frames_per_anim):
            src_idx = int(f_idx * len(extracted_frames) / frames_per_anim)
            out_frame = extracted_frames[src_idx]
            
            # Save individual frame correctly using the specified name prefix
            frame_path = os.path.join(output_dir, anim_name, f"{anim_name}_{f_idx+1:02d}.png")
            cv2.imwrite(frame_path, out_frame)
            
            # Place in final big sprite sheet grid
            y_start = i * max_h
            x_start = f_idx * max_w
            final_sheet[y_start:y_start+max_h, x_start:x_start+max_w] = out_frame

    final_sheet_path = os.path.join(output_dir, "sprites_final.png")
    cv2.imwrite(final_sheet_path, final_sheet)
    print(f"Successfully saved 30-frame complete sprite sheet to: {final_sheet_path}")

if __name__ == "__main__":
    input_img = r"C:\Users\Usuario1\.gemini\antigravity\brain\f9ee4c04-340e-4dd1-99da-ab6eadb99b57\blue_fairy_spritesheet_1775746990082.png"
    output_dir = r"C:\Users\Usuario1\Downloads\metaDES 1.0\files\sprites_blue"
    
    os.makedirs(output_dir, exist_ok=True)
    process_spritesheet(input_img, output_dir)
