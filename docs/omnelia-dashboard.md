# Botazez intelligence dashboard

## Design and interaction contract

Preserve the Botazez world map, gold identity, existing data controls and ARDI Sec hand-off. Omnelia contributes its approved Zodiak wordmark, lilac/cyan colours, translucent dark glass and reflective multicolour edges. The transparent ARDI Sec mascot is approved existing artwork, not a replacement character.

At 1200px wide and 620px high or larger, use three columns: search/layers, the world map, and intelligence context. At smaller widths or heights, keep the map full-screen and expose panels through a five clearly named navigation buttons and a More tools panel with descriptions. Minimum compact navigation height is 48px. Phone, portrait tablet and landscape tablet retain overview, cameras, search and layer controls.

Start on the world view with the Overview layers. Do not request approximate IP location or fly into an arbitrary city at startup. Explicit search, location, event selection and OI navigation still move the map. Existing layer links restore their selection.

Overview, Hazards and Transport change layer visibility, not source availability. Observation time and retrieval time are distinct. The intelligence list reads the same earthquake records as the map. CISA KEV inclusion establishes known exploitation, not severity or a global threat level.

Camera browsing is available in the intelligence column and compact Overview drawer. Load/reload the catalogue, filter by location/name and known media format, locate on map, and open the existing player. The directory loads no preview media by itself. The masthead Cameras and Intelligence destinations and the smaller-screen More tools menu open the same context panel. A selected camera alone opens the viewer; full-screen expansion uses the viewport and preserves the entire image. Existing HLS, MP4, MJPEG, snapshots and supported embed handling remain. Recording and satellite-uplink claims have been removed. Operator availability and restrictions determine playback; catalogue presence does not prove a working feed.

Camera recording, a multi-camera video wall, saved server-side layouts, new threat providers, hosted models and account provisioning are outside this change. No hosting credentials or API keys were copied or changed.

## Research references

- https://sitdeck.com/product — map, linked dashboard widgets and video intelligence as a usability reference; vendor claims are not independent verification.
- https://doc.arcgis.com/en/instant-apps/latest/customize/configure-search-tool.htm — explicit search sources, suggestions and focused results.
- https://github.com/cisagov/kev-data/blob/develop/known_exploited_vulnerabilities_schema.json — KEV field semantics.

## Verification

Run `npm test` and `npm run build`. The full suite includes loopback HTTP fixtures and needs permission to bind a local test listener in restricted environments. Live-network tests are intentionally opt-in; their skip is not evidence of provider readiness.

Focused ESLint checks cover the new dashboard components, docs/privacy pages, view helpers, KEV route and optional analytics proxy. The existing whole-repository ESLint command exhausts its default Node heap; it has not been certified passing.

Browser verification uses the production build on port 8766. Check desktop columns and map canvas; 390px phone, 768px portrait tablet and 1024px landscape tablet drawers; coordinates, source failure/retry, source tabs, labelled tool panels within the map, ARDI focus/escape and destination, docs/privacy HTTP 200 and one canonical each. Camera checks use clearly labelled synthetic catalogue/playback fixtures, not claims about every external operator.

## Screen-fit repair

The 320px header overlap and short-laptop popovers positioned outside the map were reproduced and repaired. All desktop tool popovers now share a map-anchored frame, close control, Escape action and internal scrolling. Search remains compact until focused in the left column. Camera expansion uses the viewport rather than a clipped dashboard column. The compact More tools menu explains the purpose of each destination and exposes camera browsing, AI assistance, alerts, research, drawing, map imports, space video, markets and supported nearby-device controls.

Final verification on 27 October 2026: 1,344 automated tests passed, 22 live-network tests skipped; production build and focused ESLint passed; npm audit reported zero known advisories. Browser screen-fit checks at 320×568, 360×640, 390×844, 430×932, 768×1024, 820×1180, 1024×768, 844×390, 1200×620, 1366×768, 1440×900 and 1920×1080 showed a map canvas, no document horizontal overflow and no brand/ARDI overlap. Compact navigation targets measured at least 48px. Research, Markets, Alerts, Drawing, AI, Directions, Map data and Nearby devices panels were verified within the map at 1200×620; taller contents scroll internally. Camera format filters, full-frame rendering, viewport expansion, zero-coordinate location controls and closing were exercised with controlled media fixtures on desktop, phone and tablet. Search failure/retry was also exercised with controlled responses.

