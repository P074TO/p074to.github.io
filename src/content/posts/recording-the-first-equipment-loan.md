---
title: "Recording the first equipment loan"
description: "Adding the first borrowing dialog, protecting the last available unit with a SQLite transaction, and recording returns without losing loan history."
pubDatetime: 2026-11-24T05:49:00+08:00
draft: false
tags:
  - projects
  - technical
  - python
---

With [items and photographs saved](/posts/saving-equipment-photos-with-inventory-items/),
the next step was to record somebody borrowing the equipment. The
November 24 work introduced the first loan records and a Borrow dialog.

This was an initial lending workflow. The later side panel, visible stock
refresh, waitlist, and condition-aware availability rules were still ahead.

## Start from the selected equipment

Double-clicking an inventory row opens an item-details dialog. The
November 24 photo change reads the saved original and scales it for a
larger preview, with a fallback when no usable photograph is present.

Borrow opens another form for that item. It collects the borrower's ID,
name, Student or Faculty role, purpose, and due date. Borrower IDs stay as
text so an ID such as `00123` retains its leading zeroes.

Save sends a `LoanDraft` to the storage function. A successful commit
accepts the form. A validation or stock error leaves it open with an
explanation, while Cancel creates no loan.

At this stage the role is a field entered with the loan. It does not
establish an authenticated account or enforce ownership of a loan.

## Protect the last available unit

Each loan represents one unit. The initial calculation subtracts active
loans from the item's stored quantity:

```text
available = recorded quantity - number of active loans
active loan = returned_at is NULL
```

The stock check and loan insertion need to happen together. Checking
availability first and inserting later would leave a gap in which another
writer could take the same last unit.

The storage operation enables foreign keys for its connection and starts
a write transaction before reading stock:

```python
cursor = connection.execute("PRAGMA foreign_keys = ON")
cursor.execute("BEGIN IMMEDIATE")
```

It then checks that the item exists, counts its open loans, rejects the
request if availability is zero, inserts the loan, and commits. The
transaction is intended to keep competing writers from both acting on
the same stock value. The regression tests exercise repeated borrowing of
the last unit; they do not constitute a concurrent-writer stress test.

The count query also has a cost. This version scans loan records, so the
whole borrowing operation is not constant time. Custom data structures
and measured search performance belong to later checkpoints.

## Close a loan while keeping its history

The storage layer also gained `return_item`. It sets a return timestamp
and condition on an open loan. The update includes the active-state check:

```sql
UPDATE loans
SET returned_at = datetime('now'), return_condition = ?
WHERE loan_id = ? AND returned_at IS NULL
```

A second return affects no rows and is rejected, preserving the first
return record. The loan remains in the database for history.

There is an important limitation in this first version: the availability
calculation considers only whether a loan is open. Closing a Damaged or
Lost return would therefore also make that unit available again. The
return condition is saved, but it does not yet govern stock. A later
condition-aware correction is necessary before those cases behave
properly.

The Return storage function also arrives before a Return control in the
interface. Recording a return through the desktop window is later work.

## The first Borrow form and stock warning

These captures show the November 24 version at `c90bfdd`, running from its
original source with disposable sample records. I captured them on
**November 25, 2026 at 22:32 Philippine time**, using Qt offscreen on
macOS. They show the application's dialogs without operating-system
window frames.

The form retains the leading zeroes in the sample borrower ID and records
a Student role, purpose, and due date.

![Initial Borrow form with sample borrower ID 00123, Sample Borrower, Student role, Lab exercise purpose, and a November 30 due date.](/images/enginventory/2026-11-25-c90bfdd/01-borrow-form.png)

After saving the first loan for the only unit, another Save attempt
produces the out-of-stock warning. The capture run also checked that the
database still contained only the first loan.

![Warning dialog stating that no units are available for this item.](/images/enginventory/2026-11-25-c90bfdd/02-out-of-stock-warning.png)

## Verify the boundary cases

The feature history records the larger photo preview in `3f2a654`, loan
and return storage in `67c1933`, and the borrowing interface in `c90bfdd`.
All three are dated November 24.

For this retrospective entry, I rechecked the subsequent early test
snapshot on **November 25, 2026**. All seven tests passed with temporary
SQLite databases and headless Qt on macOS.

The storage checks borrow the final unit, reject another loan, return it
as Good, reject a second return, and borrow it again. The UI check cancels
one Borrow attempt, saves another, then confirms that a further attempt
produces an out-of-stock warning. It also checks that the saved borrower
ID remains `00123`.
[Historical snapshot verification](/images/enginventory/2026-11-25-early-milestones/verification-summary.txt)

The test snapshot is `f7c033b`, whose assigned Git timestamp is November 26. That timestamp is separate from the November 24 feature work and the
November 25 recheck. These results establish the tested initial flow;
they do not cover all of the assignment's lending requirements.

Once the form, details, and lending code were connected, the startup
module was carrying more responsibilities. That led into
[splitting the application into smaller modules](/posts/splitting-my-python-app-without-breaking-imports/).
