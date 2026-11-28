# Promo brief for the next design capture

Production starts after the updated app and guide are approved and fresh screenshots are available. Keep the existing footage and artwork as references until the new exports pass review.

| Placement | Composition | Master canvas |
| --- | --- | --- |
| Stories, Reels and status | Use the phone view with captions above system overlays. Give the main interaction enough screen space to read at phone size. | 1080 × 1920, 9:16 |
| LinkedIn feed | Compose specifically for the feed. Crop the app capture by selecting the feature panel, then build the rest of the scene around it. Keep the key controls and labels visible in the mobile feed. | 1080 × 1350, 4:5 |
| Desktop and landscape | Use the actual desktop build. Show the sidebar and enough of the wider layout to explain desktop use, including the Ramadan dashboard. | 1920 × 1080, 16:9 |

Add 1080 × 1080 only if a named placement needs it. Give each placement its own framing, text, pacing and image scale. Recompose scenes with multiple panels on the narrower canvases.

Keep two deliverables per approved aspect ratio and film: a full-quality original and a compressed share copy. Both carry the approved audible mix. Inspect the encoded audio stream and listen to the beginning, middle and end. Check runtime, dimensions, captions, content edges and platform safe areas at actual viewing size. Freeze a manifest of final filenames and hashes before clearing duplicates. At that stage, delete superseded rendered video files only and keep source screenshots, artwork and other reference assets.

## Per-shape framing, 13.10 re-render (2026-11-28)

The 13.10 exports were first adapted from the portrait film. The 4:5 and 16:9 versions now have their own per-scene framing (`focus.feed` and `focus.land` in `general.js` and `ramadan.js`, read by `engine.js`):

- **16:9:** every phone shows whole, top to bottom, beside the column of words. Before, phones were clipped at the top and bottom. The desktop scenes use a narrower word column and a shorter shade, so the Windows app and the Ramaḍān dashboard fill about two-thirds of the frame and the sidebar stays readable.
- **4:5:** the desktop scenes lean in so the sidebar and main card fill the width, with the far edge running off the frame. The du'ā' notification drops a short distance instead of sweeping across the headline.
- **9:16:** framing unchanged.
- **Screens:** every capture in both films now comes from the 13.10 app. The reader, Al-Kahf translation and the full Ramaḍān page, which were hand-captured before, are now scripted in `tools/guide-shots.js` (`promo-extra`, `promo-friday`, `promo-ramadan`). The Ramaḍān page is seeded at Day 11, with 9 fasts kept, 1 missed, 10 Tarāwīḥ nights and 11 juz' read. The general film scrolls it down to Tarāwīḥ and the khatm.

Still open for the next design capture:

- In 4:5, the phones still run off the bottom edge. The top of each screen, which carries the feature, stays in view.
- Neither film shows the wuḍū' and ghusl lessons or the Ramaḍān share cards.
- Each film's story, words and pacing are shared across all three shapes. Only the framing differs.
