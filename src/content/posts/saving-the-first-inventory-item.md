---
title: "Saving the first inventory item"
description: "Building the first SQLite inventory table, validating equipment records, and displaying saved items in a desktop window."
pubDatetime: 2026-11-22T23:14:00+08:00
draft: false
tags:
  - projects
  - technical
  - python
---

The [initial plan for EngInventory](/posts/enginventory-interim-preliminary-considerations/)
covered a lot: equipment photographs, borrowing, waitlists, custom data
structures, and a Windows installer. On November 22, the first concrete
step was to give one equipment record somewhere durable to live.

I started with SQLite storage before connecting the desktop form. The
first useful question was whether an item could be saved and read again
without losing its identity or accepting an invalid record.

## Give an item a consistent shape

The `items` table stores an automatically generated Item ID, name,
category, manufacturer, model, serial number, quantity, condition, storage
location, and acquisition date. Serial numbers are unique. Required text
fields cannot be blank, quantity must be a nonnegative integer, and
condition must be Good, Damaged, or Lost.

Zero quantity is allowed. An out-of-stock item still belongs in the
catalog, even before the app has a waitlist to attach to it.

I also added creation and update timestamps. The schema gives both their
initial values; a later edit operation will need to update `updated_at`
explicitly.

## Validate before inserting

The storage function takes an `ItemDraft`, trims required text, validates
the condition and acquisition date, and converts the date to ISO format.
It checks the quantity's type as well as its value, so an integer-looking
float or Python boolean does not pass as a stock count.

The insert uses named parameters. A duplicate serial number leaves the
table unchanged and becomes a useful validation error for the caller:

```sql
INSERT INTO items (
    name, category, manufacturer, model, serial_no,
    quantity, condition, storage_location, date_acquired
)
VALUES (
    :name, :category, :manufacturer, :model, :serial_no,
    :quantity, :condition, :storage_location, :date_acquired
)
ON CONFLICT (serial_no) DO NOTHING
```

After the insert, the function checks the affected-row count, commits the
transaction, and returns the generated ID. Validation in Python gives the
caller readable messages, while SQLite constraints also protect the
stored record.

## Bring saved records into a window

Database initialization creates missing parent directories and applies
the bundled schema with `CREATE TABLE IF NOT EXISTS`. Reopening the app
must preserve the existing records.

`list_items` reads saved rows through `sqlite3.Row`, which lets the
interface use column names. The first PySide6 window displays ID, name,
quantity, condition, and storage location. Its cells are read-only, so
editing a table cell cannot bypass the storage function.

This version loads the full result into the table. Fetching and rendering
all records grows with the number of items; the required custom search
structures and performance measurements are later work. The Add Item
form also comes in the next milestone.

Application data goes in the user's application-data directory rather
than beside the source code or inside the installed program folder. The
initial launcher includes separate Windows, macOS, and Linux path rules.
That code alone does not establish that the app has been tested natively
on all three systems.

## The first inventory window

This capture shows the November 22 version at `e80c0fd`, running with a
sample multimeter record. I captured it on **November 25, 2026 at 22:32
Philippine time**, using the original source and Qt offscreen on macOS.
The screenshot shows the application widgets without the operating
system's window frame.

![The first inventory table showing a saved sample multimeter with one unit, Good condition, and Cabinet A as its location.](/images/enginventory/2026-11-25-e80c0fd/01-saved-inventory-table.png)

## What this milestone established

The November 22 commits cover the schema (`c987e37`), initialization
(`78ca3e6`), validated insertion (`a88a568`), reading records (`3efcc7b`),
and the first inventory window (`e80c0fd`). They establish the storage and
display foundation for the form and photographs that follow.

For this retrospective entry, I rechecked the early application snapshot
on **November 25, 2026**, using temporary databases and headless Qt on
macOS. Its seven tests passed, including saving an item, rejecting a
duplicate serial number, and preserving the item across initialization.
[Historical snapshot verification](/images/enginventory/2026-11-25-early-milestones/verification-summary.txt)

Those tests belong to snapshot `f7c033b`, whose assigned Git timestamp is
November 26. The feature commits above retain their November 22 dates;
the later test snapshot and today's recheck provide supporting evidence.
This is still an early catalog, with borrowing, access control, and the
Windows release ahead of it.

Next: [adding the item through the desktop form and saving its photograph](/posts/saving-equipment-photos-with-inventory-items/).
