---
title: "How much homelab can an old ThinkPad handle?"
description: "What my ten always-on containers use on a ThinkPad X220, and what changed when I added a Windows VM and tried to stream media."
pubDatetime: 2026-11-11T12:54:59+08:00
tags:
  - technical
  - homelab
  - proxmox
---

My homelab runs on a ThinkPad X220. Most of the time, it keeps a handful of
services online while the VMs sit powered off. I wanted to measure what
that costs, then see what happens when I ask the ThinkPad to do more.
[Homelab log](/posts/homelab-log/)

## What's running

The X220 has a Core i5-2520M with two physical cores and four threads, and
one 223.6 GiB SATA SSD. When I took inventory, **10 of 12 Linux containers
were running**, and all four VMs were stopped.

The running containers handle DNS filtering, Git hosting, media and library
tools, reverse proxying, a VPN exit node, and a password vault. Two more
serve as a development API and database for my mobile app work. The
torrent client was stopped when I took inventory.

The host's root filesystem reported about **38 GiB available**. The
LVM-thin pool that holds guest disks reported about **72 GiB available**.
That second figure is the one I’d check when adding a container disk.
[Proxmox storage management](https://github.com/proxmox/pve-docs/blob/master/pvesm.adoc)

I took the inventory from the Proxmox node shell.

```bash
pveversion
LC_ALL=C lscpu | grep -E '^(Model name|CPU\(s\)|Core\(s\) per socket|Thread\(s\) per core):'
lsblk -d -o NAME,SIZE,TYPE,ROTA,TRAN
pct list
qm list
pvesm status
df -h /
```

## Two three-minute runs

The containers-only run reflects an ordinary evening for this lab. The
heavier run was deliberate. I started a Windows lab VM configured with
3 GiB of RAM and tried playing something through Jellyfin near the end.
The video didn't even start.

I measured the Proxmox host for three minutes at five-second intervals
in each run.

```bash
date -Iseconds
free -h
vmstat -y -t 5 36
free -h
```

I used the `available` column in `free` for a rough estimate of how much
memory the host could give to new work. The `si` and `so` columns in
`vmstat` showed when pages were moving in or out of swap. I also looked
at CPU idle time (`id`) and I/O wait (`wa`) alongside the workload.
[Debian free manual](https://manpages.debian.org/trixie/procps/free.1.en.html)
· [Debian vmstat manual](https://manpages.debian.org/trixie/procps/vmstat.8.en.html)

## What the numbers say

The ThinkPad reported 7.6 GiB of usable RAM. I took both readings on the
evening of November 10, 2026.

| Metric               | Usual containers, VMs off | Windows VM and Jellyfin attempt |
| -------------------- | ------------------------- | ------------------------------- |
| Available RAM        | 4.8 GiB before and after  | 1.8 GiB before, 1.7 GiB after   |
| Swap occupied        | About 112 MiB throughout  | 4.4 MiB before, 117 MiB after   |
| CPU idle             | 95–99%                    | 22–97%                          |
| CPU time in I/O wait | 0%                        | 0–11%                           |

With the VMs off, the CPU spent almost all its time idle. There were
a few small swap reads and zero swap writes during that run. The swap
already in use barely changed.

In the heavier run, guest activity took 49–50% of total CPU time in the
first minute. Near the end, five consecutive readings showed swap
traffic, and CPU idle dipped to 22% in one of them. I'd test playback
separately to work out why the video failed to start.

## Would I add another container?

I'm comfortable keeping the usual containers online. In this sample,
they left 4.8 GiB available and barely woke the CPU. I'll keep starting
Windows when I need it, and I'd test any new service with the workloads
I expect it to run alongside. The combination I'd watch is the Windows
VM and anything that asks the media server to do more work.
