---
title: "Undoing the last equipment return"
description: "Using a custom stack and one SQLite transaction to reverse the latest return while respecting stock and waitlist reservations."
pubDatetime: 2026-11-29T10:02:00+08:00
draft: true
tags:
  - technical
  - projects
  - python
  - data-structures
---

Recording a return changes several things in my inventory app. It closes
a loan, changes stock availability, and can reserve the unit for the next
person waiting. Undo has to account for all of those changes.

I added Undo Last Return for the latest return saved in the current app
session. It asks for confirmation, attempts the reversal in SQLite, then
refreshes the selected equipment and its active loans.

## Keep the return candidate on a stack

The custom linked-node stack keeps its latest entry at the top. Push,
pop, and peek take constant time, with O(n) storage for n entries.
The toolbar uses it to retain one candidate in the current session.

Confirming Undo reads that loan ID. A successful database reversal removes
the candidate and disables the button. Cancelling or a blocked reversal
keeps it available for another attempt.

The core successful path follows this sequence.

```python
loan_id = return_history.peek()
undo_return(db_path, loan_id)
return_history.pop()
```

The handler catches failures before popping the stack. The confirmation
and error handling surround this sequence in the application.

## Reverse the whole transaction

The storage function reopens the original loan. If its return promoted a
waiting request into an uncollected Ready hold, Undo restores that request
to its original FIFO position. It then checks the resulting stock before
committing.

An already picked-up reservation blocks reversal. Insufficient Good stock
also blocks it. The transaction rolls back if the reversal cannot be
completed, preserving the saved state.

Five stack tests passed, followed by six dedicated storage tests for all
return conditions, request order, rollback, and the two conflict cases.
Actual stack verification was November 25 at 16:15 PHT, and transaction
verification was November 25 at 16:57 PHT.
[Stack test record](/images/enginventory/2026-11-25-aabcd6f/stack-tests.txt)
· [Transaction test record](/images/enginventory/2026-11-25-53412b6/undo-transaction-tests.txt)

## Watch a reservation become a waiting request again

These running macOS Qt captures use sample records from `2bedce8`.
They were captured on November 25, 2026, at 17:02 Philippine time.

Before Undo, the return has reserved the single unit for the next waiter.
There is a Ready request and no active loan.

![Multimeter after return showing a Ready reservation and the enabled Undo Last Return action.](/images/enginventory/2026-11-25-2bedce8/01-return-ready-to-undo.png)

After Undo, the original loan is active again and the request is back on
the waitlist. General availability stays at zero through this reversal.

![Multimeter after Undo showing the original active loan, one waiting request, and the disabled Undo action.](/images/enginventory/2026-11-25-2bedce8/02-loan-reopened.png)

All eighty-four project tests passed after toolbar integration, including
two new Qt tests. The captures and verification are from November 25.

The stack is in `aabcd6f`, storage reversal in `53412b6`, and the toolbar
in `2bedce8`. Their assigned Git timestamps are November 29 at 15:45,
16:00, and 16:15 PHT respectively. Native Windows release verification
is a later checkpoint.
