# Backlog

Ideas that aren't scoped or scheduled yet. ⭐ = higher potential (value and/or differentiation, not necessarily easiest).

## From the brainstorm

- ⭐ **Group hauls** — a manually-activated shared haul for a reseller team (or "the granny team at the antique mall") that collectively shows items scouted by multiple separate accounts. Real architectural lift: every RLS policy today is single-owner (`auth.uid() = created_by`) — this needs a membership model and shared-visibility rules that don't exist anywhere else in the app yet.
- ⭐ **eBay / Vinted listing integration** — auto-draft (or directly post) a real marketplace listing from item data, ideally syncing sold status back. Highest-value close-the-loop feature for an actual reseller; bounded, well-precedented integration work (OAuth, category/condition mapping) rather than a research problem.
- **Filtering on items and hauls** — extend beyond status/lane to date ranges, price ranges, location radius on hauls. Small, incremental.
- **Gamification / haul streaks** — consecutive-trip streaks, badges. Data's already there (`haul.started_at`) but worth a tone check first — does this fit a tool people use to track real P&L, or does it read as gimmicky next to margin percentages?
- ⭐ **Haul market** — sell an unsorted haul as-is, sight-unseen, to another reseller/bidder. This is a different product, not a feature — needs listings, bidding, almost certainly payments and reputation between strangers. Starred for upside, not for being close to buildable — this deserves its own strategy conversation before any scoping.

## From Claude — trying not to just re-skin Vendoo/List Perfectly/Flyp

Every existing cross-listing tool starts from "here's an item, list it everywhere." None of them capture *where you got it* or track it as a *trip*. That's the one thing Magpie has that they don't, once hauls + geolocation are real — these all lean on that:

- ⭐ **"Go back or don't" sourcing heatmap** — aggregate margin-per-haul by location over time into a personal map of where your best finds have actually come from, decayed so a spot that was hot two years ago doesn't stay rated forever. Nobody else has this because nobody else captures location at all.
- **Pass-reason coaching** — an optional one-tap reason when you pass on an item at checkout (too rough, overpriced already, saturated category). Over time, surfaces your own blind spots against your own history ("you pass on 80% of items over $20 — some of those would've cleared your own max-bid math"). Coaching from your own data, not generic advice.
- **Sibling-item detection in Scout** — when the AI identifies a card/item that's part of a set or series, check it against what you already hold (in inventory or already sold) and flag it — "you have 2 other cards from this set" — useful for lotting or recognizing set-completion premiums before you price it as a single.
- **Pooled comp signal (opt-in, anonymized)** — pool est-value vs. actual-sold deltas across users for the same category/set/card to sharpen the AI's estimate over time. A flywheel where usage improves accuracy for everyone, without the payments/trust complexity of the haul-market idea.
- **Seasonal sourcing calendar** — surface "this category has sourced better for you in [month]" patterns from your own haul history (holiday decor in Nov, gifted-duplicate video games in Jan) — personalized, not a generic almanac.
