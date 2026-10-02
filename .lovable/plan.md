# Convert CashBullX to CBX Coins

## Goal
Replace the app's internal dollar currency with golden CBX coins at the fixed rate **4 CBX = 1 USD**, while keeping crypto payment rails clear and accurate.

## What will change
- Convert every existing wallet balance, earning, reward, trade, spinner result, task payout, referral commission, investment amount, and transaction amount to CBX at 4× its current dollar value.
- Keep historical value unchanged economically: an old $25 balance becomes 100 CBX.
- Replace user-facing `$`/USD money displays with a golden CBX coin icon and values using up to two decimals.
- Update deposits so users choose/see CBX credit while the exact USDT amount to send remains clearly shown for blockchain payment.
- Update withdrawals so users enter CBX, while the corresponding USDT payout is shown before confirmation.
- Update trade limits and reward rules to equivalent CBX amounts, preserving all existing percentages, eligibility rules, cooldowns, and downline commissions.
- Update admin pages, notifications, emails, support answers, marketing copy, charts, level thresholds, spinner labels, and validation messages.

## Data migration
- Multiply existing internal monetary values by 4 across profiles, transactions, trades, investments, tasks, task completions, spins, referrals, check-ins, weekly rewards, withdrawals, levels, and operational totals.
- Do not multiply `deposits.amount_usd`; it records actual USDT received.
- Rewrite money-changing database functions so future deposits convert USDT to CBX, and future withdrawals convert CBX back to USDT-equivalent payouts.
- Use a one-time migration marker to prevent accidental double conversion.

## Visual treatment
- Add one reusable golden CBX coin mark and shared formatters.
- Use the coin mark beside currency values; avoid repeating a textual currency prefix.
- Show up to two decimal places, hiding unnecessary trailing zeros.

## Validation
- Verify balances and historical totals were converted exactly once.
- Test deposit credit, withdrawal conversion, trade placement/settlement, spinner, rewards, referrals, and admin adjustments.
- Check signed-in desktop and mobile screens for remaining dollar symbols or misleading USD labels.

## Technical details
- Monetary integer columns remain fixed-point hundredths, but now represent CBX hundredths unless they explicitly describe external USD/USDT (`deposits.amount_usd`).
- Existing column names ending in `_cents` remain unchanged to avoid a risky schema-wide rename.
- External market-price feeds may continue using USD internally, but user-visible account values render as CBX.