Follow-up verification on 28 October 2026: the AI full-screen mode was repaired to give the underlying map the entire viewport, then restore its dashboard column on exit. At 1440×900, the map changed from 834×792 within the dashboard to 1440×900 in full-screen mode and restored correctly. Camera selection now opens the viewer and moves the same map to the camera; a controlled zero-coordinate fixture reached latitude 0, longitude 0, zoom 12. The Markets full-screen window measured 1408×868 inside the viewport. These interaction checks produced no uncaught browser exceptions. The connection badge now says Data received, matching the evidence of received records without implying that every API is connected.

## Public identity and share previews

Botazez and Omnelia SI now share one metadata definition in `src/lib/site-brand.ts`: page titles/descriptions, Open Graph and Twitter cards, publisher/site-name structured data, browser icons and Apple install icons. The new social card uses the unchanged approved Omnelia mascot. The icon is a code-native Botazez B monogram with the shared glass rim. Rebuild the static assets with `npm run brand:assets`; no image-generation API or service credentials are required.

Both install manifests reference real 192px and 512px icons and allow portrait screens. Legacy icon/share-image URL paths carry the new artwork too, including Next's file-based favicon. The public sitemap lists the dashboard, guide and privacy pages. Upstream licensing and internal storage/environment identifiers are retained; public product branding and publisher metadata use Botazez and Omnelia SI.

Crawler checks on the built homepage, guide and privacy page returned HTTP 200 with the new preview image, branded titles and canonical URLs. Icon, image and manifest endpoints returned HTTP 200 with appropriate content types. Seven branding regression tests cover assets, manifests, metadata and crawler files. These checks establish the built implementation; search engines and messaging services control their own cached previews after deployment.


## Global ARDI identity correction

The liquid-glass ARDI character is now the global Botazez visual identity: the loading screen, desktop masthead, tablet/mobile header, guide/privacy mastheads, public favicons/install icons and social card use the same approved ARDI artwork. The native B monogram is replaced. The full character is contained without clipping; its approved form, material and ARDI chest marking stay intact. Omnelia SI remains the parent-brand credit. The dark investigative presentation reflects the user's stated meaning of Botazez, while the interface continues to describe its actual public-source capabilities.

## Minimise, restore and close controls

Dashboard pop-up panels now share visible minus/restore and close controls. Compact drawers collapse into a 54px control bar above the map controls; desktop tools collapse to their title bar. Panel content stays mounted while hidden, preserving draft text, fields and selected content. Assistant draft state is owned by the dashboard so it also survives full-screen transitions, closing/reopening and viewport changes. Minimising does not submit a prompt or start another model request.

The controls cover the assistant, layers, overview, search, directions, research, markets, alerts, drawing, map imports, nearby-device tools, camera viewer, video viewer and ARDI preview. Full-screen AI and Markets can minimise back to a restore bar. Camera closes reset its window state for the next opening. The mobile assistant's map inset is released while minimised so the map is visible and interactive.

Browser checks exercised 320px/390px phone, 1024px tablet and 1440px desktop views. They verified draft persistence while hidden, map panning and map-control clicks, search-field persistence, repeated minimise/restore/close cycles, camera and ARDI windows, full-screen AI draft preservation, full-screen Markets minimisation, and video-viewer controls. Controlled placeholder provider configuration and camera/video fixtures were used for UI checks; no real model request was submitted. The initial FEEDS test selector was corrected from button to its actual tab role and the video test then passed. Final regression suite: 1,351 passed, 22 live-network tests skipped; production build and focused new-component lint passed.

## Assistant destination and compact restore-bar correction — 28 October 2026

A controlled `go_to` response reproduced the assistant continuing to cover its map destination. Assistant navigation and result-card location actions now collapse the window while leaving the draft and conversation mounted. Desktop full-screen mode exits to the same restorable assistant panel; opening a new panel window resets its collapsed state.

At 320×568 the previous compact restore bar intercepted the zoom-in button. All compact collapsed tool, drawer, ARDI, camera and video windows now sit below the header, at 88px plus the top safe-area inset, leaving bottom map controls accessible.

The production build was exercised at 320×568, 768×1024 and 1440×900: manual minimise/restore preserved a typed draft, automatic navigation collapsed the assistant, the reply remained available after restoration, close worked, zoom buttons accepted real pointer clicks while collapsed, and the document had no horizontal overflow. Assistant replies were intercepted browser fixtures with a placeholder credential; no paid model request or live provider-readiness claim is involved. TypeScript, production build, focused MapToolPanel lint and 1,351 regression tests passed; 22 live-network tests remained skipped.
