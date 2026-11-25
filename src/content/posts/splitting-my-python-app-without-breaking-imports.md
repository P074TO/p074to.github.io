---
title: "Splitting my Python app without breaking existing imports"
description: "How I split an equipment inventory app into smaller modules while keeping its storage imports and launch command working."
pubDatetime: 2026-11-25T11:44:00+08:00
draft: false
tags:
  - technical
  - projects
  - python
---

By November 24, my equipment inventory app could save items and photos,
show cached thumbnails, and record loans through a PySide6 form. Startup,
window construction, and storage were becoming harder to follow as those
pieces grew. I wanted to be able to work on one dialog without searching
through the rest of the application.

I moved the work onto a refactoring branch and split it into small commits.

## Giving each part a home

Startup stayed in `main.py`. Platform data paths moved into `app_paths.py`.
The inventory window and each dialog got their own modules under `ui`.
Inventory storage moved into `inventory_db.py`, and borrowing and returns
moved into `loans_db.py`.

I kept the GUI built with functions. Each function builds one window or
dialog and connects the actions it owns. That let me follow an action from
its button to the storage call without adding a new application framework.

## Keeping existing callers working

The storage tests already imported functions from `src.db`. I kept that
entry point and imported the moved functions there.

```python
from .inventory_db import ItemDraft, add_item, get_item, list_items
from .loans_db import LoanDraft, borrow_item, return_item
```

An existing caller could still write this.

```python
from src.db import ItemDraft, add_item
```

Database initialization stayed in `db.py`. Its `__all__` list names the
public interface and controls wildcard imports. The imports above make
those names available to explicit callers.

## What I checked

Before moving the modules, I added regression coverage for database
initialization, duplicate serial numbers, photo saving and cleanup, and
the Add Item, Borrow, and return behavior already present.

All eight tests and Ruff checks passed after the split. A headless Qt
launch exercised the app on macOS. The platform-path test used simulated
Windows and Linux settings, so native launches on those systems are still
open work.

The normal launch command continued to work.

```bash
uv run --locked python -m src.main
```

The changes are recorded in commits `f7c033b` through `c2eb3a8` on the
rewritten branch. Development and verification took place on November 24,
2026, Philippine time. A later history rewrite assigned these
commits Git timestamps on November 26. The next interface work can build
on these smaller modules while the storage tests keep exercising `src.db`.
