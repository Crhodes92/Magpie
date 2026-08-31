# Backlog

Ideas that aren't scoped or scheduled yet. ⭐ = higher potential (value and/or differentiation, not necessarily easiest).

## Competitive context (2026-08-29 field report)

A competitive survey found direct overlap on two ideas below and one clear open gap. Reordering priority accordingly — see inline notes on the affected entries and the new section at the bottom.

- FlipperHelper ships a feature literally named **Hauls**: name a trip, it groups items/expenses by date range, tracks live per-trip P&L. Same concept as our haul model, though (per their own materials) trips are named manually rather than auto-clustered by time/GPS the way ours are.
- Hauly already ships **location-pinning + a "best spots" view** — this retires the "nobody else captures location" claim the sourcing-heatmap idea below was originally pitched on.
- Nobody found does **pre-purchase grading arbitrage** for cards (TCGrader grades cards you already own, not ones you're deciding whether to buy) — a genuine open gap, but see the demotion note below: not a near-term priority while the card lane itself isn't a current focus.

## From the brainstorm

- ⭐ **Group hauls** — a manually-activated shared haul for a reseller team (or "the granny team at the antique mall") that collectively shows items scouted by multiple separate accounts. Real architectural lift: every RLS policy today is single-owner (`auth.uid() = created_by`) — this needs a membership model and shared-visibility rules that don't exist anywhere else in the app yet.
- ⭐ **eBay / Vinted listing integration** — auto-draft (or directly post) a real marketplace listing from item data, ideally syncing sold status back. Highest-value close-the-loop feature for an actual reseller; bounded, well-precedented integration work (OAuth, category/condition mapping) rather than a research problem.
- **Filtering on items and hauls** — extend beyond status/lane to date ranges, price ranges, location radius on hauls. Small, incremental.
- **Gamification / haul streaks** — consecutive-trip streaks, badges. Data's already there (`haul.started_at`) but worth a tone check first — does this fit a tool people use to track real P&L, or does it read as gimmicky next to margin percentages?
- ⭐ **Haul market** — sell an unsorted haul as-is, sight-unseen, to another reseller/bidder. This is a different product, not a feature — needs listings, bidding, almost certainly payments and reputation between strangers. Starred for upside, not for being close to buildable — this deserves its own strategy conversation before any scoping.

## From Claude — trying not to just re-skin Vendoo/List Perfectly/Flyp

Every existing cross-listing tool starts from "here's an item, list it everywhere." None of them capture *where you got it* or track it as a *trip*. That's the one thing Magpie has that they don't, once hauls + geolocation are real — these all lean on that:

- **"Go back or don't" sourcing heatmap** *(downgraded from ⭐ — see competitive context above)* — aggregate margin-per-haul by location over time into a personal map of where your best finds have actually come from, decayed so a spot that was hot two years ago doesn't stay rated forever. Hauly already ships a flat version of this (pin a find, see best spots), so a plain heatmap is parity, not a moat, now. Worth revisiting only if it's sharpened into scoring locations by day-of-week/seasonal performance (real-estate site-selection model) rather than a static pin map — otherwise not worth building as originally scoped.
- **Pass-reason coaching**, extended into **haul post-mortems** — an optional one-tap reason when you pass on an item at checkout (too rough, overpriced already, saturated category), surfacing blind spots over time ("you pass on 80% of items over $20 — some of those would've cleared your own max-bid math"). Field report suggests extending this trading-journal-style to *underperforming hauls too*: tag why a haul missed (overpaid, misjudged condition, wrong category) and surface the pattern before the next trip, not after. Low effort — reuses the existing checkout decision flow — and nothing in the trip-tracker competitive tier attempts this.
- **User tagging + AI-suggested tags on item pages** — a free-text `tags` field on items (start as a plain array column, not a normalized tags table — no need for that lift yet) that users can tag however makes sense to them ("holiday lot," "bin 4 misc," a set name, whatever). Sibling/bundle detection folds into this as a suggestion, not a separate mechanism: on the item detail page, check the rest of the user's inventory (any haul, any storage location — bundling candidates are routinely scattered across different hauls/stashes, so this must be a global lookup, not haul-scoped) for likely matches and propose a tag rather than just a passive "you have N of these" banner.
  - Constraint from Chris: tag suggestions must be grounded in the user's *existing* tag vocabulary — fetch the user's distinct tags first and pass them into the suggestion step, so it only ever proposes a tag that either (a) already exists, or (b) is genuinely new because nothing existing covers the concept. Never suggest a near-duplicate/synonym of a tag that's already in use (e.g. "Base Set" vs "base-set" vs "Pokemon Base Set").
  - Card lane is the clean first case (match on `card_details.set_name`/`card_name`); general lane (brand/model/category text) is fuzzier and lower priority.
- **Pooled comp signal (opt-in, anonymized)** *(hold — see below)* — pool est-value vs. actual-sold deltas across users for the same category/set/card to sharpen the AI's estimate over time. A flywheel where usage improves accuracy for everyone, without the payments/trust complexity of the haul-market idea. Field report frames this as an eBird/iNaturalist-style opt-in, time-decayed hotspot model — right idea, but needs real usage volume to be worth more than Hauly's single-user map; revisit once there's a user base to pool from, not before.
- **Seasonal sourcing calendar** — surface "this category has sourced better for you in [month]" patterns from your own haul history (holiday decor in Nov, gifted-duplicate video games in Jan) — personalized, not a generic almanac.

## From the competitive field report (2026-08-29)

Ideas pulled from outside reselling entirely — see the full report for sourcing and reasoning.

- **Pre-purchase grading signal (card lane)** *(demoted — card lane isn't a current focus)* — run a PSA-style AI grading estimate (à la TCGrader) *during Scout capture*, before the buy decision, so a raw card's "worth grading" upside is priced into the buy/pass math itself instead of discovered after acquisition. No competitor found does this, and it would extend the existing `/api/identify` pipeline rather than requiring new architecture — genuinely the sharpest gap the field report found, but shelved until the card lane is actually a priority again.
- **Dry-powder budget meter** — extend `max_bid_pct` into a live spending envelope (YNAB-style): "$140 of sourcing budget left this week," debited as you buy, refilled on a schedule. Low effort, low differentiation on its own, but cheap and genuinely useful.
- **Exportable collection dossier** — one-click PDF export of an item or a tagged collection (photos, provenance, comps, condition notes) for insurance riders or estate purposes. Real non-reseller use case — a serious collector might pay for Magpie even if they never sell.
- **Reorder-point sourcing nudges** — procurement-style alert: if a category has consistently been a strong margin and hasn't been scouted in N days, say so. Turns sales history into a forward-looking sourcing plan instead of a rear-view report. Low effort, reuses dashboard category-margin data that already exists.
