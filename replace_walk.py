import os
import cv2
import numpy as np

def process_walk_replacer(walk_img_path, target_dir):
    print(f"Loading walk image from {walk_img_path}")
    img = cv2.imread(walk_img_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print("Failed to load image.")
        return

    # Add alpha channel if missing
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)

    print("Making white/bright background transparent...")
    gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    _, bg_mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
    img[bg_mask > 0] = [0, 0, 0, 0]

    # Find the non-transparent pixels to extract sprites
    alpha_channel = img[:, :, 3]
    _, fg_mask = cv2.threshold(alpha_channel, 10, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    bounding_boxes = [cv2.boundingRect(c) for c in contours]
    bounding_boxes = [b for b in bounding_boxes if b[2] > 20 and b[3] > 20]

    if not bounding_boxes:
        print("No sprites found!")
        return

    # Sort boxes by x coordinate to get the sequence order
    bounding_boxes.sort(key=lambda b: b[0])
    print(f"Found {len(bounding_boxes)} walk frame components.")

    frames_per_anim = 30
    
    # We must enforce the exact same standard size the game is currently using for the dark character
    req_w = 286
    req_h = 368

    extracted_frames = []
    max_frame_h = max(b[3] for b in bounding_boxes)
    # Factor to shrink if the generated image is gigantic compared to the slot
    scale = 1.0
    if max_frame_h > req_h - 20:
        scale = (req_h - 20) / max_frame_h

    for x, y, w, h in bounding_boxes:
        sprite = img[y:y+h, x:x+w]
        
        if scale != 1.0:
            # Resize the sprite so it fits inside the required bounding box
            new_w = int(w * scale)
            new_h = int(h * scale)
            sprite = cv2.resize(sprite, (new_w, new_h), interpolation=cv2.INTER_AREA)
            w, h = new_w, new_h

        frame = np.zeros((req_h, req_w, 4), dtype=np.uint8)
        
        # Align foot to the bottom roughly
        y_off = req_h - h - int(req_h * 0.1)
        x_off = (req_w - w) // 2
        
        y_off = max(0, y_off)
        x_off = max(0, x_off)
        
        # Avoid crashing if the width is still somehow overflowing
        if w > req_w:
            w = req_w
            sprite = sprite[:, :req_w]
            x_off = 0
            
        frame[y_off:y_off+h, x_off:x_off+w] = sprite
        extracted_frames.append(frame)
        
    if not extracted_frames:
        extracted_frames = [np.zeros((req_h, req_w, 4), dtype=np.uint8)]
        
    # Load the master sheet
    master_sheet_path = os.path.join(target_dir, "sprites_final.png")
    master_sheet = cv2.imread(master_sheet_path, cv2.IMREAD_UNCHANGED)
    if master_sheet is None:
        print("Failed to load master sheet!")
        return
        
    walk_dir = os.path.join(target_dir, "walk")
    os.makedirs(walk_dir, exist_ok=True)

    row_index = 1  # walk is the 1st index (middle row)
    
    # Generate exactly 30 frames cyclically playing
    for f_idx in range(frames_per_anim):
        src_idx = int(f_idx * len(extracted_frames) / frames_per_anim)
        out_frame = extracted_frames[src_idx]
        
        # Overwrite individual frame
        frame_path = os.path.join(walk_dir, f"walk_{f_idx+1:02d}.png")
        cv2.imwrite(frame_path, out_frame)
        
        # Place in final big sprite sheet grid
        y_start = row_index * req_h
        x_start = f_idx * req_w
        master_sheet[y_start:y_start+req_h, x_start:x_start+req_w] = out_frame

    cv2.imwrite(master_sheet_path, master_sheet)
    print(f"Successfully replaced walk row in master sprite sheet and exported separated frames!")

if __name__ == "__main__":
    walk_img = r"C:\Users\Usuario1\.gemini\antigravity\brain\f9ee4c04-340e-4dd1-99da-ab6eadb99b57\dark_monster_walk_only_1775748580016.png"
    target_dir = r"C:\Users\Usuario1\Downloads\metaDES 1.0\files\sprites"
    
    process_walk_replacer(walk_img, target_dir)
