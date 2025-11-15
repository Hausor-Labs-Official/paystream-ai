# Penny Orb Rive File

## 📥 Place Your Rive File Here

**File name**: `orb-1.2.riv`
**Full path**: `public/elements/orb-1.2.riv`

## ✅ What This Does

The Rive orb provides an animated, interactive visual representation of Penny that:
- Pulses when listening to user input
- Swirls when thinking/processing
- Animates when speaking responses
- Changes colors based on mode

## 🎨 Orb States

The orb responds to these inputs:
1. **listening** (boolean) - User is speaking/typing
2. **thinking** (boolean) - AI is processing
3. **speaking** (boolean) - AI is responding
4. **color** (number 0-8) - Color theme (5 = purple/teal default)

## 📋 Next Steps

1. Download or export your `orb-1.2.riv` file from Rive
2. Place it in this directory: `public/elements/orb-1.2.riv`
3. Restart your dev server: `npm run dev`
4. Visit `http://localhost:3000/penny`
5. You should see the animated orb!

## 🔍 Fallback

If the file is missing, a purple gradient circle will show instead.

## 🛠️ Customization

To use a different Rive file:
1. Update the path in `src/components/penny/PennyVisual.tsx`
2. Change line: `src: '/elements/orb-1.2.riv'`
3. To your file path: `src: '/elements/your-file.riv'`

## 📖 Documentation

See `PENNY_RIVE_SETUP.md` in the project root for full integration guide.
