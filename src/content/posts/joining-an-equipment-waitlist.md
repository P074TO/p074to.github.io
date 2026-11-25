---
title: "Joining a waitlist when the last unit is borrowed"
description: "Saving FIFO equipment requests, reserving Good returns, and converting Ready holds into active loans at pickup."
pubDatetime: 2026-11-28T11:20:00+08:00
draft: true
tags:
  - technical
  - projects
  - python
  - data-structures
---

My inventory app could show that the last multimeter was on loan. I wanted
someone who needed it next to be able to leave a request. On November 25,
I connected a saved waitlist to the equipment details panel.

## Give unavailable equipment an action

When availability reaches zero, the panel shows Join Waitlist. One dialog
collects the borrower's ID, name, and role. Saving the request refreshes
the waiting count on the selected equipment. The stock count stays at
zero and the same row stays selected.

Cancel leaves the request unsaved. Missing required fields produce a
validation message so the user can correct the form.

## Check availability when saving

The storage function checks availability inside the same write transaction
that saves the request. Borrow and Join Waitlist share the availability
query. If stock has become available, the waitlist save reports that the
item can be borrowed.

The dialog can be open while the saved state changes. Checking again at
Save gives the decision the current stock value under the write lock.

## Keep arrival order after reopening

I built a custom FIFO queue with head and tail pointers. Enqueue adds to
the tail, and dequeue removes the head. Both operations take constant
time for this implementation.

SQLite stores the requests. Loading one item's waiting requests in
request-ID order rebuilds its queue by enqueuing each saved row.

```text
waiting requests in request-ID order
              ↓
       enqueue each request
              ↓
       FIFO queue for one item
```

The dedicated queue checks covered insertion order and reuse after
emptying it. A separate run served 5,000 entries in order. Storage checks
covered reopening the database, keeping items' queues separate, and
rejecting a waitlist request when stock was available.

## See the request arrive

These macOS Qt images use sample records and were captured on November 25,
2026, Philippine time, from commit `ea005b5`. The form image combines the
actual main window and modal at their captured positions.

![Composited Qt main window and Join Waitlist form for a multimeter with zero available units.](/images/enginventory/2026-11-25-eb47861/01-join-waitlist-form.png)

After Save, the panel shows one waiting request beside the same equipment.

![Selected multimeter showing zero availability and a waiting count of one after saving.](/images/enginventory/2026-11-25-eb47861/02-waitlist-count.png)

All forty-nine tests, Ruff, and scoped Pyright checks passed at this
checkpoint. The UI checks include Cancel, required-field validation,
and a successful save with the stock count and selection preserved.

## Reserve a Good return for the first waiter

The next commit connects the queue to Return. When a unit is returned as
Good and stock is available, the first waiting request becomes Ready and
holds one unit. That request leaves the waiting queue. The current
availability rule also accounts for units returned as Damaged or Lost.

```text
Good quantity = total stock - Damaged quantity - Lost quantity
available quantity = max(0, Good quantity - active loans - Ready holds)
```

A Damaged or Lost return closes the loan and keeps the unit unavailable.
The waiting request keeps its place. Condition quantities now come from
the item record and loan history, with only the Good row offering lending
actions. Its zero-quantity row stays visible to keep the waitlist reachable.
The condition-row checkpoint is `3e0be1f`, assigned November 29 at 15:00
PHT, with actual evidence captured November 25 at 16:04 PHT and sixty-two
passing tests. The earlier stock-rule correction is recorded in
`dea7673`, with fifty-nine passing tests covering mixed stock, existing
loan history, waitlist order, and the Qt Return flow.

For a single unit with someone waiting, recording the return closes the
active loan and creates the hold. The general availability count stays
at zero. Regular Borrow and both availability displays account for the
reservation.

The return and promotion save in one write transaction. A forced-failure
test makes promotion fail and checks that the return rolls back with it.
That protects the transition between the active loan and the reservation.

Tests also cover FIFO order, keeping items' requests separate, and
upgrading a database with existing waitlist requests. All fifty-three
tests, Ruff, and scoped Pyright checks passed at this promotion checkpoint.
The screenshots above show the earlier Join Waitlist checkpoint.

## Pick up the reserved unit

The details panel now shows Ready requests for the selected equipment.
Pick Up opens a short form for the borrower ID, purpose, and due date.
Saving checks that the entered ID matches the request and creates the
active loan in the same transaction that records the pickup.

The unit stays assigned throughout the transition. A Ready hold becomes
an active loan, so general availability stays at zero for this single-unit
example.

```text
Waiting request → Ready hold → Active loan
```

These running-app captures use sample records from commit `7e267b0` and
were taken on macOS on November 25, 2026, at 03:41 Philippine time.

The returned unit is reserved for the first waiter. The panel shows one
Ready request, no active loans, and zero general availability.

![Selected multimeter with a Ready reservation, zero active loans, and zero general availability.](/images/enginventory/2026-11-25-787480d/01-ready-for-pickup.png)

After pickup, that borrower's active loan appears and the Ready request
leaves the pickup list. Availability is still zero.

![Same multimeter after pickup showing the borrower's active loan and zero general availability.](/images/enginventory/2026-11-25-787480d/02-pickup-saved.png)

All fifty-seven tests passed at the pickup checkpoint. They include
Cancel, an incorrect borrower ID, repeated pickup, and rollback. Those
checks cover keeping the reservation when pickup is cancelled or rejected
and recording a successful conversion once.

The standalone queue is in `c83ff80`, persistence in `72db721`, Join
Waitlist in `ea005b5`, transactional promotion in `5ca8ccf`, and Ready
pickup in `7e267b0`. The Damaged/Lost correction is in `dea7673`.
Development, verification, and captures took place on November 25, 2026,
Philippine time. The waitlist references follow the rewritten branch,
with assigned Git timestamps on November 28. Ready pickup is assigned
16:30 and the stock correction 16:45. The condition-row checkpoint is
assigned November 29 at 15:00. Evidence assets retain their original
capture identifiers.
