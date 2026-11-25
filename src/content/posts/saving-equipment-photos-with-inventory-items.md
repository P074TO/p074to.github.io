---
title: "Saving equipment photos with inventory items"
description: "Connecting the Add Item form to SQLite, copying equipment photos, and reusing thumbnails without leaving partial saves behind."
pubDatetime: 2026-11-23T22:18:00+08:00
draft: false
tags:
  - projects
  - technical
  - python
---

The [first inventory window](/posts/saving-the-first-inventory-item/)
could display saved equipment. On November 23, I connected an Add Item
form and worked through what it means to save a photograph with a record.

Choosing a file and previewing it is only the beginning. The app needs
its own copy so the catalog can still show the equipment after the
original file moves or disappears.

## Save through the same storage function

The form collects the equipment specifications, quantity, condition,
location, and acquisition date. Save creates an `ItemDraft` and calls the
existing storage operation. A validation error keeps the form open with
a message. The dialog accepts only after the database commit succeeds;
then the inventory table reloads.

This keeps the storage rules useful outside the interface. A quantity
control helps with input, but the storage function still validates what
it receives.

## Preview the selected photograph

The photo chooser offers JPG and PNG files. The initial GUI checks the
selected file's size against a 2,000,000-byte limit and asks Qt to decode
it. An unreadable image produces a warning. A readable image gets a
preview scaled to fit 200 by 120 pixels while retaining its proportions.

This implementation uses Qt's image classes. The preliminary plan listed
Pillow, but the desktop toolkit already provides the preview and
thumbnail operations used here.

These checks describe the GUI path at this checkpoint. The storage API
copies the supplied file; it does not independently decode it or enforce
the GUI's size limit. Photos are also still optional in this version,
although the assignment calls for an actual equipment photograph. Those
are limits to address before treating image handling as complete.

## Make the copy part of saving the item

SQLite stores a filename, and the original image lives in an `images`
folder beside the database. Its name combines the generated Item ID, a
random suffix, and the lowercased file extension:

```text
images/{ItemID}_{random8}.{ext}
```

The save operation inserts the item, creates a new destination file,
copies the selected image, and records its filename before committing.
Exclusive file creation avoids overwriting a file that already exists at
the chosen path.

If copying raises an error, the operation removes the newly created file
and closes the uncommitted database connection. The database insert is
rolled back. The important failure case is an interrupted copy that has
already written some bytes.

The later regression test simulates exactly that interruption:

```python
def fail_after_write(src, dst):
    dst.write(src.read(1))
    raise OSError("Copy interrupted")
```

It then checks that no item row or partial image remains and that another
save can succeed. This covers an exception during copying. It does not
prove that a database transaction and a filesystem operation are atomic
across every process crash or power failure.

## Keep existing records and reuse small images

Adding `image_filename` also needs to work for a database created before
photographs existed. Initialization checks the existing columns and adds
the missing nullable column, preserving saved items. A record without a
photo can still be displayed.

For the table, the app generates a thumbnail fitted within 64 by 64
pixels. It saves that in a separate `thumbnails` folder and reuses it on
later loads. Qt's `QSaveFile` writes the cache file before committing it to
its destination. If generation fails, the table can fall back to an empty
photo cell.

That avoids decoding and shrinking the full photograph for every table
refresh. A larger saved-photo detail view follows in the November 24
work.

## What I could verify

The Add Item form is in `19fd3bd`. Photo selection and preview are in
`3bd6651`, filename support in `ce79161`, copying in `a7ea6c6`, the form's
photo-save connection in `2e094d9`, and thumbnail display in `a1dd5ff`.
These feature commits are dated November 23.

I rechecked the early application snapshot on **November 25, 2026**. All
seven tests passed. They include preserving an older catalog while
adding the photo column, copying a file under its generated name,
cleaning up an interrupted copy, and exercising the Add Item and saved
photo display through headless Qt on macOS.
[Historical snapshot verification](/images/enginventory/2026-11-25-early-milestones/verification-summary.txt)

The tests are from `f7c033b`, with an assigned Git timestamp of November
26; the recheck date above records when I ran them for this entry. The
storage-copy test uses placeholder bytes to check file handling, while
the GUI test creates a decodable sample PNG. Native Windows image
handling remains a release check.

Next: [recording the first loan and protecting the last available unit](/posts/recording-the-first-equipment-loan/).
