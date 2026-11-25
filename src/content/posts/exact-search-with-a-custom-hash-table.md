---
title: "Connecting custom data structures to inventory search"
description: "Connecting hash tables, AVL trees, and a trie to inventory search, then measuring the cost of updating the Qt table."
pubDatetime: 2026-11-27T13:23:00+08:00
draft: true
tags:
  - technical
  - projects
  - python
  - data-structures
---

My equipment inventory app could already add, borrow, and return items.
The next steps were finding one item by ID or serial number and browsing
the catalog by name or category. Adding name suggestions also gave the
custom hash table, AVL tree, and trie from my data-structures work a place
in the application.

On November 25, I checked each structure separately, then connected them
to a search field with autocomplete, an A–Z catalog, and a category dropdown.

## Build the table first

The hash table owns its buckets and stores colliding keys together in
small lists. Looking up a key searches its bucket for an exact match.
When the entry count exceeds 75% of the bucket count, the table doubles
its capacity and redistributes the entries.

Seven dedicated unit tests passed. A separate correctness run exercised
5,000 integer IDs and their 5,000 string serial keys through growth and
deletion.

## Let one field check both identifiers

SQLite loads the catalog into two custom hash indexes. One uses each
item's displayed ID as a string. The other uses its serial number.

The lookup reads both indexes.

```python
id_match = items_by_id.get(query)
serial_match = items_by_serial.get(query)
```

If both matches identify the same equipment, it enters the result set once.
The table can display separate condition rows for that equipment.
If a numeric serial matches another item's ID, both items appear. That
avoids silently choosing one meaning for the number the user entered.

The field trims surrounding whitespace. Clearing it restores the full
catalog within the chosen category, and an unsuccessful lookup shows a
no-matches message.

## Browse in order with an AVL tree

A second pair of indexes uses custom AVL trees. The name index stores
`(name.casefold(), item_id)` as its key, so equal names keep separate
entries and sort by ID. An in-order traversal supplies the A–Z catalog.

The category index uses `(category.casefold(), name.casefold(), item_id)`.
With the search field empty, the dropdown uses a range query to retrieve
that category's entries in name order. With an exact query entered, the
app combines exact and prefix matches, then keeps matches in the selected
category.

Six dedicated AVL tests cover all four insertion rotations, deletion,
inclusive ranges, equal names, and balance after repeated removal. A
separate run checked traversal, ranges, and stored heights after 5,000
inserts and 2,500 deletes.

## Search names by prefix

The trie indexes case-folded item names one character at a time. A prefix
search returns matching item IDs in name order, with IDs breaking ties.
Two items named Lab stand keep separate records.

The same field now checks exact IDs and serials first, then appends name
prefix matches while keeping each item once. The trie also supplies the
suggestion popup. Suggestions use distinct names, while accepting one can
still show several items with that name. The category filter applies to
both exact and prefix results.

Six dedicated trie tests passed, followed by a correctness check after
5,000 inserts and 1,250 removals. The Qt regression test covers accepting
a suggestion with the keyboard and retaining distinct IDs for equal names.

## Keep the filtered view current

Adding an item or saving a loan operation reloads the catalog and rebuilds
the indexes, then applies the current query and category again. Selection
is restored by Item ID and condition when that row is still visible.

The tests cover ID and serial matches, the numeric overlap, missing keys,
clearing the field, and finding an item added while searching. The Return
UI test also runs with both a serial filter and a category active, checking
that availability updates while the filters and selected equipment stay
in place.

All thirty-three tests, Ruff, and scoped Pyright checks passed after
prefix search and the redraw change.

A later catalog checkpoint, `3e0be1f`, expands each matched item into its
Good, Damaged, and Lost rows as applicable. Exact ID search keeps all
those condition rows together, and selection uses `(item_id, condition)`.
All sixty-two tests passed at that checkpoint. Its assigned Git timestamp
is November 29 at 15:00 PHT, with screenshots captured November 25 at
16:04 PHT.

## Measure the interaction

The first prefix-search timing run showed that updating the table could
cost time even when a query returned the full catalog. I added a check
that keeps the existing table when its result rows are identical, while
still refreshing the details panel.

These measurements precede the condition-row change, at the prefix-search
and redraw checkpoints `4821343` and `e682a6a`. They used macOS,
Qt 6.12.0 in offscreen mode, and 5,000
synthetic items without photos. Timing started when setting the query text
and included Qt event processing. Each query ran three times. The earlier
run used a fresh UI filter for each trial, and the later run started from
the full catalog.

| Query           | Result rows | Before, milliseconds | After, milliseconds |
| --------------- | ----------- | -------------------- | ------------------- |
| `LAB-0420`      | 1           | 11.5, 13.2, 20.3     | 8.4, 8.8, 8.3       |
| `lab stand 004` | 10          | 18.8, 34.6, 23.2     | 10.4, 8.7, 8.7      |
| `lab`           | 5,000       | 111.3, 97.6, 83.6    | 5.1, 3.6, 4.8       |

The broad `lab` query returns the catalog already on screen, so it can
skip rebuilding those 5,000 rows. These results describe the tested
queries and setup. Index construction, photos, and native Windows
behavior still need their own measurements.
[Before timing record](/images/enginventory/2026-11-25-f070611/03-search-timing.txt)
· [After timing record](/images/enginventory/2026-11-25-1057508/search-timing.txt)

## Try it in the app

These macOS Qt captures use sample records and were taken on November 25,
2026, Philippine time, from commit `9e8fde0`.

Searching for item ID `1` shows the multimeter.

![Inventory filtered by item ID 1, showing the selected multimeter.](/images/enginventory/2026-11-25-3c29965/01-item-id.png)

Searching for serial `LAB-002` shows the caliper.

![Inventory filtered by serial LAB-002, showing the selected caliper.](/images/enginventory/2026-11-25-3c29965/02-serial-number.png)

The next two captures are from commit `afc6fc6`, also taken on November 25,
2026, Philippine time. The catalog shows Caliper, Heat Gun, Multimeter,
and Power Supply in A–Z order.

![Full catalog in alphabetical order, with Caliper selected.](/images/enginventory/2026-11-25-68658b2/01-catalog-a-z.png)

Selecting Measurement narrows the catalog to Caliper and Multimeter.

![Measurement category showing Caliper and Multimeter in alphabetical order.](/images/enginventory/2026-11-25-68658b2/02-category-filter.png)

The prefix-search captures below come from `4821343`, taken on the same
Philippine date. The first image combines the actual Qt window and its
suggestion popup at their recorded positions.

![Composited Qt window and popup showing Lab stand and Laboratory clamp suggestions for lab.](/images/enginventory/2026-11-25-f070611/01-prefix-suggestions.png)

Accepting Lab stand keeps both equipment records with that name visible.

![Accepted Lab stand suggestion showing two records with different item IDs.](/images/enginventory/2026-11-25-f070611/02-accepted-suggestion.png)

The hash-table checkpoints are `96e3220` and `9e8fde0`, and the AVL
checkpoints are `77b915a` and `afc6fc6`. The trie implementation is in
`9299a07`, prefix search in `4821343`, and the redraw change in `e682a6a`.
Development, verification, screenshots, and timing records are from
November 25, 2026, Philippine time. The references above follow the
rewritten branch. The hash-table, AVL, trie, and redraw commits have
assigned Git timestamps on November 27. The later condition-row commit
is assigned November 29 at 15:00.
Evidence assets and timing records retain their original identifiers.
