# How to Use Custom Room Order - User Guide

## Quick Start (2 minutes)

### Step 1: Open Manage Rooms
- From Home Screen
- Tap Menu (or navigate to Manage Rooms)
- You'll see all your rooms listed

### Step 2: Enter Custom Order Mode
1. **Tap the Sort icon** (sliders ⚙️) in the top-right corner
2. **Tap "Custom"** option in the bottom sheet menu
3. You'll see a **blue banner** saying "Custom order mode"

### Step 3: Drag to Reorder
1. **Long-press** a room card (hold for ~300ms)
2. **Drag** the room to your desired position
3. **Release** to drop it in place
4. Repeat for other rooms

### Step 4: Save Your Order
1. **Tap "Save Order"** button at the bottom (green button)
2. Wait for confirmation: "Room order saved successfully"
3. You're done! ✅

---

## What You'll See

### Before Custom Order
```
Manage Rooms
────────────────────
Back | Manage Rooms | Sort ⚙️ +
────────────────────
□ Kitchen
  3 devices
  [Rename] [Delete]

□ Bedroom
  2 devices
  [Rename] [Delete]

□ Living Room
  1 device
  [Rename] [Delete]
```

### During Custom Order (Drag Mode)
```
⚠️ Custom order mode
Long press and drag to reorder. Tap Save Order when done.
────────────────────
≡ Bedroom        3
  (highlighted in blue - ready to drag)
  
≡ Kitchen        3
  
≡ Living Room    1

[Cancel] [Save Order] ← Now visible!
```

### After Save
```
✅ "Room order saved successfully"

Manage Rooms
────────────────────
Back | Manage Rooms | Sort ⚙️ +
────────────────────
□ Bedroom
  2 devices
  
□ Kitchen
  3 devices
  
□ Living Room
  1 device
```

---

## Step-by-Step: Complete Example

### Scenario: Reorder rooms from Kitchen → Bedroom → Living Room to Bedroom → Kitchen → Living Room

**Start:**
```
Kitchen
Bedroom
Living Room
```

**Goal:**
```
Bedroom (moved to top)
Kitchen
Living Room
```

### Instructions:

**1. Tap Sort button** (top-right corner)
   - Bottom sheet appears with sort options

**2. Tap "Custom"**
   - Screen shows blue banner: "Custom order mode"
   - "Save Order" button appears at bottom
   - All rooms now draggable

**3. Long-press "Bedroom" card**
   - Hold for ~300ms
   - Card highlights in blue
   - Touch feedback indicates ready to drag

**4. Drag Bedroom upward**
   - Keep holding
   - Drag past Kitchen
   - Watch as rooms shift out of the way
   - Position cursor above Kitchen

**5. Release (drop)**
   - Bedroom smoothly settles in first position
   - Kitchen and Living Room move down

**6. Tap "Save Order"**
   - Loading indicator appears on button
   - Screen briefly pauses
   - Success message: "Room order saved successfully"

**7. Done!**
   - Exit custom mode
   - Rooms now displayed in new order
   - Order saved to phone storage

---

## Things to Know

### ✅ What Works
- Drag multiple rooms to any position
- Mix custom order with rename/delete
- Close app and reopen - order is preserved
- Switch between sort modes (A-Z, Custom, etc.)
- Add new rooms while in custom mode

### ⚠️ What to Watch For
- **Don't** tap Cancel unless you want to discard changes
- **Don't** exit the screen without tapping "Save Order" first
- Dragging requires ~300ms long-press (be patient)
- Only works when sort mode is "Custom"

### 🔄 Switching Sort Modes
```
Your current order: Bedroom, Kitchen, Living Room

Tap Sort → Select "A-Z"
  Result: Bedroom, Kitchen, Living Room (alphabetical)

Tap Sort → Select "Custom"
  Result: Returns to your saved custom order ✅
```

---

## Troubleshooting

### "I don't see the Save Order button"
**Solution:** 
- Make sure you tapped "Custom" in the sort menu
- You should see the blue banner at the top
- If not visible, scroll down - it's at the bottom

### "Dragging doesn't work"
**Solution:**
- Long-press for at least 300ms (about 1/3 of a second)
- Wait for blue highlight before dragging
- Make sure you're in "Custom" mode (check for blue banner)

### "My custom order disappeared after I closed the app"
**Solution:**
- You must tap "Save Order" button before closing
- Without saving, changes are lost
- After saving, order persists permanently

### "I want to go back to alphabetical order"
**Solution:**
- Tap Sort → Select "A-Z" (or other sort mode)
- Custom order is saved separately
- Can switch back to "Custom" anytime

### "I deleted/renamed rooms and order looks wrong"
**Solution:**
- Tap Sort → Select "Custom" 
- Order updates to include new/changed rooms
- Re-drag if needed and save

---

## Tips & Tricks

### Tip 1: Add Rooms Easily
- Tap the **+** button in header to quickly add a new room
- No need to open a menu

### Tip 2: Quick Reordering
- Don't have to save after every drag
- Drag multiple times, then save once at the end

### Tip 3: Check Saved Order
- Look at room display after saving
- If order matches what you wanted, it's saved ✅

### Tip 4: Use Meaningful Names
- Naming rooms (Kitchen, Bedroom, etc.) helps organizing
- Makes custom order more useful

### Tip 5: Combine with Other Features
- Can rename rooms during custom sort
- Can delete rooms during custom sort
- Changes apply immediately to list

---

## FAQ

**Q: How long does the order stay saved?**
A: Permanently, until you change it. Even after closing and reopening the app.

**Q: Can I undo a bad reorder?**
A: Yes! Tap "Cancel" button before you save. Or just reorder again and save the correct order.

**Q: What if I accidentally save the wrong order?**
A: Just go back to Sort → Custom and reorder it correctly. You can change it anytime.

**Q: Does custom order sync across devices?**
A: No, order is saved only on this phone. Each phone has its own custom order.

**Q: Can I delete rooms during custom mode?**
A: Yes, but you need to exit custom mode first. Or cancel custom mode, delete the room, then re-enter custom mode.

**Q: Why do I need to long-press?**
A: Long-press prevents accidental drags when scrolling. It's a safety feature.

**Q: What happens if I force-close the app mid-save?**
A: Don't worry! If it crashes mid-save, the previous order is restored. You'll need to save again.

---

## Still Not Working?

**Try These Steps:**

1. **Force close app:**
   - Close SmartHomeApp completely
   - Wait 5 seconds
   - Reopen

2. **Check Metro bundler is running:**
   ```
   npm start
   ```
   (Should show "Dev server ready")

3. **Rebuild app:**
   ```
   npm run android
   ```

4. **Clear app data (last resort):**
   - Android Settings → Apps → SmartHomeApp → Storage → Clear Data
   - Warning: This deletes all saved devices too!

5. **Check console logs:**
   - Open React Native Debugger
   - Look for: `[RoomManagement] Saving custom order:`
   - If not present, code changes didn't apply

---

## Need Help?

Check these documentation files:
- `CUSTOM_ORDER_IMPLEMENTATION_DONE.md` - Technical details
- `BEFORE_AFTER_COMPARISON.md` - How the fix works
- `CUSTOM_ORDER_CODE_CHANGES.md` - Code details for developers

---

## Summary

✅ Open Manage Rooms
✅ Tap Sort → Custom
✅ Long-press and drag rooms
✅ Tap Save Order
✅ Done! Order saved forever

**Enjoy organizing your rooms! 🎉**

