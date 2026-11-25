---
title: "EngInventory interim: preliminary considerations"
description: "The initial requirements, scope, architecture, and implementation plan for an offline equipment inventory app with custom data structures."
pubDatetime: 2026-11-19T18:00:00+08:00
draft: false
tags:
  - projects
  - technical
  - planning
  - python
---

**Planning baseline: November 19, 2026.** This entry brings together the
assignment brief and my initial plan for EngInventory. It records the
requirements and proposed design. Implementation results and changes to the
plan belong in subsequent entries.

## What I am building

EngInventory is a school project for managing equipment and tool loans in
an engineering laboratory. The intended result is a Windows desktop app
that works offline: staff can maintain the inventory, borrowers can find
available equipment, and the system can keep track of loans and returns.

The assignment also requires custom data structures and algorithms. Each
one needs a useful role in the application, tests, and an explanation of
its costs and tradeoffs. Making the interface work is one part of the
project; being able to explain what happens behind each action is another.

The original brief is written for a team of three or four students over
two weeks. I am planning the work as a solo project. That makes the scope
and checkpoint schedule an early concern. The solo arrangement and any
adjustments still need to be confirmed with the instructor; my own plan
does not change the assignment requirements.

## Requirements from the project brief

The following is a condensed working specification, paraphrased from the
assignment. The design choices later in this entry are my proposed way of
meeting it.

### Inventory and photographs

An administrator must be able to add an item with an automatically assigned
ID, name, category, manufacturer, model, serial number, quantity, condition,
storage location, and acquisition date. Required fields need validation,
and duplicate records must be rejected.

Each item needs an actual JPG or PNG photograph, limited to 2 MB. The app
must copy the image into its own data folder, generate a thumbnail, and
show the photograph in both the inventory list and item details.

Borrowers need live name-prefix search, exact Item ID search, category
filtering, and a sorted inventory view. The list must show the photograph,
name, available quantity, condition, and location.

### Borrowing and returns

A loan records the borrower's ID, name, Student or Faculty role, purpose,
and due date. Borrowing reduces availability. When no units are available,
requests enter a per-item FIFO waitlist.

Returning equipment records the date and its Good, Damaged, or Lost
condition, updates stock, and processes the waitlist. The app must show
overdue loans at startup and on demand, with the earliest due dates first.
A single undo action must reverse the latest return.

These actions affect several records at once. A return, for example, may
change a loan, stock, and the waitlist. Keeping those changes consistent
will be a central part of the design.

### Administration and delivery

The remaining mandatory features are:

- Administrator access to inventory management, with borrowers restricted
  to borrowing and returning their own items. Passwords must be hashed.
- Current inventory and borrowing-history exports to CSV or PDF.
- ZIP backup and restore of the database and images.
- A Windows `Setup.exe` that installs the application and a Start Menu
  shortcut, then runs without Python or developer tools on the target PC.

The brief also sets acceptance targets: an interactive startup within five
seconds on a typical lab PC, and search under 100 milliseconds over at
least 5,000 items. Every mutation must persist to SQLite, including across
a forced close. Only one instance may run at a time.

Mandatory actions must be reachable within two clicks from the main
window. Destructive actions need confirmation. An audit log must record
adds, loans, returns, and deletions with a timestamp and user. These are
requirements to verify, rather than performance or reliability claims I
can make at the planning stage.

## Keeping the scope manageable

The initial interface will be one inventory table, a details panel, and
short dialogs for actions such as adding an item or recording a loan.
Search and category filtering belong above the table. Add Item, My Loans,
and Overdue need obvious entry points.

I plan to use CSV for the required exports. The brief accepts CSV or PDF,
and CSV gives me a straightforward report format to inspect and test.
Barcode input, location routing, a statistics dashboard, and visual
extras can wait until the mandatory workflows and installer are reliable.

The first useful milestone is small: add one item, close the application,
reopen it, and find that same item. From there, I can add its photograph
and build a complete borrow-and-return cycle.

## Proposed architecture

