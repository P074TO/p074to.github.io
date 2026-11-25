---
title: "Making stock updates visible where you borrow"
description: "Following one equipment item through borrowing and return, with stock updates visible in the same selected row."
pubDatetime: 2026-11-26T12:03:00+08:00
draft: true
tags:
  - technical
  - projects
  - python
---

My equipment inventory app had an item-details dialog and a Borrow form.
Borrowing meant opening the form over the details dialog. I wanted to keep
the selected equipment visible and show the result of the loan in the same
place.

On November 25, I moved the details into a side panel beside the inventory
table, connected a successful Borrow save to an availability refresh,
and completed the Return action in the same panel.

## Keep the selected item in view

Selecting a row now fills the panel with the equipment's photo, quantity,
availability, condition, and storage location. Borrow opens a form for
that item.

After a successful save, the table and panel reload their values from
SQLite. The same row stays selected, so I can see the count change without
selecting the equipment again. Clearing the selection empties the panel
and disables Borrow.

## Count the units still available

The stored quantity represents total stock. Availability accounts for
active loans, closed loans returned as Damaged or Lost, and Ready holds
for people on the waitlist. A loan is active while `returned_at` is `NULL`.

```text
Good quantity = total stock - Damaged quantity - Lost quantity
available quantity = max(0, Good quantity - active loans - Ready holds)
```

For one multimeter, a saved loan brings availability from one to zero
while total stock stays at one. Borrow then disables for that item. The
storage operation also checks availability when recording the loan.

The catalog, details panel, and loan checks derive availability from the
saved loan history and Ready holds. The stored quantity stays fixed
through these lending operations.

## Check Save and Cancel

The automated UI check adds an item with one unit, selects it, and opens
Borrow. It cancels the first attempt and confirms availability is still
one. It then saves a loan and checks that both views show zero, the row
stays selected, and Borrow disables.

## Close the loan from the panel

The panel lists the selected item's active loans in due-date order,
with the loan ID breaking ties. SQLite loads the open loans before the
panel selects the records for that equipment.

```sql
SELECT loan_id, borrower_id, borrower_name, due_date, item_id
FROM loans
WHERE returned_at IS NULL
ORDER BY due_date, loan_id
```

Selecting a loan enables Return. One dialog records its condition. Cancel
keeps the loan open and leaves availability unchanged. Saving closes the
loan and refreshes the table and panel, keeping the equipment row selected.

The Return UI test exercises Cancel followed by Save with Damaged
selected. It checks that the loan closes while availability stays at zero.
It also checks that another item's loan stays open. The Good-return
screenshots below show a unit becoming available when nobody is waiting.

## Put the active loans in a linked list

I later connected a custom singly linked list to this panel. It appends
records through a tail pointer, removes them by loan ID, and traverses
them in insertion order. Loading the SQL results in due-date order gives
the list the order the panel needs.

The panel reads the selected item's records through this traversal.

```python
return [
    loan
    for loan in active_loans.traverse()
    if loan["item_id"] == item_id
]
```

A saved Borrow reloads the list, since the new loan might be due earlier
than records already present. A saved Return removes that loan ID. The
inventory refresh then updates availability and the panel.

Six focused linked-list tests passed. A separate check exercised ordered
traversal and tail reuse after 5,000 inserts and 2,500 removals. The live
Qt test also checked that an earlier-due loan moves to the front and that
returning it removes only its record. All thirty-nine tests, Ruff, and
scoped Pyright checks passed after integration.

## One item through the whole cycle

I ran Borrow and Return in the macOS Qt app using sample records. These
screenshots were captured on November 25, 2026, Philippine time, from
commit `cb1dcfa`.

Before borrowing, the selected multimeter has one unit available and no
active loans.

![Selected multimeter with one unit available and no active loans.](/images/enginventory/2026-11-25-07c709e/01-before-borrow.png)

After borrowing, availability is zero, the active loan is selected, and
Borrow is disabled.

![Same multimeter with zero available units, one selected active loan, and Return enabled.](/images/enginventory/2026-11-25-07c709e/02-after-borrow.png)

After returning it as Good, availability is one again. The active-loan
list is empty and Borrow is enabled on the same item.

![Same multimeter after return with one available unit, no active loans, and Borrow enabled.](/images/enginventory/2026-11-25-07c709e/03-after-return.png)

All eleven tests and Ruff checks passed at this checkpoint. The automated
UI checks ran headlessly on macOS, alongside the app run shown above.
Native Windows and Linux launches are still to be verified. Windows
installation evidence is planned for the release stage.

## Keep Damaged and Lost units unavailable

A later stock-rule correction handles the condition recorded on Return.
A Good return frees a unit or reserves it for the oldest waiter. Damaged
and Lost returns close their loans while keeping those units out of
borrowable stock.

The calculation reads the stored loan history. That also makes existing
Damaged and Lost return records affect availability. The application uses
the same rule for the catalog, details, and borrowing checks.

These sample-data captures are from commit `dea7673`, taken on November 25,
2026, at 14:59 Philippine time. The first shows Damaged selected in the
Return form.

![Return form with Damaged selected and Save and Cancel buttons.](/images/enginventory/2026-11-25-e3d3ec9/01-damaged-return.png)

After Save, the loan is closed, availability is zero, and the one waiting
request stays waiting. The return condition is recorded in the loan
history.

![Digital multimeter after a Damaged return with zero availability, no active loans, and one waiting request.](/images/enginventory/2026-11-25-e3d3ec9/02-stock-stays-unavailable.png)

All fifty-nine tests passed at this correction checkpoint. Coverage
includes mixed stock, existing loan history, waitlist order, and the Qt
Return flow.

## Show each condition under the same item

The next catalog change makes the condition counts visible. One Item ID
and serial number can show Good, Damaged, and Lost quantities in separate
rows. The counts come from the original SQLite item record and its loan
history, and stay within the recorded total quantity.

Only Good stock contributes to borrowable availability. A zero-quantity
Good row stays visible so the item's loans and waitlist are still
reachable. Exact ID search shows the condition rows for that equipment.
Selection now follows both the Item ID and the condition.

These sample-data captures show the running macOS Qt app at commit
`3e0be1f`. They were captured on November 25, 2026, at 16:04 Philippine
time. The commit has an assigned Git timestamp of November 29 at 15:00.

![Exact ID search showing Good, Damaged, and Lost quantities under one multimeter Item ID.](/images/enginventory/2026-11-25-3e0be1f/01-item-id-condition-rows.png)

Selecting Damaged shows its own quantity and zero available units in the
panel.

![Damaged multimeter row selected, with quantity one and availability zero in the details panel.](/images/enginventory/2026-11-25-3e0be1f/02-damaged-condition-details.png)

All sixty-two tests passed at the condition-row checkpoint.

The panel change is recorded in `78c8c66`, availability in `41f3047`, the
active-loan query in `76fb4d0`, and the Return UI in `cb1dcfa`. The linked
list is in `f70df1c`, with panel integration in `db6bd0d`. The stock-rule
correction is in `dea7673`. Development, verification, and screenshots
are from November 25, 2026, Philippine time. These references follow the
rewritten branch, whose assigned Git timestamps span November 27–29.
The stock correction has an assigned timestamp of November 28 at 16:45.
Condition rows are recorded in `3e0be1f`, assigned November 29 at 15:00.
Evidence assets retain their original capture identifiers.
