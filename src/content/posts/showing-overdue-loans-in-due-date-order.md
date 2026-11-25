---
title: "Showing overdue loans in due-date order"
description: "Filtering open equipment loans by the Philippine date and using a custom min-heap to show the earliest due loans first."
pubDatetime: 2026-11-30T16:53:00+08:00
draft: true
tags:
  - technical
  - projects
  - python
  - data-structures
---

Once my inventory app could record loans and returns, I wanted it to show
which equipment was late. I connected a custom min-heap to an Overdue
alert that opens at startup when there are overdue loans. An Overdue
button also opens a freshly loaded list during the session.

## Decide when a loan becomes overdue

The app takes the current date in Philippine time. SQLite selects open
loans whose due date is earlier than that date. A loan due today reaches
the deadline during today, so it enters the overdue list on the next day.
Returned loans are excluded, and the query checks date validity when
reading older records.

The core filter is this condition.

```sql
loans.returned_at IS NULL AND loans.due_date < :today
```

The alert shows the loan ID, equipment name, borrower, due date, and days
overdue. Reopening it queries the saved state again, which lets a return
remove a record from the next alert.

## Pull the earliest due loan first

I built the array-backed binary min-heap separately before connecting it
to the query. Each entry has `(due_date, loan_id)` as its priority. Equal
due dates therefore use the loan ID to give the display a stable order.

The integration builds the heap from the matching rows, then extracts
its minimum until the heap is empty.

```python
heap.heapify(((row["due_date"], row["loan_id"]), row) for row in rows)

ordered = []
while not heap.is_empty():
    ordered.append(heap.extract_min())
```

Bottom-up heapify takes linear time in the number of matching loans.
Extracting all of them gives the complete ordered list in O(k log k)
time for k matches, using O(k) space. Reading the stored loans also
contributes to the work.

## Check the date boundary and refresh

The six dedicated heap tests cover date ties, empty heaps, reuse,
heapifying iterators, replacing existing contents, and interleaved
insertion and extraction. They passed when verified on November 25, 2026,
at 16:07 Philippine time.
[Heap test record](/images/enginventory/2026-11-25-983b381/min-heap-tests.txt)

All seventy-one project tests passed after alert integration.

These running macOS Qt captures use sample borrower names. They were
captured on November 25, 2026, at 16:13 Philippine time from `2401522`.
The initial alert puts the November 21 loan before the November 24 loan,
even though their IDs are two and one respectively.

![Overdue alert at launch, ordered by due date with loans four days and one day overdue.](/images/enginventory/2026-11-25-2401522/01-overdue-at-launch.png)

After the earlier-due loan is returned, opening Overdue again shows only
the remaining loan.

![Freshly opened overdue list after return, showing only the November 24 loan.](/images/enginventory/2026-11-25-2401522/02-overdue-on-demand.png)

The heap is recorded in `983b381`, with an assigned Git timestamp of
November 29 at 15:15 PHT. Alert integration is in `2401522`, assigned
November 29 at 15:30 PHT. Actual development, verification, and captures
are from November 25. Native Windows release verification is a later
checkpoint.
