# Navigation accessibility update

## Purpose
This incremental update fixes the issue where lower sidebar options could be hidden below the visible viewport. It also makes the portal easier to navigate without redesigning or removing existing panel features.

## New behavior
- **Scrollable desktop sidebar:** the navigation section owns its own vertical scroll area, while the brand, panel finder, quick-contact tip, and admin/sign-out area remain in place where the viewport allows.
- **Responsive phone/tablet navigation:** the existing horizontal navigation strip remains horizontal and can be swiped; the scroll controls move it left/right.
- **Find a panel:** enter any part of a panel label to filter navigation choices. This is a menu-only filter and does not change any records.
- **Navigation arrows:** the pair of controls scrolls the menu toward its beginning or end. Their direction adapts to vertical desktop versus horizontal mobile navigation.
- **Active panel visibility:** selecting a panel automatically scrolls the active item into view where available.
- **Keyboard/accessibility:** controls have accessible labels; navigation items expose `aria-current="page"`; focus-visible outlines improve keyboard operation.
- **All existing panel choices retained:** Overview, Follow-ups, Task Planner, Private Notes, Contact Database, Projects & Leads, Rate Book, Shared Databases, Reports, Public Form Links, Security and Settings.

## Files changed by the latest navigation fix
- `components/dashboard.tsx` — menu filtering, scroll buttons, active-item visibility and accessible labels.
- `app/globals.css` — responsive sidebar/nav scroll behavior, visible scrollbar and focus styling.

The cumulative ZIP also includes the earlier incremental Task Planner, Private Notes, backup, authenticator and dashboard UI changes. See `PATCH-MANIFEST.md` for the complete file list.

## Quick manual test
1. Run the app with a short desktop viewport (for example 768px high). Scroll inside the sidebar and confirm that Settings and every other item can be reached.
2. Enter `rate` in Find a panel, open Rate Book, and confirm the filter clears.
3. Enter text that matches no label, use Clear search, and confirm every item returns.
4. Resize to a phone viewport. Swipe the menu horizontally and use both arrows to reach Security and Settings.
5. Open every panel one by one and confirm that the correct heading/content appears.
6. Check that the existing Task Planner, Private Notes, contacts, projects, rate book, shared databases, reports, public links, security controls, imports/exports and settings still work.

## Deployment notes
No new environment variable, dependency or database migration is introduced by the navigation fix. Merge the included files over the correct existing project root and retain all files not present in the patch. Before production deployment run `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` and confirm Vercel's deployment logs are clean.