The starting stack is Python 3.11, PySide6, SQLite, and Pillow for image
validation and thumbnails. Development will take place on macOS, with
Windows builds and installation checks performed in a VM.

The main separation is between the interface, application operations,
custom data structures, and persistent storage:

```text
PySide6 windows and dialogs
          |
          v
Application operations
  validate inputs and permissions
  coordinate loans, stock, and waitlists
          |
          +--> SQLite transactions: durable records
          +--> Custom structures: lookup and ordering
          +--> Image files, thumbnails, and audit log
```

I want each dialog to hand off a clear operation, such as adding an item
or returning a loan. Stock and waitlist rules should have a shared place
outside individual button handlers so the same rules can be tested
without clicking through the interface.

A tentative source layout is:

```text
src/
  main.py          startup and application initialization
  app_paths.py     platform-specific data locations
  ui/              windows and dialogs
  services/        inventory and loan operations
  storage/         schema and database access
  dsa/             one module per required structure
  images.py        image validation and thumbnail handling
tests/
build/             packaging specifications and installer script
docs/              design notes and verification evidence
```

This is a proposed layout. It can change as the responsibilities become
clearer during implementation.

### SQLite and the in-memory structures

SQLite will hold the durable inventory, users, loans, and waitlist
records. The custom structures will support the operations the assignment
asks me to demonstrate. They can be rebuilt from saved records on startup.

A mutation must validate its preconditions and commit its related database
changes together. After a successful commit, the in-memory structures must
reflect that state before the next action is accepted. If an index update
fails, the app needs to rebuild it from SQLite or stop the operation flow
with a clear error. An unsuccessful database transaction must leave the
visible state unchanged.

This needs explicit tests. SQLite transactions cannot make a separate
Python data structure or filesystem operation atomic. Image copying and
cleanup will also need a failure path so a failed save does not leave
broken references or unnecessary files.

### Local files and installation

The brief separates installed program files from mutable user data:

```text
C:\Program Files\EngInventory\       installed application

%LOCALAPPDATA%\EngInventory\
  inventory.db
  images\
  thumbnails\
  backups\
  logs\app.log
```

The app must resolve these locations rather than hard-code a development
machine's paths. Images stay on disk; SQLite stores their filenames.
Uploads receive names based on the Item ID and a random suffix. Replacing
an image or deleting an item must clean up its associated files.

First launch must create the data folders, initialize the schema, and add
a small demonstration dataset. Backup must capture a consistent database
and its associated images. Restore needs validation and a recovery path
before replacing the current data.

## Where the custom structures fit

The assignment requires the core implementations to be written from
scratch in separate `src/dsa/` modules. A built-in collection or library
implementation cannot substitute for the required algorithm. Supporting
storage, such as an array inside a hash table, is allowed.

| Required structure                 | Planned use                            | Cost or tradeoff to explain                                                                                                 |
| ---------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Hash table with collision handling | Exact Item ID and serial-number lookup | Expected O(1) lookup; worst case O(n), with collision and resizing costs.                                                   |
| AVL tree                           | Sorted inventory and range queries     | O(log n) insertion, deletion, and key lookup; traversal still visits the returned records.                                  |
| Trie                               | Live name-prefix search                | Reaching a prefix depends on its length; collecting matches adds work proportional to the results and their representation. |
| FIFO queue                         | Waitlist for each item                 | O(1) enqueue and dequeue with suitable head and tail storage; arbitrary search remains linear.                              |
| Stack                              | Latest-return undo                     | O(1) push and pop; reversing the application transaction has additional work.                                               |
| Min-heap                           | Earliest-due overdue loans             | O(n) heap construction and O(log n) removal; displaying all entries requires repeated work.                                 |
| Linked list                        | Active loans in memory                 | O(n) traversal and lookup; removal also depends on whether the node or its predecessor is already known.                    |
| Stable merge sort                  | Report ordering                        | O(n log n) sorting with auxiliary storage, while preserving the order of equal keys.                                        |
| Binary search                      | Lookup within a sorted report section  | O(log n) boundary or key lookup after sorting; producing the output adds its own cost.                                      |

The precise binary-search use is still a design choice. A date range in
sorted borrowing history is one candidate, provided it makes the report
more useful and the ordering assumptions are explicit.

The brief requires at least five assertions per structure across normal,
boundary, and error cases, plus complexity tables and a justification of
the chosen operations. Those are minimums. Collision handling, AVL
rotations, and removing the final node or entry will need focused cases.

I also need to distinguish the cost of a structure operation from the cost
of the whole screen. An expected O(1) item lookup does not make loading an
image or rendering thousands of rows O(1).

## Rules that need a clear decision

Several details deserve a written rule before their workflows grow:

- **Item identity:** how quantity relates to a serial number, and which
  fields determine that an item is a duplicate.
- **Return condition:** how a damaged or lost return affects physical
  stock and usable availability. A completed return must not silently
  make an unusable unit available for borrowing.
- **Waitlist promotion:** whether promotion immediately creates a loan or
  holds a unit for pickup, and how the first borrower is informed offline.
- **Undo:** the lifetime of the latest-return action and what happens if
  another borrower has already taken the unit affected by that return.
- **Dates:** whether due dates represent a calendar day or an exact time,
  the timezone convention, and when a loan becomes overdue.
- **Roles:** how an authenticated account is linked to a borrower ID so
  ownership checks apply beyond what the interface happens to show.

These choices affect both the schema and the tests. I want the rules to be
understandable before adding more controls to the interface.

## Overall implementation plan

The initial schedule aims for submission on December 2, with installation
proof and the recorded demonstration ready by December 1. These are
planned checkpoints, not a record of completed work.

| Planned period | Intended outcome                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| November 19    | Clarify solo scope and graded dates; prepare the repository, recording setup, and Windows handoff.                                               |
| November 20–23 | Add and persist one item, display its photograph, introduce search and browsing, test the first structures, and attempt an early Windows launch. |
| November 24–25 | Connect borrowing, returns, FIFO waitlists, undo, and overdue handling into one demonstrable workflow.                                           |
| November 26–28 | Add CSV reports and the remaining algorithms; attempt a packaged Windows build; address roles, backup, and application checks.                   |
| November 29–30 | Measure performance, collect evidence, prepare the report and slides, and produce an installer candidate.                                        |
| December 1–2   | Verify installation in a clean Windows environment, finish the narrated video, rehearse, and check the submission package.                       |

The initial solo estimate is larger than the available time budget, so
this schedule needs reassessment after each working milestone. If a block
slips, I need to record the gap and clarify checkpoint priorities with the
instructor. Optional features stay last; mandatory work does not become
optional because the schedule is tight.

## Verification and handover

I plan to collect evidence while building each feature: test output,
screenshots, short recordings, and notes on the input and expected result.
Borrower examples must use sample data.

The application checks need to cover invalid input, duplicate records,
reopening saved data, stock boundaries, FIFO order, return conditions,
undo conflicts, overdue ordering, and backup restoration. Permission
checks must reject attempts to change another borrower's loans.

For performance, I need a generated dataset of at least 5,000 items and
recorded timings with the machine and measurement boundary stated. The
DSA demonstration also requires a comparison of linear, binary, and hash
lookup on the same data. Startup and complete user-facing search need
their own measurements.

The planned Windows release path is a PyInstaller folder build wrapped
with Inno Setup. A successful launch on the development machine is one
checkpoint. Final proof requires offline installation and first launch in
a clean Windows VM without Python or development tools, followed by a
check of the shortcut and data locations.

The submission also includes the source and tests, build scripts, run and
build instructions, an 8–15 page technical report, complexity tables, a
user manual, installation evidence, slides, and a contribution record
adapted to the agreed solo arrangement. The original 3–5 minute narrated
video needs a diagram and live app footage; a separate 5–7 minute live
demonstration must be prepared.

For the next interim update, the most useful evidence will be a working
item saved and reopened, its photograph displayed, and an account of what
changed from this initial plan.
